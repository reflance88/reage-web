import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { addToCart } from "@/lib/cart";
import { useSeo } from "@/lib/seo";
import { trpc } from "@/lib/trpc";
import { canAccessProProducts, getPricingTier, parsePrice, resolveUnitPrice } from "@shared/commerce";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

type ProductFeature = {
  icon: string;
  title: string;
  desc: string;
};

function formatPrice(value: number | string | null | undefined) {
  const amount = parsePrice(value);
  return amount === null ? "가격 문의" : `${amount.toLocaleString("ko-KR")}원`;
}

function parseFeatures(raw: string | null | undefined): ProductFeature[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProductFeature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user: authUser } = useAuth();
  const [, navigate] = useLocation();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"detail" | "howToUse" | "ingredients" | "reviews">("detail");

  const { data: product, isLoading, error } = trpc.product.bySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, retry: false },
  );
  const { data: userDetail } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const reviews = trpc.review.list.useQuery(
    { productId: product?.id, page: 1, limit: 3 },
    { enabled: !!product?.id },
  );
  const recommended = trpc.product.recommended.useQuery(
    { productId: product?.id ?? "", limit: 4 },
    { enabled: !!product?.id },
  );

  const tier = getPricingTier(userDetail?.memberRole, userDetail?.proVerificationStatus);
  const membershipDiscountRate = Number(userDetail?.membershipDiscountRate ?? 0);
  const displayPrice = product ? resolveUnitPrice(product, tier, membershipDiscountRate) : null;
  const consumerPrice = parsePrice(product?.priceConsumer);
  const pricePro = parsePrice(product?.pricePro);
  const priceMembership = parsePrice(product?.priceMembership);
  const hasDiscount = displayPrice !== null && consumerPrice !== null && displayPrice < consumerPrice;
  const features = parseFeatures(product?.features);
  const soldOut = (product?.stock ?? 0) <= 0;
  const restricted = !!product?.isProOnly && !canAccessProProducts(tier);
  const purchaseBlocked = soldOut || restricted;
  const maxQty = Math.max(1, product?.stock ?? 1);

  useSeo(
    product?.seoTitle || product?.name || "제품소개",
    product?.seoDescription || product?.summaryDescription || product?.shortDescription,
  );

  useEffect(() => {
    if (!product) return;
    setQty((current) => Math.min(Math.max(1, current), Math.max(1, product.stock)));
  }, [product]);

  const handleAddToCart = () => {
    if (!product || purchaseBlocked) return;
    addToCart(product.id, qty);
    toast.success(`${product.name}이(가) 장바구니에 담겼습니다.`);
  };

  const handleBuyNow = () => {
    if (!product || purchaseBlocked) return;
    addToCart(product.id, qty);
    navigate("/checkout");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed] px-4">
        <div className="rounded-[28px] border border-[#eadfce] bg-white px-8 py-10 text-center shadow-[0_20px_60px_rgba(67,44,23,0.08)]">
          <p className="text-lg font-medium text-[#1f1714]">상품을 찾을 수 없습니다.</p>
          <p className="mt-2 text-sm text-[#6f645d]">비노출 또는 판매 종료된 상품일 수 있습니다.</p>
          <a href="/reage-device.html" className="mt-5 inline-flex rounded-full bg-[#c9a96e] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#b79258]">
            상품 목록으로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4ed] text-[#1f1714]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f8f4ed]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/index-main.html" className="text-lg font-semibold tracking-[0.35em] text-[#1f1714]">REAGE</a>
          <nav className="hidden items-center gap-6 text-sm text-[#6f645d] md:flex">
            <a href="/brand-intro.html" className="transition hover:text-[#1f1714]">브랜드</a>
            <a href="/therapy.html" className="transition hover:text-[#1f1714]">레아쥬테라피</a>
            <a href="/reage-device.html" className="font-medium text-[#8b1a1a]">제품소개</a>
            <a href="/review.html" className="transition hover:text-[#1f1714]">후기</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/cart" className="rounded-full border border-black/10 px-4 py-2 text-sm text-[#5d5049] transition hover:border-[#c9a96e] hover:text-[#1f1714]">
              장바구니
            </a>
            {authUser ? (
              <a href="/mypage" className="rounded-full bg-[#1f1714] px-4 py-2 text-sm text-white transition hover:bg-[#372b26]">
                마이페이지
              </a>
            ) : (
              <a href={getLoginUrl()} className="rounded-full bg-[#c9a96e] px-4 py-2 text-sm text-white transition hover:bg-[#b79258]">
                로그인
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-[#87796f]">
        <a href="/index-main.html" className="transition hover:text-[#1f1714]">홈</a>
        <span className="mx-2">/</span>
        <a href="/reage-device.html" className="transition hover:text-[#1f1714]">제품소개</a>
        <span className="mx-2">/</span>
        <span className="text-[#1f1714]">{product.name}</span>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-[radial-gradient(circle_at_top,#fff8ee_0%,#f1e4d2_100%)] shadow-[0_30px_80px_rgba(67,44,23,0.12)]">
            <div className="relative aspect-square">
              {(product.imageUrl || product.thumbnailUrl) ? (
                <img
                  src={product.imageUrl || product.thumbnailUrl || ""}
                  alt={product.seoImageAlt || product.name}
                  className="h-full w-full object-contain p-10"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#b59a6f]">이미지 준비 중</div>
              )}
              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                {product.isNew && <span className="rounded-full bg-[#8b1a1a] px-3 py-1 text-[11px] font-semibold text-white">NEW</span>}
                {product.isRecommended && <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#6d5230]">추천</span>}
                {product.isProOnly && <span className="rounded-full bg-[#1f1714] px-3 py-1 text-[11px] font-semibold text-[#f0d9ae]">전문가 전용</span>}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-7 shadow-[0_18px_50px_rgba(67,44,23,0.08)]">
              <p className="text-xs font-medium tracking-[0.35em] text-[#c9a96e]">REAGE PRODUCT</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#1f1714]">{product.name}</h1>
              <p className="mt-4 text-sm leading-7 text-[#6f645d]">
                {product.summaryDescription || product.shortDescription || "피부 컨디션을 정교하게 관리하기 위한 REAGE의 집중 케어 제품입니다."}
              </p>

              <div className="mt-6 rounded-[24px] bg-[#faf6f0] px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  {tier === "membership" && <span className="rounded-full bg-[#1f1714] px-3 py-1 text-[11px] font-semibold text-[#f0d9ae]">멤버십 가격</span>}
                  {tier === "professional" && <span className="rounded-full bg-[#f5efe4] px-3 py-1 text-[11px] font-semibold text-[#8b6914]">전문가 가격</span>}
                  {soldOut && <span className="rounded-full bg-[#fbe4e4] px-3 py-1 text-[11px] font-semibold text-[#8b1a1a]">품절</span>}
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#8a7b70]">현재 적용가</p>
                    <p className="mt-1 text-4xl font-semibold text-[#1f1714]">{formatPrice(displayPrice)}</p>
                  </div>
                  {hasDiscount && (
                    <div className="text-right">
                      <p className="text-xs text-[#8a7b70]">정가</p>
                      <p className="text-sm text-[#b0a59b] line-through">{formatPrice(consumerPrice)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-2 text-xs text-[#6f645d] sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    일반 회원가 {formatPrice(consumerPrice)}
                  </div>
                  <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3">
                    전문가 회원가 {formatPrice(pricePro)}
                  </div>
                  {priceMembership !== null && (
                    <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 sm:col-span-2">
                      멤버십 전용가 {formatPrice(priceMembership)}
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-[#dcc7aa] bg-white px-4 py-4 text-sm text-[#5d5049]">
                  {restricted ? (
                    <>
                      전문가 인증 또는 멤버십 회원만 구매할 수 있는 상품입니다.
                      {" "}
                      {authUser ? (
                        <a href="/mypage" className="font-medium text-[#8b1a1a] underline underline-offset-2">마이페이지에서 인증 상태 확인</a>
                      ) : (
                        <a href={getLoginUrl()} className="font-medium text-[#8b1a1a] underline underline-offset-2">로그인 후 확인</a>
                      )}
                    </>
                  ) : soldOut ? (
                    "현재 재고가 모두 소진되어 주문할 수 없습니다."
                  ) : product.stock <= 5 ? (
                    `남은 재고 ${product.stock}개입니다. 수량을 확인해 주세요.`
                  ) : (
                    `현재 재고 ${product.stock}개. 오후 2시 이전 결제 건은 당일 출고 기준으로 처리됩니다.`
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-[24px] border border-[#eadfce] px-5 py-4">
                <div>
                  <p className="text-xs text-[#8a7b70]">수량</p>
                  <p className="mt-1 text-sm text-[#5d5049]">최대 {product.stock}개 주문 가능</p>
                </div>
                <div className="flex items-center overflow-hidden rounded-full border border-[#d6c5b4]">
                  <button
                    onClick={() => setQty((current) => Math.max(1, current - 1))}
                    className="h-11 w-11 text-lg text-[#6f645d] transition hover:bg-[#f8f1e7]"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty((current) => Math.min(maxQty, current + 1))}
                    className="h-11 w-11 text-lg text-[#6f645d] transition hover:bg-[#f8f1e7]"
                    disabled={soldOut}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleAddToCart}
                  disabled={purchaseBlocked}
                  className="rounded-full border border-[#c9a96e] px-5 py-3 text-sm font-semibold text-[#8b1a1a] transition hover:bg-[#f7efe3] disabled:cursor-not-allowed disabled:border-[#e4ddd3] disabled:text-[#a7a099]"
                >
                  장바구니 담기
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={purchaseBlocked}
                  className="rounded-full bg-[#8b1a1a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#731515] disabled:cursor-not-allowed disabled:bg-[#d9c9c9]"
                >
                  구매하기
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "배송 안내", desc: "10만원 이상 무료배송 / 기본배송비 3,000원" },
                { title: "교환·반품", desc: "수령 후 7일 이내, 미개봉 제품에 한해 접수" },
                { title: "고객 지원", desc: "결제/배송 이슈는 마이페이지 주문내역에서 확인" },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-[#eadfce] bg-white px-4 py-4 shadow-[0_14px_30px_rgba(67,44,23,0.05)]">
                  <p className="text-sm font-semibold text-[#1f1714]">{item.title}</p>
                  <p className="mt-2 text-xs leading-6 text-[#6f645d]">{item.desc}</p>
                </div>
              ))}
            </div>

            {features.length > 0 && (
              <div className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(67,44,23,0.05)]">
                <h2 className="text-lg font-semibold text-[#1f1714]">핵심 포인트</h2>
                <div className="mt-4 space-y-4">
                  {features.map((feature, index) => (
                    <div key={`${feature.title}-${index}`} className="flex items-start gap-4">
                      <span className="mt-0.5 text-2xl">{feature.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[#1f1714]">{feature.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#6f645d]">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12 rounded-[32px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(67,44,23,0.05)]">
          <div className="flex flex-wrap border-b border-[#f0e7db] px-3 pt-3">
            {[
              { key: "detail", label: "제품 상세" },
              { key: "howToUse", label: "사용법" },
              { key: "ingredients", label: "성분" },
              { key: "reviews", label: `후기 (${reviews.data?.items.length ?? 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                  activeTab === tab.key ? "bg-[#1f1714] text-white" : "text-[#6f645d] hover:bg-[#faf5ee]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-6 py-8">
            {activeTab === "detail" && (
              <div className="whitespace-pre-line text-sm leading-7 text-[#514640]">
                {product.description || "상품 상세 정보가 준비 중입니다."}
              </div>
            )}
            {activeTab === "howToUse" && (
              <div className="whitespace-pre-line text-sm leading-7 text-[#514640]">
                {product.howToUse || "사용법 정보가 준비 중입니다."}
              </div>
            )}
            {activeTab === "ingredients" && (
              <div className="whitespace-pre-line text-sm leading-7 text-[#514640]">
                {product.ingredients || "성분 정보가 준비 중입니다."}
              </div>
            )}
            {activeTab === "reviews" && (
              <div className="space-y-4">
                {(reviews.data?.items ?? []).length === 0 ? (
                  <div className="rounded-[24px] bg-[#faf6f0] px-5 py-8 text-center text-sm text-[#6f645d]">
                    등록된 상품 후기가 아직 없습니다.
                  </div>
                ) : (
                  (reviews.data?.items ?? []).map((review) => (
                    <div key={review.id} className="rounded-[24px] border border-[#eadfce] px-5 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#1f1714]">{review.title || "고객 후기"}</p>
                          <p className="mt-1 text-xs text-[#8a7b70]">
                            {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        {review.imageUrl && (
                          <img src={review.imageUrl} alt={review.title || product.name} className="h-20 w-20 rounded-2xl object-cover" />
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#514640]">
                        {review.description || "후기 내용이 등록되어 있습니다."}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {(recommended.data ?? []).length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-[0.3em] text-[#c9a96e]">YOU MAY ALSO LIKE</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#1f1714]">함께 보면 좋은 제품</h2>
              </div>
              <a href="/reage-device.html" className="text-sm font-medium text-[#8b1a1a] underline underline-offset-4">
                전체 상품 보기
              </a>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(recommended.data ?? []).map((item) => (
                <a
                  key={item.id}
                  href={`/product/${item.slug}`}
                  className="overflow-hidden rounded-[26px] border border-[#eadfce] bg-white shadow-[0_16px_36px_rgba(67,44,23,0.06)] transition hover:-translate-y-1"
                >
                  <div className="aspect-[1.05] bg-[#f6ede2]">
                    {(item.imageUrl || item.thumbnailUrl) ? (
                      <img
                        src={item.imageUrl || item.thumbnailUrl || ""}
                        alt={item.seoImageAlt || item.name}
                        className="h-full w-full object-contain p-6"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#b59a6f]">이미지 준비 중</div>
                    )}
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm font-semibold text-[#1f1714]">{item.name}</p>
                    <p className="mt-2 text-sm text-[#8b1a1a]">
                      {formatPrice(resolveUnitPrice(item, tier, membershipDiscountRate))}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
