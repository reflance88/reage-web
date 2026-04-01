import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { loadCart, saveCart, type CartItem } from "@/lib/cart";
import { trpc } from "@/lib/trpc";
import { canAccessProProducts, getPricingTier, getShippingAmount, parsePrice, resolveUnitPrice } from "@shared/commerce";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function formatPrice(value: number | string | null | undefined) {
  const amount = parsePrice(value);
  return amount === null ? "가격 문의" : `${amount.toLocaleString("ko-KR")}원`;
}

export default function CartPage() {
  const { user: authUser, loading } = useAuth();
  const [, navigate] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const { data: products, isLoading: productsLoading } = trpc.product.list.useQuery();

  const tier = getPricingTier(user?.memberRole, user?.proVerificationStatus);
  const membershipDiscountRate = Number(user?.membershipDiscountRate ?? 0);

  useEffect(() => {
    setCartItems(loadCart());
  }, []);

  useEffect(() => {
    if (!products) return;
    const validProductIds = new Set(products.map((product) => product.id));
    const filtered = cartItems.filter((item) => validProductIds.has(item.productId));
    if (filtered.length !== cartItems.length) {
      setCartItems(filtered);
      saveCart(filtered);
      toast.error("판매가 종료되었거나 비노출 처리된 상품이 장바구니에서 제거되었습니다.");
    }
  }, [cartItems, products]);

  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    saveCart(items);
  };

  const resolvedItems = cartItems
    .map((item) => {
      const product = products?.find((entry) => entry.id === item.productId);
      if (!product) return null;

      const restricted = product.isProOnly && !canAccessProProducts(tier);
      const soldOut = product.stock <= 0;
      const quantity = Math.min(item.quantity, Math.max(product.stock, 1));
      const unitPrice = resolveUnitPrice(product, tier, membershipDiscountRate);

      return {
        cartItem: item,
        product,
        quantity,
        restricted,
        soldOut,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const subtotal = resolvedItems
    .filter((item) => !item.restricted && !item.soldOut)
    .reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingAmount = getShippingAmount(subtotal);
  const finalAmount = subtotal + shippingAmount;
  const hasBlockedItems = resolvedItems.some((item) => item.restricted || item.soldOut);

  const updateQty = (productId: string, delta: number) => {
    const product = products?.find((entry) => entry.id === productId);
    const nextItems = cartItems.map((item) => {
      if (item.productId !== productId) return item;
      const maxQuantity = Math.max(product?.stock ?? 1, 1);
      return {
        ...item,
        quantity: Math.max(1, Math.min(maxQuantity, item.quantity + delta)),
      };
    });
    updateCart(nextItems);
  };

  const removeItem = (productId: string) => {
    updateCart(cartItems.filter((item) => item.productId !== productId));
  };

  const handleCheckout = () => {
    if (!authUser) {
      window.location.href = getLoginUrl();
      return;
    }
    if (cartItems.length === 0) {
      toast.error("장바구니가 비어있습니다.");
      return;
    }
    if (hasBlockedItems) {
      toast.error("구매 불가 상품을 정리한 뒤 다시 시도해주세요.");
      return;
    }
    navigate("/checkout");
  };

  if (loading || productsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4ed] text-[#1f1714]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/" className="text-lg font-semibold tracking-[0.35em] text-[#1f1714]">REAGE</a>
          <a href="/" className="rounded-full border border-black/10 px-4 py-2 text-sm text-[#5d5049] transition hover:border-[#c9a96e] hover:text-[#1f1714]">
            홈으로
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] text-[#c9a96e]">CART</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1f1714]">장바구니</h1>
          </div>
          <div className="rounded-full border border-[#eadfce] bg-white px-4 py-2 text-sm text-[#5d5049]">
            {tier === "membership" ? "멤버십 가격 반영" : tier === "professional" ? "전문가 가격 반영" : "일반 가격 반영"}
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-[28px] border border-[#eadfce] bg-white px-8 py-14 text-center shadow-[0_20px_60px_rgba(67,44,23,0.08)]">
            <p className="text-base text-[#6f645d]">장바구니가 비어 있습니다.</p>
            <a href="/reage-device.html" className="mt-5 inline-flex rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258]">
              제품 보러 가기
            </a>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              {hasBlockedItems && (
                <div className="rounded-[24px] border border-[#f3d1d1] bg-[#fff3f3] px-5 py-4 text-sm text-[#8b1a1a]">
                  전문가 전용 상품 또는 품절 상품이 포함되어 있습니다. 해당 상품을 제거해야 결제를 진행할 수 있습니다.
                </div>
              )}

              {resolvedItems.map((item) => {
                const consumerPrice = parsePrice(item.product.priceConsumer);
                const discounted = consumerPrice !== null && item.unitPrice < consumerPrice;

                return (
                  <div
                    key={item.product.id}
                    className="rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(67,44,23,0.06)]"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-[20px] bg-[#f6ede2]">
                        {(item.product.imageUrl || item.product.thumbnailUrl) ? (
                          <img
                            src={item.product.imageUrl || item.product.thumbnailUrl || ""}
                            alt={item.product.seoImageAlt || item.product.name}
                            className="h-full w-full object-contain p-3"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[#b59a6f]">이미지 준비 중</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-[#1f1714]">{item.product.name}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6f645d]">
                              {item.product.summaryDescription || item.product.shortDescription || "REAGE 공식 스토어 상품"}
                            </p>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-[#6f645d] transition hover:border-[#8b1a1a] hover:text-[#8b1a1a]"
                          >
                            삭제
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                          {item.product.isProOnly && <span className="rounded-full bg-[#1f1714] px-3 py-1 text-[#f0d9ae]">전문가 전용</span>}
                          {item.soldOut && <span className="rounded-full bg-[#fbe4e4] px-3 py-1 text-[#8b1a1a]">품절</span>}
                          {item.restricted && <span className="rounded-full bg-[#fff3f3] px-3 py-1 text-[#8b1a1a]">구매 권한 필요</span>}
                          {!item.soldOut && !item.restricted && <span className="rounded-full bg-[#f5efe4] px-3 py-1 text-[#8b6914]">재고 {item.product.stock}개</span>}
                        </div>

                        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-[#8b1a1a]">{formatPrice(item.unitPrice)}</p>
                            {discounted && (
                              <p className="mt-1 text-xs text-[#b0a59b] line-through">{formatPrice(consumerPrice)}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center overflow-hidden rounded-full border border-[#d6c5b4]">
                              <button
                                onClick={() => updateQty(item.product.id, -1)}
                                className="h-10 w-10 text-lg text-[#6f645d] transition hover:bg-[#f8f1e7]"
                              >
                                −
                              </button>
                              <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateQty(item.product.id, 1)}
                                className="h-10 w-10 text-lg text-[#6f645d] transition hover:bg-[#f8f1e7]"
                                disabled={item.soldOut}
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[#8a7b70]">상품 합계</p>
                              <p className="text-lg font-semibold text-[#1f1714]">{formatPrice(item.lineTotal)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <aside className="h-fit rounded-[28px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_20px_60px_rgba(67,44,23,0.08)]">
              <h2 className="text-lg font-semibold text-[#1f1714]">주문 요약</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-[#6f645d]">
                  <span>상품 금액</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6f645d]">
                  <span>배송비</span>
                  <span>{shippingAmount === 0 ? "무료" : formatPrice(shippingAmount)}</span>
                </div>
                <div className="rounded-2xl bg-[#faf6f0] px-4 py-4">
                  <div className="flex justify-between text-[#1f1714]">
                    <span className="font-medium">예상 결제금액</span>
                    <span className="text-xl font-semibold text-[#8b1a1a]">{formatPrice(finalAmount)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#8a7b70]">
                    쿠폰과 할인코드는 다음 단계에서 적용됩니다. 결제 직전 서버에서 재고와 할인 조건을 다시 확인합니다.
                  </p>
                </div>
                <p className="text-xs leading-5 text-[#8a7b70]">
                  100,000원 이상 무료배송. 장바구니 가격은 현재 회원 등급 기준으로 계산됩니다.
                </p>
              </div>

              <button
                onClick={handleCheckout}
                className="mt-5 w-full rounded-full bg-[#8b1a1a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#731515]"
              >
                주문하기
              </button>
              {!authUser && (
                <p className="mt-3 text-center text-xs text-[#8a7b70]">주문하려면 로그인이 필요합니다.</p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
