import { describe, expect, it } from "vitest";
import {
  applyRateDiscount,
  canAccessProProducts,
  getPricingTier,
  getShippingAmount,
  isStaleOrder,
  resolveUnitPrice,
} from "@shared/commerce";

describe("commerce utilities", () => {
  it("resolves membership price from explicit membership pricing first", () => {
    expect(resolveUnitPrice(
      { priceConsumer: 120000, pricePro: 98000, priceMembership: 90000 },
      "membership",
      10,
    )).toBe(90000);
  });

  it("falls back to discounted pro price for membership users", () => {
    expect(resolveUnitPrice(
      { priceConsumer: 120000, pricePro: 100000 },
      "membership",
      15,
    )).toBe(85000);
  });

  it("calculates shipping and access rules consistently", () => {
    expect(getPricingTier("professional", "approved")).toBe("professional");
    expect(getPricingTier("membership", "none")).toBe("membership");
    expect(canAccessProProducts("professional")).toBe(true);
    expect(canAccessProProducts("membership")).toBe(true);
    expect(canAccessProProducts("consumer")).toBe(false);
    expect(getShippingAmount(50000)).toBe(3000);
    expect(getShippingAmount(100000)).toBe(0);
  });

  it("truncates rate discounts and detects stale orders", () => {
    expect(applyRateDiscount(37890, 10, 100)).toBe(3700);
    expect(isStaleOrder(new Date(Date.now() - 31 * 60 * 1000), new Date(), 30)).toBe(true);
    expect(isStaleOrder(new Date(Date.now() - 10 * 60 * 1000), new Date(), 30)).toBe(false);
  });
});
