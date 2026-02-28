import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export type CartItem = { productId: number; quantity: number; name: string; priceConsumer: number; pricePro: number };

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function CartPage() {
  const { user: authUser, loading } = useAuth();
  const [, navigate] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const isPro = user?.memberRole === "professional" && user?.proVerificationStatus === "approved";

  const createOrder = trpc.order.create.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("pendingOrder", JSON.stringify(data));
      navigate("/checkout");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reage_cart");
      if (raw) setCartItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const saveCart = (items: CartItem[]) => {
    setCartItems(items);
    localStorage.setItem("reage_cart", JSON.stringify(items));
  };

  const updateQty = (productId: number, delta: number) => {
    const updated = cartItems.map((item) =>
      item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    );
    saveCart(updated);
  };

  const removeItem = (productId: number) => {
    saveCart(cartItems.filter((i) => i.productId !== productId));
  };

  const getPrice = (item: CartItem) => isPro ? item.pricePro : item.priceConsumer;
  const total = cartItems.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);

  const handleCheckout = () => {
    if (!authUser) { window.location.href = getLoginUrl(); return; }
    if (cartItems.length === 0) { toast.error("장바구니가 비어있습니다."); return; }
    createOrder.mutate({ items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })) });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/index-main.html" className="text-lg font-semibold tracking-widest text-[#1a1a1a]">REAGE</a>
          <a href="/index-main.html" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← 홈으로</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">장바구니</h1>

        {isPro && (
          <div className="bg-[#F5EFE4] border border-[#C9A96E]/30 rounded-xl p-3 mb-4 text-sm text-[#8B6914]">
            전문가 할인가가 적용되고 있습니다.
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100 shadow-sm">
            <p className="text-gray-400 mb-4">장바구니가 비어있습니다.</p>
            <a href="/shop.html" className="inline-block px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm font-medium hover:bg-[#b8965e] transition-colors">쇼핑하러 가기</a>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.productId} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 bg-[#F5EFE4] rounded-lg flex-shrink-0 flex items-center justify-center text-xs text-[#C9A96E] font-medium">{item.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1a1a1a] truncate">{item.name}</p>
                  <p className="text-sm text-[#C9A96E] mt-0.5">{formatPrice(getPrice(item))}</p>
                  {isPro && item.priceConsumer !== item.pricePro && (
                    <p className="text-xs text-gray-400 line-through">{formatPrice(item.priceConsumer)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">−</button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
                </div>
                <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-400 transition-colors ml-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}

            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">총 결제 금액</span>
                <span className="text-xl font-semibold text-[#C9A96E]">{formatPrice(total)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={createOrder.isPending}
                className="w-full py-3 bg-[#C9A96E] text-white rounded-xl font-medium hover:bg-[#b8965e] transition-colors disabled:opacity-50"
              >
                {createOrder.isPending ? "주문 생성 중..." : "주문하기"}
              </button>
              {!authUser && (
                <p className="text-xs text-center text-gray-400 mt-2">주문하려면 로그인이 필요합니다.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
