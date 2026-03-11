import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import type { CartItem } from "./CartPage";

function formatPrice(n: number | string | null | undefined) {
  if (n == null) return "가격 문의";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "가격 문의";
  return num.toLocaleString("ko-KR") + "원";
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("reage_cart");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem("reage_cart", JSON.stringify(items));
}

type ProductFeature = { icon: string; title: string; desc: string };

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user: authUser } = useAuth();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"detail" | "howToUse" | "ingredients">("detail");

  const { data: product, isLoading, error } = trpc.product.bySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const { data: userDetail } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });

  // 등급 판별
  const memberRole = userDetail?.memberRole ?? "general";
  const proVerified = userDetail?.proVerificationStatus === "approved";
  const isPro = memberRole === "professional" && proVerified;
  const isMembership = memberRole === "membership";

  // 등급별 가격 선택
  const getDisplayPrice = () => {
    if (!product) return null;
    if (isMembership && product.priceMembership) return parseFloat(product.priceMembership as string);
    if (isPro) return parseFloat(product.pricePro as string);
    return parseFloat(product.priceConsumer as string);
  };

  const getOriginalPrice = () => {
    if (!product) return null;
    return parseFloat(product.priceConsumer as string);
  };

  const displayPrice = getDisplayPrice();
  const originalPrice = getOriginalPrice();
  const hasDiscount = displayPrice != null && originalPrice != null && displayPrice < originalPrice;

  // features 파싱
  const features: ProductFeature[] = (() => {
    if (!product?.features) return [];
    try { return JSON.parse(product.features); } catch { return []; }
  })();

  const handleAddToCart = () => {
    if (!product) return;
    const price = displayPrice ?? originalPrice ?? 0;
    const cart = loadCart();
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += qty;
      saveCart(cart);
    } else {
      cart.push({
        productId: product.id,
        quantity: qty,
        name: product.name,
        priceConsumer: parseFloat(product.priceConsumer as string),
        pricePro: parseFloat(product.pricePro as string),
        priceMembership: product.priceMembership ? parseFloat(product.priceMembership as string) : undefined,
      } as CartItem & { priceMembership?: number });
      saveCart(cart);
    }
    toast.success(`${product.name}이(가) 장바구니에 담겼습니다.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">상품을 찾을 수 없습니다.</p>
          <a href="/index-main.html" className="text-[#C9A96E] hover:underline">홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/index-main.html" className="text-lg font-bold tracking-widest text-[#1a1a1a]">
            RE<span className="text-[#C9A96E]">A</span>GE
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="/brand-intro.html" className="hover:text-[#1a1a1a] transition-colors">브랜드</a>
            <a href="/reage-therapy.html" className="hover:text-[#1a1a1a] transition-colors">레아쥬테라피</a>
            <a href="/shop.html" className="font-medium text-[#C9A96E]">제품소개</a>
            <a href="/review.html" className="hover:text-[#1a1a1a] transition-colors">후기</a>
            <a href="/gallery.html" className="hover:text-[#1a1a1a] transition-colors">갤러리</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/cart" className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              장바구니
            </a>
            {authUser ? (
              <a href="/mypage" className="px-3 py-1.5 bg-[#1A1412] text-white rounded-full text-sm hover:bg-[#2a2220] transition-colors">마이페이지</a>
            ) : (
              <a href={getLoginUrl()} className="px-3 py-1.5 bg-[#C9A96E] text-white rounded-full text-sm hover:bg-[#b8965e] transition-colors">로그인</a>
            )}
          </div>
        </div>
      </header>

      {/* 브레드크럼 */}
      <div className="max-w-6xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <a href="/index-main.html" className="hover:text-gray-600 transition-colors">홈</a>
          <span>›</span>
          <a href="/shop.html" className="hover:text-gray-600 transition-colors">제품소개</a>
          <span>›</span>
          <span className="text-[#1a1a1a] font-medium">{product.name}</span>
        </nav>
      </div>

      {/* 메인 상품 섹션 */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-12">
          {/* 상품 이미지 */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex items-center justify-center">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain p-8"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-300">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm">이미지 준비 중</span>
                </div>
              )}
            </div>
            {product.isNew && (
              <span className="absolute top-4 left-4 bg-[#C9A96E] text-white text-xs font-medium px-2.5 py-1 rounded-full">NEW</span>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="flex flex-col">
            <p className="text-xs font-medium tracking-[0.2em] text-[#C9A96E] uppercase mb-2">REAGE CREAM SERIES</p>
            <h1 className="text-3xl font-bold text-[#1A1412] mb-3">{product.name}</h1>

            {product.summaryDescription && (
              <p className="text-gray-500 text-base leading-relaxed mb-6">{product.summaryDescription}</p>
            )}

            {/* 가격 박스 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              {/* 등급 배지 */}
              {(isPro || isMembership) && (
                <div className="flex items-center gap-2 mb-3">
                  {isMembership && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#1A1412] text-[#C9A96E] px-2.5 py-1 rounded-full">
                      ✦ 멤버십 가격
                    </span>
                  )}
                  {isPro && !isMembership && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#F5EFE4] text-[#8B6914] px-2.5 py-1 rounded-full">
                      ⭐ 전문가 가격
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-400 mb-1">가격</p>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-[#1A1412]">
                  {displayPrice != null ? formatPrice(displayPrice) : "가격 문의"}
                </span>
                {hasDiscount && (
                  <span className="text-base text-gray-400 line-through">{formatPrice(originalPrice)}</span>
                )}
              </div>

              {/* 비로그인 시 안내 */}
              {!authUser && (
                <p className="text-xs text-[#C9A96E] mt-1">
                  <a href={getLoginUrl()} className="underline">로그인</a> 후 등급별 가격을 확인하세요.
                </p>
              )}
              {authUser && !isPro && !isMembership && (
                <p className="text-xs text-gray-400 mt-1">
                  <a href="/mypage" className="text-[#C9A96E] underline">사업자 인증</a> 완료 시 전문가 가격이 적용됩니다.
                </p>
              )}

              <hr className="my-4 border-gray-100" />

              {/* 수량 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-500">수량</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
                  >−</button>
                  <span className="w-10 text-center text-sm font-medium">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg"
                  >+</button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 bg-[#8B1A1A] text-white rounded-xl font-medium hover:bg-[#7a1515] transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                장바구니 담기
              </button>
            </div>

            {/* 특징 리스트 */}
            {features.length > 0 && (
              <div className="space-y-3">
                {features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1412]">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 탭 섹션 */}
        <div className="border-t border-gray-200">
          <div className="flex border-b border-gray-200">
            {[
              { key: "detail", label: "제품 상세" },
              { key: "howToUse", label: "사용법" },
              { key: "ingredients", label: "성분" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#8B1A1A] text-[#8B1A1A]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-8 max-w-3xl">
            {activeTab === "detail" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {product.description || "상품 상세 정보가 없습니다."}
              </div>
            )}
            {activeTab === "howToUse" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {product.howToUse || "사용법 정보가 없습니다."}
              </div>
            )}
            {activeTab === "ingredients" && (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                {product.ingredients || "성분 정보가 없습니다."}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-[#1A1412] text-white/60 text-xs py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-bold text-white tracking-widest mb-2">RE<span className="text-[#C9A96E]">A</span>GE</p>
          <p>올핸드 미세전류 테라피 &copy; REAGE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
