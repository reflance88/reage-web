import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  applyRateDiscount,
  canAccessProProducts,
  getPricingTier,
  getShippingAmount,
  parsePrice,
  resolveUnitPrice,
} from "@shared/commerce";
import {
  couponIssues,
  coupons,
  discountCodes,
  orders,
  products,
  type Product,
} from "../drizzle/schema-pg";
import { getDb, getProductById, getUserById } from "./db";

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export type CheckoutPromotionInput = {
  couponIssueId?: number | null;
  discountCode?: string | null;
};

export type ResolvedCheckoutItem = {
  product: Product;
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
  couponIssueId: number | null;
  discountCodeId: number | null;
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

export async function buildCheckoutQuote(
  userId: string,
  items: CheckoutItemInput[],
  promotions: CheckoutPromotionInput = {},
): Promise<CheckoutQuote> {
  if (items.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "주문 상품이 비어 있습니다." });
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB 연결이 필요합니다." });
  }

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
        product,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    }),
  );

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
  let shippingAmount = getShippingAmount(subtotal);
  let discountAmount = 0;
  let promotionLabel: string[] = [];
  let appliedCouponIssueId: number | null = null;
  let appliedDiscountCodeId: number | null = null;
  const now = new Date();

  const discountCodeInput = promotions.discountCode?.trim().toUpperCase();
  if (discountCodeInput) {
    const [discountCode] = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, discountCodeInput))
      .limit(1);

    if (!discountCode) {
      throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 할인코드입니다." });
    }

    if (discountCode.startDate && now < new Date(discountCode.startDate)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "아직 사용할 수 없는 할인코드입니다." });
    }

    if (discountCode.endDate && now > new Date(discountCode.endDate)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 할인코드입니다." });
    }

    if (discountCode.minOrderAmountType === "limited" && subtotal < (discountCode.minOrderAmount ?? 0)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "최소 주문 금액을 충족하지 못했습니다." });
    }

    if (discountCode.maxUsageType === "limited" && discountCode.maxUsageCount && discountCode.usedCount >= discountCode.maxUsageCount) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "사용 한도가 소진된 할인코드입니다." });
    }

    if (discountCode.targetType === "member_only" && !userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "회원만 사용할 수 있는 할인코드입니다." });
    }

    if (discountCode.samePersonLimitType === "limited" && discountCode.samePersonLimitCount) {
      const usedByUser = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(
          eq(orders.userId, userId),
          eq(orders.discountCodeId, discountCode.id),
          inArray(orders.status, ["paid"]),
        ));
      if (usedByUser.length >= discountCode.samePersonLimitCount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "이미 사용 횟수를 초과한 할인코드입니다." });
      }
    }

    const codeDiscount = resolvedItems.reduce((sum, item) => {
      const lineCap = discountCode.maxDiscountPerProduct
        ? discountCode.maxDiscountPerProduct * item.quantity
        : null;
      return sum + applyRateDiscount(
        item.subtotal,
        discountCode.discountRate ?? 0,
        discountCode.truncateUnit ?? 0,
        lineCap,
      );
    }, 0);

    discountAmount += codeDiscount;
    appliedDiscountCodeId = discountCode.id;
    promotionLabel.push(discountCode.name);
  }

  if (promotions.couponIssueId) {
    const [couponIssue] = await db
      .select({
        id: couponIssues.id,
        userId: couponIssues.userId,
        isUsed: couponIssues.isUsed,
        isDeleted: couponIssues.isDeleted,
        createdAt: couponIssues.createdAt,
        couponId: couponIssues.couponId,
        couponName: coupons.name,
        benefitType: coupons.benefitType,
        benefitValue: coupons.benefitValue,
        status: coupons.status,
        startDate: coupons.startDate,
        endDate: coupons.endDate,
        periodType: coupons.periodType,
        validDays: coupons.validDays,
        minAmountType: coupons.minAmountType,
        minAmount: coupons.minAmount,
        calcBasis: coupons.calcBasis,
      })
      .from(couponIssues)
      .innerJoin(coupons, eq(couponIssues.couponId, coupons.id))
      .where(and(
        eq(couponIssues.id, promotions.couponIssueId),
        eq(couponIssues.userId, userId),
      ))
      .limit(1);

    if (!couponIssue || couponIssue.isDeleted || couponIssue.isUsed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "사용할 수 없는 쿠폰입니다." });
    }

    if (couponIssue.status !== "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "비활성화된 쿠폰입니다." });
    }

    if (couponIssue.startDate && now < new Date(couponIssue.startDate)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "아직 사용할 수 없는 쿠폰입니다." });
    }

    if (isCouponExpired(couponIssue.createdAt, couponIssue.periodType, couponIssue.validDays, couponIssue.endDate, now)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 쿠폰입니다." });
    }

    const couponBaseAmount = couponIssue.calcBasis === "after_discount"
      ? Math.max(subtotal - discountAmount, 0)
      : subtotal;

    const minAmount = couponIssue.minAmount ?? 0;
    if (couponIssue.minAmountType !== "none" && couponBaseAmount < minAmount) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "쿠폰 최소 주문 금액을 충족하지 못했습니다." });
    }

    if (couponIssue.benefitType === "discount_amount") {
      discountAmount += Math.min(couponBaseAmount, couponIssue.benefitValue ?? 0);
    } else if (couponIssue.benefitType === "discount_rate") {
      discountAmount += applyRateDiscount(couponBaseAmount, couponIssue.benefitValue ?? 0);
    } else if (
      couponIssue.benefitType === "free_basic_shipping" ||
      couponIssue.benefitType === "free_all_shipping"
    ) {
      shippingAmount = 0;
    }

    appliedCouponIssueId = couponIssue.id;
    promotionLabel.push(couponIssue.couponName);
  }

  const finalAmount = Math.max(subtotal - discountAmount + shippingAmount, 0);

  return {
    tier,
    items: resolvedItems,
    subtotal,
    discountAmount,
    shippingAmount,
    finalAmount,
    promotionLabel: promotionLabel.length > 0 ? promotionLabel.join(" + ") : null,
    couponIssueId: appliedCouponIssueId,
    discountCodeId: appliedDiscountCodeId,
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
