import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildBankTransferConfirmMessage,
  buildOrderCancelledMessage,
  buildOrderCompleteMessage,
  buildShippingStartedMessage,
  orderButtons,
  sendAdminSms,
  sendAlimtalk,
} from "../_shared/aligo.ts";
import { requireServiceRoleAuthorization } from "../_shared/internal-auth.ts";
import {
  HttpError,
  errorResponse,
  getFunctionPath,
  jsonResponse,
  parseJsonBody,
} from "../_shared/http.ts";

type OrderCompleteBody = {
  phone?: string | null;
  name: string;
  orderId: string | number;
  orderNumber: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
  recipientName: string;
};

type OrderCancelledBody = {
  phone?: string | null;
  name: string;
  orderId: string | number;
  orderNumber: string;
  productName: string;
};

type ShippingStartedBody = {
  phone?: string | null;
  name: string;
  orderNumber: string;
  productName: string;
  courierName: string;
  trackingNumber: string;
};

type BankTransferConfirmBody = {
  phone?: string | null;
  name: string;
  orderId: string | number;
  orderNumber: string;
  productName: string;
  totalAmount: number;
};

async function handleOrderComplete(req: Request) {
  const body = await parseJsonBody<OrderCompleteBody>(req);

  if (body.phone) {
    await sendAlimtalk({
      templateCode: "ORDER_COMPLETE",
      receiverPhone: body.phone,
      receiverName: body.name,
      message: buildOrderCompleteMessage(body),
      buttons: orderButtons("주문 확인"),
    });
  }

  await sendAdminSms(
    `[REAGE] 신규 주문 알림\n` +
      `주문번호: ${body.orderNumber}\n` +
      `상품명: ${body.productName}\n` +
      `결제금액: ${body.totalAmount.toLocaleString()}원\n` +
      `수령인: ${body.recipientName}\n` +
      `관리자 페이지에서 확인해 주세요.`,
  );

  return jsonResponse({ success: true });
}

async function handleOrderCancelled(req: Request) {
  const body = await parseJsonBody<OrderCancelledBody>(req);
  if (!body.phone) return jsonResponse({ success: true, skipped: true });

  await sendAlimtalk({
    templateCode: "ORDER_CANCELLED",
    receiverPhone: body.phone,
    receiverName: body.name,
    message: buildOrderCancelledMessage(body),
    buttons: orderButtons("자세히 보기"),
  });

  return jsonResponse({ success: true });
}

async function handleShippingStarted(req: Request) {
  const body = await parseJsonBody<ShippingStartedBody>(req);
  if (!body.phone) return jsonResponse({ success: true, skipped: true });

  await sendAlimtalk({
    templateCode: "SHIPPING_STARTED",
    receiverPhone: body.phone,
    receiverName: body.name,
    message: buildShippingStartedMessage(body),
  });

  return jsonResponse({ success: true });
}

async function handleBankTransferConfirm(req: Request) {
  const body = await parseJsonBody<BankTransferConfirmBody>(req);
  if (!body.phone) return jsonResponse({ success: true, skipped: true });

  await sendAlimtalk({
    templateCode: "BANK_TRANSFER_CONFIRM",
    receiverPhone: body.phone,
    receiverName: body.name,
    message: buildBankTransferConfirmMessage(body),
    buttons: orderButtons("주문 확인"),
  });

  return jsonResponse({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    requireServiceRoleAuthorization(req);

    const path = getFunctionPath(req, "commerce-notify");
    if (req.method !== "POST") {
      throw new HttpError(405, "허용되지 않는 메서드입니다.");
    }

    if (path === "/order-complete") {
      return await handleOrderComplete(req);
    }

    if (path === "/order-cancelled") {
      return await handleOrderCancelled(req);
    }

    if (path === "/shipping-started") {
      return await handleShippingStarted(req);
    }

    if (path === "/bank-transfer-confirm") {
      return await handleBankTransferConfirm(req);
    }

    throw new HttpError(404, "지원하지 않는 경로입니다.");
  } catch (error) {
    return errorResponse(error);
  }
});
