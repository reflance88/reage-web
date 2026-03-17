/**
 * 3PL (Third-Party Logistics) Webhook Handler
 *
 * 3PL 물류 파트너사로부터 배송 상태 업데이트를 수신하는 웹훅 엔드포인트.
 *
 * 지원 엔드포인트:
 * - POST /api/webhooks/3pl/shipping-update  (배송 상태 업데이트)
 * - POST /api/webhooks/3pl/order-collected  (주문 수집 완료)
 * - GET  /api/webhooks/3pl/health           (헬스체크)
 *
 * 지원 이벤트:
 * - order_collected:  주문 수집 완료 → 배송 준비중(ready)
 * - shipping_started: 배송 시작     → 배송 중(shipping)
 * - delivered:        배송 완료     → 배송 완료(delivered)
 * - delivery_failed:  배송 실패     → 실패(failed)
 *
 * 3PL 연동 시 아래 환경변수를 설정하세요:
 * - TPL_WEBHOOK_SECRET: 웹훅 서명 검증용 시크릿 키 (선택)
 */

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import {
  SupabaseEdgeFunctionError,
  invokeSupabaseEdgeFunction,
  shouldFallbackFromEdgeFunction,
} from "../_core/supabaseEdgeFunctions";
import { supabaseAdmin } from "../_core/supabase";

const TPL_WEBHOOK_SECRET = process.env.TPL_WEBHOOK_SECRET;
let didWarnNoSecret = false;

function verifyWebhookSignature(req: Request, res: Response): boolean {
  if (!TPL_WEBHOOK_SECRET) {
    if (!didWarnNoSecret) {
      didWarnNoSecret = true;
      console.warn("[3PL Webhook] TPL_WEBHOOK_SECRET not set — skipping signature verification");
    }
    return true;
  }
  const signature = req.headers["x-webhook-signature"] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: "Missing webhook signature" });
    return false;
  }
  const expected = crypto.createHmac("sha256", TPL_WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest("hex");
  if (signature !== expected) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return false;
  }
  return true;
}

interface ThreePLShippingEvent {
  event: "order_collected" | "shipping_started" | "delivered" | "delivery_failed";
  orderId: string;           // 우리 시스템의 주문번호
  externalOrderId?: string;  // 3PL 내부 주문번호
  trackingNumber?: string;   // 송장번호
  courierCode?: string;      // 택배사 코드 (CJ, LOTTE, HANJIN 등)
  courierName?: string;      // 택배사 이름
  timestamp?: string;        // 이벤트 발생 시각 (ISO 8601)
  provider?: string;         // 3PL 제공자 이름
  metadata?: Record<string, unknown>;
}

const SHIPPING_STATUS_MAP: Record<string, "ready" | "shipping" | "delivered" | "hold"> = {
  order_collected: "ready",
  shipping_started: "shipping",
  delivered: "delivered",
  delivery_failed: "hold",
};

async function writeThirdPartyLog(params: {
  providerName: string;
  eventType: string;
  referenceId: string;
  requestPayload: unknown;
  responsePayload?: unknown;
  status: "success" | "failed" | "pending";
  errorMessage?: string | null;
}) {
  const { error } = await supabaseAdmin.from("third_party_logs").insert({
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
    console.error("[3PL Webhook] third_party_logs insert failed:", error.message);
  }
}

async function getOrderByNumber(orderId: string) {
  const { data, error } = await supabaseAdmin
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
    throw new Error(error.message);
  }

  return data;
}

async function handleShippingUpdateLocally(payload: ThreePLShippingEvent) {
  const newShippingStatus = SHIPPING_STATUS_MAP[payload.event];
  if (!newShippingStatus) {
    throw new Error(`Unknown event type: ${payload.event}`);
  }

  const order = await getOrderByNumber(payload.orderId);
  if (!order) {
    await writeThirdPartyLog({
      providerName: payload.provider ?? "unknown",
      eventType: payload.event,
      referenceId: payload.orderId,
      requestPayload: payload,
      responsePayload: { error: `Order not found: ${payload.orderId}` },
      status: "failed",
      errorMessage: `Order not found: ${payload.orderId}`,
    });
    return {
      status: 404,
      body: { error: `Order not found: ${payload.orderId}` },
    } as const;
  }

  const updateData: Record<string, unknown> = {
    shipping_status: newShippingStatus,
  };
  if (payload.trackingNumber) updateData.tracking_number = payload.trackingNumber;
  if (payload.courierName) updateData.courier_name = payload.courierName;
  if (payload.externalOrderId) updateData.external_order_id = payload.externalOrderId;

  const { error } = await supabaseAdmin.from("orders").update(updateData).eq("id", order.id);
  if (error) {
    throw new Error(error.message);
  }

  await writeThirdPartyLog({
    providerName: payload.provider ?? "unknown",
    eventType: payload.event,
    referenceId: order.order_number,
    requestPayload: payload,
    responsePayload: { orderId: order.order_number, newStatus: newShippingStatus },
    status: "success",
  });

  console.log(`[3PL Webhook] Order ${payload.orderId} → ${newShippingStatus} (${payload.event})`);

  return {
    status: 200,
    body: {
      success: true,
      orderId: payload.orderId,
      newStatus: newShippingStatus,
    },
  } as const;
}

