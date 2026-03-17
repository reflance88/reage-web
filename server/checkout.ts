import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import {
  canAccessProProducts,
  getPricingTier,
  getShippingAmount,
  resolveUnitPrice,
} from "@shared/commerce";
import {
  products,
  type Product,
} from "../drizzle/schema-pg";
import { supabaseAdmin } from "./_core/supabase";
import { getDb, getProductById, getUserById } from "./db";

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export type CheckoutPromotionInput = {
  couponIssueId?: string | null;
  discountCode?: string | null;
};

export type CheckoutProductSnapshot = Pick<Product, "id" | "name">;

export type ResolvedCheckoutItem = {
  product: CheckoutProductSnapshot;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type CheckoutQuote = {
  tier: "consumer" | "professional" | "membership";
  items: ResolvedCheckoutItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  finalAmount: number;
  promotionLabel: string | null;
  couponIssueId: string | null;
  discountCodeId: string | null;
};

type CheckoutBaseQuote = Pick<CheckoutQuote, "tier" | "items" | "subtotal" | "shippingAmount">;
type CheckoutPromotionQuote = Pick<CheckoutQuote, "discountAmount" | "shippingAmount" | "promotionLabel" | "couponIssueId" | "discountCodeId">;

type RpcCheckoutItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type RpcCheckoutBaseQuote = {
  tier: CheckoutQuote["tier"];
  items: RpcCheckoutItem[];
  subtotal: number;
  shippingAmount: number;
};

type RpcCheckoutPromotionQuote = {
  discountAmount: number;
  shippingAmount: number;
  promotionLabel: string | null;
  couponIssueId: string | null;
  discountCodeId: string | null;
};

function ensurePositiveQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "올바른 수량을 입력해주세요." });
  }
}

function isCouponExpired(
  issueCreatedAt: Date,
  periodType: string | null | undefined,
  validDays: number | null | undefined,
  endDate: Date | null | undefined,
  now: Date,
) {
  if (periodType === "days_from_issue" && validDays && validDays > 0) {
    const expiresAt = new Date(issueCreatedAt);
    expiresAt.setDate(expiresAt.getDate() + validDays);
    return now > expiresAt;
  }
  if (endDate) {
    return now > new Date(endDate);
  }
  return false;
}

function toCheckoutProductSnapshot(product: Product): CheckoutProductSnapshot {
  return {
    id: product.id,
    name: product.name,
  };
}

function isCheckoutTier(value: unknown): value is CheckoutQuote["tier"] {
  return value === "consumer" || value === "professional" || value === "membership";
}

function normalizeRpcCheckoutBaseQuote(data: unknown): CheckoutBaseQuote | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Partial<RpcCheckoutBaseQuote>;
  if (!isCheckoutTier(value.tier) || !Array.isArray(value.items)) return null;
  if (typeof value.subtotal !== "number" || typeof value.shippingAmount !== "number") return null;

  const items = value.items.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.productId !== "string" ||
      typeof item.productName !== "string" ||
      typeof item.quantity !== "number" ||
      typeof item.unitPrice !== "number" ||
      typeof item.subtotal !== "number"
    ) {
      return null;
    }

    return {
      product: {
        id: item.productId,
        name: item.productName,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    } satisfies ResolvedCheckoutItem;
  });

  if (items.some((item) => item === null)) return null;

  return {
    tier: value.tier,
    items: items as ResolvedCheckoutItem[],
    subtotal: value.subtotal,
    shippingAmount: value.shippingAmount,
  };
}

function normalizeRpcCheckoutPromotionQuote(data: unknown): CheckoutPromotionQuote | null {
  if (!data || typeof data !== "object") return null;
  const value = data as Partial<RpcCheckoutPromotionQuote>;

  if (typeof value.discountAmount !== "number" || typeof value.shippingAmount !== "number") {
    return null;
  }
  if (value.promotionLabel !== null && value.promotionLabel !== undefined && typeof value.promotionLabel !== "string") {
    return null;
  }
  if (value.couponIssueId !== null && value.couponIssueId !== undefined && typeof value.couponIssueId !== "string") {
    return null;
  }
  if (value.discountCodeId !== null && value.discountCodeId !== undefined && typeof value.discountCodeId !== "string") {
    return null;
  }

  return {
    discountAmount: value.discountAmount,
    shippingAmount: value.shippingAmount,
    promotionLabel: value.promotionLabel ?? null,
    couponIssueId: value.couponIssueId ?? null,
    discountCodeId: value.discountCodeId ?? null,
  };
}

function parseCheckoutRpcError(error: { message?: string; details?: string | null; hint?: string | null }) {
  const raw = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  const match = raw.match(/\b(BAD_REQUEST|FORBIDDEN|NOT_FOUND):([\s\S]+)/);
  if (!match) return null;

  const code = match[1];
  const message = match[2].trim();
  if (code === "BAD_REQUEST") {
    return new TRPCError({ code: "BAD_REQUEST", message });
  }
  if (code === "FORBIDDEN") {
    return new TRPCError({ code: "FORBIDDEN", message });
  }
  return new TRPCError({ code: "NOT_FOUND", message });
}

function shouldFallbackFromCheckoutRpc(error: unknown) {
  if (error instanceof TRPCError) return false;

  if (error && typeof error === "object") {
    const value = error as { code?: string; message?: string; details?: string | null };
    const raw = [value.message, value.details]
      .filter((item): item is string => typeof item === "string" && item.length > 0)
      .join(" ");

    if (value.code === "PGRST202") return true;
    if (/Could not find the function/i.test(raw)) return true;
    if (/fetch failed/i.test(raw)) return true;
    if (/ENOTFOUND/i.test(raw)) return true;
  }

  return error instanceof TypeError;
}

