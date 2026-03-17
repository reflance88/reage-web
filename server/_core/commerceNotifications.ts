import {
  sendAdminNewOrderAlimtalk,
  sendBankTransferConfirmAlimtalk,
  sendOrderCancelledAlimtalk,
  sendOrderCompleteAlimtalk,
  sendShippingStartedAlimtalk,
} from "./kakao";
import { invokeSupabaseEdgeFunction } from "./supabaseEdgeFunctions";

type OrderCompleteNotification = {
  phone?: string | null;
  name: string;
  orderId: number | string;
  orderNumber: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
  recipientName: string;
};

type OrderCancelledNotification = {
  phone?: string | null;
  name: string;
  orderId: number | string;
  orderNumber: string;
  productName: string;
};

type ShippingStartedNotification = {
  phone?: string | null;
  name: string;
  orderNumber: string;
  productName: string;
  courierName: string;
  trackingNumber: string;
};

type BankTransferConfirmNotification = {
  phone?: string | null;
  name: string;
  orderId: number | string;
  orderNumber: string;
  productName: string;
  totalAmount: number;
};

async function invokeNotification(path: string, body: unknown) {
  await invokeSupabaseEdgeFunction(path, {
    serviceRole: true,
    body,
  });
}

export async function notifyOrderComplete(params: OrderCompleteNotification) {
  try {
    await invokeNotification("commerce-notify/order-complete", params);
    return;
  } catch (error) {
    console.warn("[commerce-notify] order-complete edge function failed, falling back to local sender:", error);
  }

  if (params.phone) {
    await sendOrderCompleteAlimtalk({
      phone: params.phone,
      name: params.name,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      productName: params.productName,
      totalAmount: params.totalAmount,
      orderDate: params.orderDate,
    });
  }

  await sendAdminNewOrderAlimtalk({
    orderNumber: params.orderNumber,
    productName: params.productName,
    totalAmount: params.totalAmount,
    recipientName: params.recipientName,
  });
}

export async function notifyOrderCancelled(params: OrderCancelledNotification) {
  try {
    await invokeNotification("commerce-notify/order-cancelled", params);
    return;
  } catch (error) {
    console.warn("[commerce-notify] order-cancelled edge function failed, falling back to local sender:", error);
  }

  if (!params.phone) return;

  await sendOrderCancelledAlimtalk({
    phone: params.phone,
    name: params.name,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    productName: params.productName,
  });
}

export async function notifyShippingStarted(params: ShippingStartedNotification) {
  try {
    await invokeNotification("commerce-notify/shipping-started", params);
    return;
  } catch (error) {
    console.warn("[commerce-notify] shipping-started edge function failed, falling back to local sender:", error);
  }

  if (!params.phone) return;

  await sendShippingStartedAlimtalk({
    phone: params.phone,
    name: params.name,
    orderNumber: params.orderNumber,
    productName: params.productName,
    courierName: params.courierName,
    trackingNumber: params.trackingNumber,
  });
}

export async function notifyBankTransferConfirmed(params: BankTransferConfirmNotification) {
  try {
    await invokeNotification("commerce-notify/bank-transfer-confirm", params);
    return;
  } catch (error) {
    console.warn("[commerce-notify] bank-transfer-confirm edge function failed, falling back to local sender:", error);
  }

  if (!params.phone) return;

  await sendBankTransferConfirmAlimtalk({
    phone: params.phone,
    name: params.name,
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    productName: params.productName,
    totalAmount: params.totalAmount,
  });
}
