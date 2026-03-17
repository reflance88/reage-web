import { HttpError } from "./http.ts";
import { createAdminClient } from "./supabase.ts";

export type CheckoutOrder = {
  id: string;
  orderId: string;
  userId: string;
  status: "created" | "paid" | "failed" | "cancelled";
  totalAmount: number;
  finalAmount: number;
  paymentKey: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  orderName: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
};

const admin = createAdminClient();

function normalizeCheckoutOrder(data: unknown): CheckoutOrder | null {
  if (!data || typeof data !== "object") return null;

  const value = data as Record<string, unknown>;
  if (typeof value.id !== "string") return null;
  if (typeof value.orderId !== "string") return null;
  if (typeof value.userId !== "string") return null;
  if (!["created", "paid", "failed", "cancelled"].includes(String(value.status))) return null;

  return {
    id: value.id,
    orderId: value.orderId,
    userId: value.userId,
    status: value.status as CheckoutOrder["status"],
    totalAmount: Number(value.totalAmount ?? 0),
    finalAmount: Number(value.finalAmount ?? 0),
    paymentKey: typeof value.paymentKey === "string" ? value.paymentKey : null,
    paymentMethod: typeof value.paymentMethod === "string" ? value.paymentMethod : null,
    paidAt: typeof value.paidAt === "string" ? value.paidAt : null,
    orderName: typeof value.orderName === "string" ? value.orderName : null,
    recipientName: typeof value.recipientName === "string" ? value.recipientName : null,
    recipientPhone: typeof value.recipientPhone === "string" ? value.recipientPhone : null,
  };
}

export async function getCheckoutOrder(orderId: string) {
  const { data, error } = await admin.rpc("get_checkout_order", {
    p_order_number: orderId,
  });

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) return null;

  const order = normalizeCheckoutOrder(data);
  if (!order) {
    throw new HttpError(500, "주문 조회 RPC 응답 형식이 올바르지 않습니다.");
  }

  return order;
}

export async function finalizeCheckoutOrderPaid(orderId: string, paymentKey: string, paidAtIso: string, paymentMethod: string | null) {
  const { data, error } = await admin.rpc("finalize_checkout_order_paid", {
    p_order_number: orderId,
    p_payment_key: paymentKey,
    p_paid_at: paidAtIso,
    p_payment_method: paymentMethod,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || typeof data !== "object" || typeof (data as { updated?: unknown }).updated !== "boolean") {
    throw new HttpError(500, "결제 완료 RPC 응답 형식이 올바르지 않습니다.");
  }

  return data as { updated: boolean };
}

export async function cancelCheckoutOrder(params: {
  orderId: string;
  fromStatus: "created" | "paid";
  requestedBy: "admin" | "buyer";
  reason: string;
  adminNote?: string | null;
  restoreInventory?: boolean;
}) {
  const { data, error } = await admin.rpc("cancel_checkout_order", {
    p_order_number: params.orderId,
    p_from_status: params.fromStatus,
    p_requested_by: params.requestedBy,
    p_reason: params.reason,
    p_admin_note: params.adminNote ?? null,
    p_restore_inventory: params.restoreInventory ?? false,
  });

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data || typeof data !== "object" || typeof (data as { updated?: unknown }).updated !== "boolean") {
    throw new HttpError(500, "주문 취소 RPC 응답 형식이 올바르지 않습니다.");
  }

  return data as { updated: boolean };
}
