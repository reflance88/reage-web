import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      requestPayment: (method: string, options: Record<string, unknown>) => Promise<void>;
    };
  }
}

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? "";

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function CheckoutPage() {
  const { user: authUser, loading } = useAuth();
  const [, navigate] = useLocation();
  const [pendingOrder, setPendingOrder] = useState<{ orderId: string; totalAmount: number; orderName: string } | null>(null);
  const [tossLoaded, setTossLoaded] = useState(false);

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pendingOrder");
      if (raw) setPendingOrder(JSON.parse(raw));
      else navigate("/cart");
    } catch { navigate("/cart"); }
  }, []);

  useEffect(() => {
    if (typeof window.TossPayments !== "undefined") { setTossLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.onload = () => setTossLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handlePay = async () => {
    if (!pendingOrder) return;
    if (!tossLoaded) { toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
    if (!TOSS_CLIENT_KEY) { toast.error("결제 설정이 완료되지 않았습니다. 관리자에게 문의해주세요."); return; }

    try {
      const toss = window.TossPayments(TOSS_CLIENT_KEY);
      await toss.requestPayment("카드", {
        amount: pendingOrder.totalAmount,
        orderId: pendingOrder.orderId,
        orderName: pendingOrder.orderName,
        customerName: user?.name ?? "고객",
        customerEmail: user?.email ?? undefined,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === "USER_CANCEL") return;
      toast.error(err?.message ?? "결제 중 오류가 발생했습니다.");
    }
  };

  if (loading || !pendingOrder) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/index-main.html" className="text-lg font-semibold tracking-widest text-[#1a1a1a]">REAGE</a>
          <button onClick={() => navigate("/cart")} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← 장바구니</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">주문 확인</h1>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4 mb-4">
          <h2 className="font-semibold text-[#1a1a1a]">주문 정보</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">주문번호</span>
            <span className="font-mono text-xs text-gray-600">{pendingOrder.orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">상품명</span>
            <span className="text-[#1a1a1a]">{pendingOrder.orderName}</span>
          </div>
          <div className="border-t border-gray-100 pt-4 flex justify-between">
            <span className="font-medium">결제 금액</span>
            <span className="text-xl font-semibold text-[#C9A96E]">{formatPrice(pendingOrder.totalAmount)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-3 mb-6">
          <h2 className="font-semibold text-[#1a1a1a]">주문자 정보</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">이름</span>
            <span>{user?.name ?? "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">이메일</span>
            <span>{user?.email ?? "-"}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={!tossLoaded}
          className="w-full py-4 bg-[#C9A96E] text-white rounded-xl font-semibold text-base hover:bg-[#b8965e] transition-colors disabled:opacity-50 shadow-md"
        >
          {tossLoaded ? `${formatPrice(pendingOrder.totalAmount)} 결제하기` : "결제 모듈 로딩 중..."}
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">토스페이먼츠를 통해 안전하게 결제됩니다.</p>
      </main>
    </div>
  );
}
