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
import { getDb } from "../db";
import { orders, thirdPartyLogs } from "../../drizzle/schema-pg";
import { eq } from "drizzle-orm";

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

const SHIPPING_STATUS_MAP: Record<string, "ready" | "shipping" | "delivered" | "failed"> = {
  order_collected: "ready",
  shipping_started: "shipping",
  delivered: "delivered",
  delivery_failed: "failed",
};

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
      if (!verifyWebhookSignature(req, res)) return;

      const payload = req.body as ThreePLShippingEvent;

      // 기본 유효성 검사
      if (!payload.event || !payload.orderId) {
        return res.status(400).json({ error: "Missing required fields: event, orderId" });
      }

      const newShippingStatus = SHIPPING_STATUS_MAP[payload.event];
      if (!newShippingStatus) {
        return res.status(400).json({ error: `Unknown event type: ${payload.event}` });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database not available" });

      // 주문 조회
      const [order] = await db.select().from(orders).where(eq(orders.orderId, payload.orderId)).limit(1);
      if (!order) {
        // 3PL 로그에 기록 (주문 없음)
        await db.insert(thirdPartyLogs).values({
          orderId: null,
          eventType: payload.event,
          provider: payload.provider ?? "unknown",
          payload: JSON.stringify(payload),
          result: "failed",
          errorMessage: `Order not found: ${payload.orderId}`,
        });
        return res.status(404).json({ error: `Order not found: ${payload.orderId}` });
      }

      // 배송 상태 업데이트
      const updateData: Record<string, unknown> = {
        shippingStatus: newShippingStatus,
        updatedAt: new Date(),
      };

      if (payload.trackingNumber) updateData.trackingNumber = payload.trackingNumber;
      if (payload.courierCode) updateData.courierCode = payload.courierCode;
      if (payload.courierName) updateData.courierName = payload.courierName;
      if (payload.externalOrderId) updateData.externalOrderId = payload.externalOrderId;

      if (newShippingStatus === "shipping" && !order.shippedAt) {
        updateData.shippedAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
      }
      if (newShippingStatus === "delivered" && !order.deliveredAt) {
        updateData.deliveredAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
      }

      await db.update(orders).set(updateData as any).where(eq(orders.orderId, payload.orderId));

      // 3PL 로그 기록
      await db.insert(thirdPartyLogs).values({
        orderId: order.id,
        eventType: payload.event,
        provider: payload.provider ?? "unknown",
        payload: JSON.stringify(payload),
        result: "success",
        errorMessage: null,
      });

      console.log(`[3PL Webhook] Order ${payload.orderId} → ${newShippingStatus} (${payload.event})`);

      return res.status(200).json({
        success: true,
        orderId: payload.orderId,
        newStatus: newShippingStatus,
      });
    } catch (error) {
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
      if (!verifyWebhookSignature(req, res)) return;

      const { orderId, externalOrderId, provider } = req.body as {
        orderId: string;
        externalOrderId?: string;
        provider?: string;
      };

      if (!orderId) {
        return res.status(400).json({ error: "Missing orderId" });
      }

      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database not available" });

      const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
      if (!order) return res.status(404).json({ error: `Order not found: ${orderId}` });

      await db.update(orders).set({
        shippingStatus: "ready",
        externalOrderId: externalOrderId ?? null,
        updatedAt: new Date(),
      } as any).where(eq(orders.orderId, orderId));

      await db.insert(thirdPartyLogs).values({
        orderId: order.id,
        eventType: "order_collected",
        provider: provider ?? "unknown",
        payload: JSON.stringify(req.body),
        result: "success",
        errorMessage: null,
      });

      return res.status(200).json({ success: true, orderId, status: "ready" });
    } catch (error) {
      console.error("[3PL Order Collected] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * 웹훅 헬스체크
   * GET /api/webhooks/3pl/health
   */
  app.get("/api/webhooks/3pl/health", (_req: Request, res: Response) => {
    res.status(200).json({
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
        delivery_failed: "failed (배송 실패)",
      },
    });
  });
}