async function handleOrderCollectedLocally(payload: {
  orderId: string;
  externalOrderId?: string;
  provider?: string;
}) {
  return handleShippingUpdateLocally({
    event: "order_collected",
    orderId: payload.orderId,
    externalOrderId: payload.externalOrderId,
    provider: payload.provider,
  });
}

async function proxy3PLToEdge(path: string, req: Request) {
  const signature = req.headers["x-webhook-signature"] as string | undefined;

  try {
    return await invokeSupabaseEdgeFunction(path, {
      method: req.method === "GET" ? "GET" : "POST",
      body: req.method === "GET" ? undefined : req.body,
      headers: signature ? { "x-webhook-signature": signature } : undefined,
    });
  } catch (error) {
    if (shouldFallbackFromEdgeFunction(error)) {
      console.warn(`[3PL Webhook] ${path} edge function unavailable, falling back to server logic:`, error);
      return null;
    }

    if (error instanceof SupabaseEdgeFunctionError) {
      throw error;
    }

    throw new Error(error instanceof Error ? error.message : "Edge Function 호출 실패");
  }
}

export function register3PLWebhookRoutes(app: Express) {
  /**
   * 3PL 배송 상태 업데이트 웹훅
   * 3PL 파트너사가 배송 상태 변경 시 이 엔드포인트로 POST 요청을 보냅니다.
   *
   * Request body:
   * {
   *   "event": "shipping_started",
   *   "orderId": "ORD-20260302-00001",
   *   "trackingNumber": "123456789012",
   *   "courierName": "롯데택배",
   *   "provider": "MyPL"
   * }
   */
  app.post("/api/webhooks/3pl/shipping-update", async (req: Request, res: Response) => {
    try {
      const edgeResult = await proxy3PLToEdge("tpl-webhook/shipping-update", req);
      if (edgeResult) {
        return res.status(200).json(edgeResult);
      }

      if (!verifyWebhookSignature(req, res)) return;

      const payload = req.body as ThreePLShippingEvent;

      // 기본 유효성 검사
      if (!payload.event || !payload.orderId) {
        return res.status(400).json({ error: "Missing required fields: event, orderId" });
      }

      if (!SHIPPING_STATUS_MAP[payload.event]) {
        return res.status(400).json({ error: `Unknown event type: ${payload.event}` });
      }

      const result = await handleShippingUpdateLocally(payload);
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof SupabaseEdgeFunctionError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[3PL Webhook] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * 자동 주문 수집 엔드포인트
   * 3PL이 새 주문을 수집했을 때 호출됩니다.
   * POST /api/webhooks/3pl/order-collected
   *
   * Request body:
   * {
   *   "orderId": "ORD-20260302-00001",
   *   "externalOrderId": "3PL-ORDER-12345",
   *   "provider": "MyPL"
   * }
   */
  app.post("/api/webhooks/3pl/order-collected", async (req: Request, res: Response) => {
    try {
      const edgeResult = await proxy3PLToEdge("tpl-webhook/order-collected", req);
      if (edgeResult) {
        return res.status(200).json(edgeResult);
      }

      if (!verifyWebhookSignature(req, res)) return;

      const { orderId, externalOrderId, provider } = req.body as {
        orderId: string;
        externalOrderId?: string;
        provider?: string;
      };

      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId" });
      }

      const result = await handleOrderCollectedLocally({ orderId, externalOrderId, provider });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof SupabaseEdgeFunctionError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[3PL Order Collected] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * 웹훅 헬스체크
   * GET /api/webhooks/3pl/health
   */
  app.get("/api/webhooks/3pl/health", async (req: Request, res: Response) => {
    try {
      const edgeResult = await proxy3PLToEdge("tpl-webhook/health", req);
      if (edgeResult) {
        return res.status(200).json(edgeResult);
      }
    } catch (error) {
      if (error instanceof SupabaseEdgeFunctionError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.warn("[3PL Webhook] health edge function call failed, falling back to server response:", error);
    }

    return res.status(200).json({
      status: "ok",
      endpoints: [
        "POST /api/webhooks/3pl/shipping-update",
        "POST /api/webhooks/3pl/order-collected",
      ],
      events: Object.keys(SHIPPING_STATUS_MAP),
      shippingStatusFlow: {
        order_collected: "ready (배송 준비중)",
        shipping_started: "shipping (배송 중)",
        delivered: "delivered (배송 완료)",
        delivery_failed: "hold (배송 보류)",
      },
    });
  });
}
