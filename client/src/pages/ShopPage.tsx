import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useSeo } from "@/lib/seo";
import { getLoginUrl } from "@/const";
import { canAccessProProducts, getPricingTier, parsePrice, resolveUnitPrice } from "@shared/commerce";

function formatPrice(value: number | string | null | undefined) {
  const amount = parsePrice(value);
  return amount === null ? "가격 문의" : `${amount.toLocaleString("ko-KR")}원`;
}

function resolveProductLink(slug: string, detailPageUrl: string | null | undefined) {
  if (detailPageUrl && detailPageUrl.startsWith("/")) {
    return detailPageUrl;
  }
  return `/product/${slug}`;
}

export default function ShopPage() {
  const { user: authUser } = useAuth();
  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });

  const tier = getPricingTier(user?.memberRole, user?.proVerificationStatus);
  const membershipDiscountRate = Number(user?.membershipDiscountRate ?? 0);

  useSeo("제품소개", "REAGE의 스킨케어 제품을 회원 등급별 가격과 함께 확인하고 바로 구매할 수 있습니다.");

  return (
    <div className="min-h-screen bg-[#f8f4ed] text-[#1f1714]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f8f4ed]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/index-main.html" className="text-lg font-semibold tracking-[0.35em] text-[#1f1714]">REAGE</a>
          <div className="flex items-center gap-2 text-sm">
            <a href="/therapy.html" className="rounded-full border border-black/10 px-4 py-2 text-[#5d5049] transition hover:border-[#c9a96e] hover:text-[#1f1714]">
              레아쥬테라피
            </a>
            <a href="/cart" className="rounded-full border border-black/10 px-4 py-2 text-[#5d5049] transition hover:border-[#c9a96e] hover:text-[#1f1714]">
              장바구니
            </a>
            {authUser ? (
              <a href="/mypage" className="rounded-full bg-[#1f1714] px-4 py-2 text-white transition hover:bg-[#372b26]">
                마이페이지
              </a>
            ) : (
              <a href={getLoginUrl()} className="rounded-full bg-[#c9a96e] px-4 py-2 text-white transition hover:bg-[#b79258]">
                로그인
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <section className="relative overflow-hidden rounded-[32px] bg-[#201613] px-6 py-10 text-white shadow-[0_30px_80px_rgba(40,24,18,0.18)] md:px-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(201,169,110,0.35),transparent_55%)]" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-xs font-medium tracking-[0.35em] text-[#e7d2ac]">SHOP REAGE</p>
            <h1 className="max-w-xl text-3xl font-semibold leading-tight md:text-5xl">
              회원 등급과 재고 상태가 실시간 반영되는 공식 스토어
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/72 md:text-base">
              노출 가능한 상품만 표시하고, 전문가 전용 제품과 멤버십 가격까지 실제 결제 금액 기준으로 안내합니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/80">
              <span className="rounded-full border border-white/15 px-4 py-2">실결제 가격 반영</span>
              <span className="rounded-full border border-white/15 px-4 py-2">10만원 이상 무료배송</span>
              <span className="rounded-full border border-white/15 px-4 py-2">품절 상품 주문 차단</span>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-3 rounded-[24px] border border-[#e6dbcd] bg-white/80 px-5 py-4 text-sm text-[#5d5049]">
          <span className="font-medium text-[#1f1714]">
            {tier === "membership" ? "멤버십 가격 적용 중" : tier === "professional" ? "전문가 가격 적용 중" : "일반 회원 가격 기준"}
          </span>
          <span className="h-1 w-1 rounded-full bg-[#c9a96e]" />
          <span>배송비 3,000원 / 100,000원 이상 무료</span>
          {!authUser && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#c9a96e]" />
              <span>
                <a href={getLoginUrl()} className="font-medium text-[#8b1a1a] underline underline-offset-2">로그인</a>
                {" "}후 등급별 가격을 확인하세요.
              </span>
            </>
          )}
        </section>

        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
          </div>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(products ?? []).map((product) => {
              const currentPrice = resolveUnitPrice(product, tier, membershipDiscountRate);
              const consumerPrice = parsePrice(product.priceConsumer);
              const isInquiryProduct = currentPrice <= 0 && !!product.detailPageUrl && !product.detailPageUrl.startsWith("/product/");
              const soldOut = product.stock <= 0;
              const restricted = product.isProOnly && !canAccessProProducts(tier);
              const discounted = !isInquiryProduct && consumerPrice !== null && currentPrice < consumerPrice;
              const productLink = resolveProductLink(product.slug, product.detailPageUrl);
              const priceLabel = isInquiryProduct ? "구매 안내" : "현재 적용가";
              const priceValue = isInquiryProduct ? "도입 상담" : formatPrice(currentPrice);
              const stockBadge = isInquiryProduct ? "도입 상담 상품" : soldOut ? "품절" : `재고 ${product.stock}개`;

              return (
                <a
                  key={product.id}
                  href={productLink}
                  className="group overflow-hidden rounded-[28px] border border-[#eadfce] bg-white shadow-[0_18px_50px_rgba(67,44,23,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(67,44,23,0.12)]"
                >
                  <div className="relative aspect-[1.05] overflow-hidden bg-[linear-gradient(160deg,#f8f2ea_0%,#f1e4d2_100%)]">
                    {(product.imageUrl || product.thumbnailUrl) ? (
                      <img
                        src={product.imageUrl || product.thumbnailUrl || ""}
                        alt={product.seoImageAlt || product.name}
                        className="h-full w-full object-contain p-8 transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#b59a6f]">
                        이미지 준비 중
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {product.isNew && <span className="rounded-full bg-[#8b1a1a] px-3 py-1 text-[11px] font-semibold text-white">NEW</span>}
                      {product.isRecommended && <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#6d5230]">추천</span>}
                      {product.isProOnly && <span className="rounded-full bg-[#1f1714] px-3 py-1 text-[11px] font-semibold text-[#f0d9ae]">전문가 전용</span>}
                      {isInquiryProduct && <span className="rounded-full bg-[#1f1714] px-3 py-1 text-[11px] font-semibold text-[#f0d9ae]">도입 상담</span>}
                    </div>
                    <div className="absolute bottom-4 right-4 rounded-full border border-black/5 bg-white/90 px-3 py-1 text-[11px] font-medium text-[#5d5049]">
                      {stockBadge}
                    </div>
                  </div>

                  <div className="space-y-4 px-5 py-5">
                    <div>
                      <p className="text-xs font-medium tracking-[0.25em] text-[#c9a96e]">REAGE PRODUCT</p>
                      <h2 className="mt-2 text-xl font-semibold text-[#1f1714]">{product.name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6f645d]">
                        {product.summaryDescription || product.shortDescription || "프리미엄 스킨케어 라인"}
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-[#faf6f0] px-4 py-4">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#8a7b70]">{priceLabel}</p>
                          <p className="mt-1 text-2xl font-semibold text-[#1f1714]">{priceValue}</p>
                        </div>
                        {discounted && (
                          <div className="text-right">
                            <p className="text-xs text-[#8a7b70]">정가</p>
                            <p className="text-sm text-[#b0a59b] line-through">{formatPrice(consumerPrice)}</p>
                          </div>
                        )}
                      </div>
                      {tier === "membership" && product.priceMembership && (
                        <p className="mt-3 text-xs text-[#8b1a1a]">멤버십 전용 가격이 적용되었습니다.</p>
                      )}
                      {isInquiryProduct && (
                        <p className="mt-3 text-xs text-[#8b1a1a]">기기 도입 상담 후 구매 가능한 상품입니다.</p>
                      )}
                      {restricted && (
                        <p className="mt-3 text-xs text-[#8b1a1a]">
                          전문가 인증 또는 멤버십 회원만 구매할 수 있습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
