import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAdminRole, resolveRequestActor } from "../_shared/auth.ts";
import {
  cancelCheckoutOrder,
  finalizeCheckoutOrderPaid,
  getCheckoutOrder,
} from "../_shared/checkout.ts";
import {
  HttpError,
  errorResponse,
  getFunctionPath,
  jsonResponse,
  parseJsonBody,
} from "../_shared/http.ts";
import { cancelTossPayment, confirmTossPayment } from "../_shared/toss.ts";

type ConfirmPaymentBody = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

type CancelPaymentBody = {
  orderId: string;
  cancelReason?: string;
  mode?: "admin" | "buyer";
};

async function handleConfirm(req: Request) {
  const actor = await resolveRequestActor(req);
  const body = await parseJsonBody<ConfirmPaymentBody>(req);

  if (!body.paymentKey || !body.orderId || !Number.isFinite(body.amount)) {
    throw new HttpError(400, "paymentKey, orderId, amount는 필수입니다.");
  }

  const order = await getCheckoutOrder(body.orderId);
  if (!order) {
    throw new HttpError(404, "주문을 찾을 수 없습니다.");
  }
  if (order.userId !== actor.userId) {
    throw new HttpError(403, "본인의 주문만 결제할 수 있습니다.");
  }
  if (order.status === "paid") {
    return jsonResponse({ success: true, alreadyPaid: true });
  }
  if (order.status !== "created") {
    throw new HttpError(400, "결제를 진행할 수 없는 주문 상태입니다.");
  }
  if (order.finalAmount !== body.amount) {
    throw new HttpError(400, "결제 금액이 일치하지 않습니다.");
  }

  const payment = await confirmTossPayment(body.paymentKey, body.orderId, body.amount);

  try {
    const finalized = await finalizeCheckoutOrderPaid(
      body.orderId,
      body.paymentKey,
      new Date().toISOString(),
      payment.method ?? "카드",
    );

    if (!finalized.updated) {
      const latestOrder = await getCheckoutOrder(body.orderId);
      if (latestOrder?.status === "paid") {
        return jsonResponse({ success: true, alreadyPaid: true, paymentMethod: payment.method ?? "카드" });
      }
      throw new HttpError(409, "주문 상태가 이미 변경되었습니다. 결제 내역을 확인해주세요.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("[Stock]")) {
      const cancelReason = "재고 부족으로 자동 취소";
      let tossCancelFailed = false;
      let adminNote = error.message;

      try {
        await cancelTossPayment(body.paymentKey, cancelReason);
      } catch (cancelError) {
        tossCancelFailed = true;
        adminNote = `${error.message} (Toss 취소 실패 - 수동 환불 필요)`;
        console.error("[commerce-payment] stock rollback cancel failed:", cancelError);
      }

      await cancelCheckoutOrder({
        orderId: body.orderId,
        fromStatus: "created",
        requestedBy: "admin",
        reason: cancelReason,
        adminNote,
        restoreInventory: false,
      });

      throw new HttpError(
        409,
        tossCancelFailed
          ? "결제 직후 재고 부족이 확인되었으나 카드 취소 처리에 실패했습니다. 관리자가 수동으로 취소를 처리할 예정입니다."
          : "결제 직후 재고 부족이 확인되어 자동 취소되었습니다. 카드사 반영까지 시간이 걸릴 수 있습니다.",
      );
    }

    throw error;
  }

  return jsonResponse({ success: true, paymentMethod: payment.method ?? "카드" });
}

async function handleCancel(req: Request) {
  const actor = await resolveRequestActor(req);
  const body = await parseJsonBody<CancelPaymentBody>(req);
  const mode = body.mode ?? "buyer";
  const cancelReason = body.cancelReason ?? (mode === "admin" ? "관리자 취소" : "고객 취소 요청");

  if (!body.orderId) {
    throw new HttpError(400, "orderId는 필수입니다.");
  }

  if (mode === "admin") {
    await requireAdminRole(actor);
  }

  const order = await getCheckoutOrder(body.orderId);
  if (!order) {
    throw new HttpError(404, "주문을 찾을 수 없습니다.");
  }
  if (order.status === "cancelled") {
    throw new HttpError(400, "이미 취소된 주문입니다.");
  }

  if (mode === "buyer") {
    if (order.userId !== actor.userId) {
      throw new HttpError(403, "본인의 주문만 취소할 수 있습니다.");
    }
    if (order.status !== "paid") {
      throw new HttpError(400, "결제 완료된 주문만 취소할 수 있습니다.");
    }
    if (!order.paidAt) {
      throw new HttpError(400, "결제 시간 정보가 없습니다.");
    }

    const paidAt = new Date(order.paidAt);
    const diffHours = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      throw new HttpError(400, "결제 후 24시간이 지나 취소가 불가능합니다. 고객센터(1:1 문의)로 연락해주세요.");
    }
  } else if (!["created", "paid"].includes(order.status)) {
    throw new HttpError(400, "현재 주문 상태에서는 취소할 수 없습니다.");
  }

  const fromStatus = mode === "buyer" ? "paid" : order.status === "paid" ? "paid" : "created";

  if (fromStatus === "paid" && order.paymentKey) {
    await cancelTossPayment(order.paymentKey, cancelReason);
  }

  const cancelled = await cancelCheckoutOrder({
    orderId: body.orderId,
    fromStatus,
    requestedBy: mode === "admin" ? "admin" : "buyer",
    reason: cancelReason,
    adminNote: mode === "admin" ? cancelReason : null,
    restoreInventory: fromStatus === "paid",
  });

  if (!cancelled.updated) {
    throw new HttpError(409, "주문 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요.");
  }

  return jsonResponse({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const path = getFunctionPath(req, "commerce-payment");

    if (req.method === "POST" && path === "/confirm") {
      return await handleConfirm(req);
    }

    if (req.method === "POST" && path === "/cancel") {
      return await handleCancel(req);
    }

    throw new HttpError(404, "지원하지 않는 경로입니다.");
  } catch (error) {
    return errorResponse(error);
  }
});
