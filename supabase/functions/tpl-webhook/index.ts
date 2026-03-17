import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  HttpError,
  errorResponse,
  getFunctionPath,
  jsonResponse,
} from "../_shared/http.ts";

type ThreePLShippingEvent = {
  event: "order_collected" | "shipping_started" | "delivered" | "delivery_failed";
  orderId: string;
  externalOrderId?: string;
  trackingNumber?: string;
  courierName?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
};

const SHIPPING_STATUS_MAP: Record<ThreePLShippingEvent["event"], "ready" | "shipping" | "delivered" | "hold"> = {
  order_collected: "ready",
  shipping_started: "shipping",
  delivered: "delivered",
  delivery_failed: "hold",
};

const admin = createAdminClient();

async function computeSignature(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(req: Request, rawBody: string) {
  const secret = Deno.env.get("TPL_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("[tpl-webhook] TPL_WEBHOOK_SECRET not set — skipping signature verification");
    return;
  }

  const signature = req.headers.get("x-webhook-signature");
  if (!signature) {
    throw new HttpError(401, "Missing webhook signature");
  }

  const expected = await computeSignature(secret, rawBody);
  if (signature !== expected) {
    throw new HttpError(401, "Invalid webhook signature");
  }
}

async function logThirdPartyEvent(params: {
  providerName: string;
  eventType: string;
  referenceId: string;
  requestPayload: unknown;
  responsePayload?: unknown;
  status: "success" | "failed" | "pending";
  errorMessage?: string | null;
}) {
  const { error } = await admin.from("third_party_logs").insert({
    provider_name: params.providerName,
    integration_type: "logistics",
    event_type: params.eventType,
    reference_id: params.referenceId,
    request_payload: params.requestPayload,
    response_payload: params.responsePayload ?? null,
    status: params.status,
    error_message: params.errorMessage ?? null,
  });

  if (error) {
    console.error("[tpl-webhook] failed to write third_party_logs:", error.message);
  }
}

async function getOrderByNumber(orderId: string) {
  const { data, error } = await admin
    .from("orders")
    .select("id, order_number, shipping_status, tracking_number, courier_name, external_order_id")
    .eq("order_number", orderId)
    .maybeSingle<{
      id: string;
      order_number: string;
      shipping_status: string | null;
      tracking_number: string | null;
      courier_name: string | null;
      external_order_id: string | null;
    }>();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return data;
}

async function updateShipping(orderId: string, payload: ThreePLShippingEvent) {
  const newShippingStatus = SHIPPING_STATUS_MAP[payload.event];
  const order = await getOrderByNumber(orderId);

  if (!order) {
    await logThirdPartyEvent({
      providerName: payload.provider ?? "unknown",
      eventType: payload.event,
      referenceId: orderId,
      requestPayload: payload,
      responsePayload: { error: `Order not found: ${orderId}` },
      status: "failed",
      errorMessage: `Order not found: ${orderId}`,
    });
    throw new HttpError(404, `Order not found: ${orderId}`);
  }

  const updateData: Record<string, unknown> = {
    shipping_status: newShippingStatus,
  };

  if (payload.trackingNumber) updateData.tracking_number = payload.trackingNumber;
  if (payload.courierName) updateData.courier_name = payload.courierName;
  if (payload.externalOrderId) updateData.external_order_id = payload.externalOrderId;

  const { error } = await admin.from("orders").update(updateData).eq("id", order.id);
  if (error) {
    throw new HttpError(500, error.message);
  }

  await logThirdPartyEvent({
    providerName: payload.provider ?? "unknown",
    eventType: payload.event,
    referenceId: order.order_number,
    requestPayload: payload,
    responsePayload: { orderId: order.order_number, newStatus: newShippingStatus },
    status: "success",
  });

  return {
    success: true,
    orderId: order.order_number,
    newStatus: newShippingStatus,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const path = getFunctionPath(req, "tpl-webhook");

    if (req.method === "GET" && path === "/health") {
      return jsonResponse({
        status: "ok",
        endpoints: [
          "POST /shipping-update",
          "POST /order-collected",
        ],
        events: Object.keys(SHIPPING_STATUS_MAP),
        shippingStatusFlow: SHIPPING_STATUS_MAP,
      });
    }

    if (req.method !== "POST") {
      throw new HttpError(405, "허용되지 않는 메서드입니다.");
    }

    const rawBody = await req.text();
    await verifySignature(req, rawBody);

    let payload: ThreePLShippingEvent;
    try {
      payload = JSON.parse(rawBody) as ThreePLShippingEvent;
    } catch {
      throw new HttpError(400, "JSON 요청 본문이 올바르지 않습니다.");
    }

    if (path === "/order-collected") {
      if (!payload.orderId) {
        throw new HttpError(400, "Missing orderId");
      }

      return jsonResponse(
        await updateShipping(payload.orderId, {
          ...payload,
          event: "order_collected",
        }),
      );
    }

    if (path === "/shipping-update") {
      if (!payload.event || !payload.orderId) {
        throw new HttpError(400, "Missing required fields: event, orderId");
      }
      if (!(payload.event in SHIPPING_STATUS_MAP)) {
        throw new HttpError(400, `Unknown event type: ${payload.event}`);
      }

      return jsonResponse(await updateShipping(payload.orderId, payload));
    }

    throw new HttpError(404, "지원하지 않는 경로입니다.");
  } catch (error) {
    return errorResponse(error);
  }
});
