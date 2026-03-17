import { BASE_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, STALE_ORDER_MINUTES } from "./const";

export type MemberRole = "consumer" | "professional" | "membership";
export type ProVerificationStatus = "none" | "pending" | "approved" | "rejected";
export type PriceLike = number | string | null | undefined;
export type PricingTier = "consumer" | "professional" | "membership";

export type ProductPricingInput = {
  priceConsumer: PriceLike;
  pricePro: PriceLike;
  priceMembership?: PriceLike;
};

export function parsePrice(value: PriceLike): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getPricingTier(
  memberRole?: string | null,
  proVerificationStatus?: string | null,
): PricingTier {
  if (memberRole === "membership") return "membership";
  if (memberRole === "professional" && proVerificationStatus === "approved") return "professional";
  return "consumer";
}

export function canAccessProProducts(tier: PricingTier): boolean {
  return tier === "professional" || tier === "membership";
}

export function truncateDiscount(value: number, truncateUnit = 0): number {
  if (truncateUnit <= 0) return Math.floor(value);
  return Math.floor(value / truncateUnit) * truncateUnit;
}

export function applyRateDiscount(
  baseAmount: number,
  discountRate: number,
  truncateUnit = 0,
  maxDiscount?: number | null,
): number {
  if (baseAmount <= 0 || discountRate <= 0) return 0;
  const raw = (baseAmount * discountRate) / 100;
  const truncated = truncateDiscount(raw, truncateUnit);
  if (maxDiscount && maxDiscount > 0) {
    return Math.min(truncated, maxDiscount);
  }
  return truncated;
}

export function resolveUnitPrice(
  product: ProductPricingInput,
  tier: PricingTier,
  membershipDiscountRate = 0,
): number {
  const consumerPrice = parsePrice(product.priceConsumer) ?? 0;
  const proPrice = parsePrice(product.pricePro) ?? consumerPrice;
  const membershipPrice = parsePrice(product.priceMembership);

  if (tier === "membership") {
    if (membershipPrice !== null) return membershipPrice;
    if (membershipDiscountRate > 0) {
      return Math.max(proPrice - applyRateDiscount(proPrice, membershipDiscountRate), 0);
    }
    return proPrice;
  }

  if (tier === "professional") {
    return proPrice;
  }

  return consumerPrice;
}

export function getShippingAmount(subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return BASE_SHIPPING_FEE;
}

export function isStaleOrder(
  createdAt: Date | string,
  now = new Date(),
  staleMinutes = STALE_ORDER_MINUTES,
): boolean {
  const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return now.getTime() - createdAtDate.getTime() >= staleMinutes * 60 * 1000;
}