async function buildCheckoutBaseQuoteWithRpc(
  userId: string,
  items: CheckoutItemInput[],
): Promise<CheckoutBaseQuote> {
  const { data, error } = await supabaseAdmin.rpc("build_checkout_base_quote", {
    p_user_id: userId,
    p_items: items,
  });

  if (error) {
    const trpcError = parseCheckoutRpcError(error);
    if (trpcError) throw trpcError;
    throw error;
  }

  const normalized = normalizeRpcCheckoutBaseQuote(data);
  if (!normalized) {
    throw new Error("Invalid checkout base quote RPC response");
  }

  return normalized;
}

async function buildCheckoutBaseQuoteWithDb(
  userId: string,
  items: CheckoutItemInput[],
): Promise<CheckoutBaseQuote> {
  const user = await getUserById(userId);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." });
  }

  const tier = getPricingTier(user.memberRole, user.proVerificationStatus);
  const membershipDiscountRate = user.membershipDiscountRate ?? 0;

  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      ensurePositiveQuantity(item.quantity);
      const product = await getProductById(item.productId);

      if (!product || !product.isActive || !product.visible) {
        throw new TRPCError({ code: "NOT_FOUND", message: "구매할 수 없는 상품이 포함되어 있습니다." });
      }

      if (product.isProOnly && !canAccessProProducts(tier)) {
        throw new TRPCError({ code: "FORBIDDEN", message: `${product.name}은(는) 전문가 전용 상품입니다.` });
      }

      if (product.stock < item.quantity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} 재고가 부족합니다.` });
      }

      const unitPrice = resolveUnitPrice(product, tier, membershipDiscountRate);
      return {
        product: toCheckoutProductSnapshot(product),
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      } satisfies ResolvedCheckoutItem;
    }),
  );

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    tier,
    items: resolvedItems,
    subtotal,
    shippingAmount: getShippingAmount(subtotal),
  };
}

async function buildCheckoutBaseQuote(
  userId: string,
  items: CheckoutItemInput[],
): Promise<CheckoutBaseQuote> {
  try {
    return await buildCheckoutBaseQuoteWithRpc(userId, items);
  } catch (error) {
    if (!shouldFallbackFromCheckoutRpc(error)) {
      throw error;
    }

    console.warn("[Checkout] build_checkout_base_quote RPC unavailable, falling back to legacy DB logic:", error);
    return buildCheckoutBaseQuoteWithDb(userId, items);
  }
}

async function buildCheckoutPromotionQuoteWithRpc(
  userId: string,
  baseQuote: CheckoutBaseQuote,
  promotions: CheckoutPromotionInput,
): Promise<CheckoutPromotionQuote> {
  const normalizedDiscountCode = promotions.discountCode?.trim().toUpperCase() || null;
  const hasPromotions = Boolean(promotions.couponIssueId || normalizedDiscountCode);

  if (!hasPromotions) {
    return {
      discountAmount: 0,
      shippingAmount: baseQuote.shippingAmount,
      promotionLabel: null,
      couponIssueId: null,
      discountCodeId: null,
    };
  }

  const { data, error } = await supabaseAdmin.rpc("build_checkout_promotion_quote", {
    p_user_id: userId,
    p_subtotal: baseQuote.subtotal,
    p_shipping_amount: baseQuote.shippingAmount,
    p_items: baseQuote.items,
    p_coupon_issue_id: promotions.couponIssueId ?? null,
    p_discount_code: normalizedDiscountCode,
  });

  if (error) {
    const trpcError = parseCheckoutRpcError(error);
    if (trpcError) throw trpcError;
    throw error;
  }

  const normalized = normalizeRpcCheckoutPromotionQuote(data);
  if (!normalized) {
    throw new Error("Invalid checkout promotion quote RPC response");
  }

  return normalized;
}

export async function buildCheckoutQuote(
  userId: string,
  items: CheckoutItemInput[],
  promotions: CheckoutPromotionInput = {},
): Promise<CheckoutQuote> {
  if (items.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "주문 상품이 비어 있습니다." });
  }

  const baseQuote = await buildCheckoutBaseQuote(userId, items);
  const promotionQuote = await buildCheckoutPromotionQuoteWithRpc(userId, baseQuote, promotions);
  const finalAmount = Math.max(baseQuote.subtotal - promotionQuote.discountAmount + promotionQuote.shippingAmount, 0);

  return {
    tier: baseQuote.tier,
    items: baseQuote.items,
    subtotal: baseQuote.subtotal,
    discountAmount: promotionQuote.discountAmount,
    shippingAmount: promotionQuote.shippingAmount,
    finalAmount,
    promotionLabel: promotionQuote.promotionLabel,
    couponIssueId: promotionQuote.couponIssueId,
    discountCodeId: promotionQuote.discountCodeId,
  };
}

export async function getRecommendedProducts(currentProductId: string, limit = 4) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(and(
      eq(products.isActive, true),
      eq(products.visible, true),
    ))
    .orderBy(desc(products.isRecommended), desc(products.createdAt))
    .limit(limit + 1)
    .then((rows) => rows.filter((item) => item.id !== currentProductId).slice(0, limit));
}
