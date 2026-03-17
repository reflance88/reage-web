import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { clearCart } from "@/lib/cart";

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const called = useRef(false);

  const verify = trpc.order.verify.useMutation({
    onSuccess: () => {
      localStorage.removeItem("pendingOrder");
      clearCart();
    },
    onError: (e) => {
      toast.error(e.message ?? "결제 검증에 실패했습니다.");
    },
  });

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const paymentKey = params.get("paymentKey") ?? "";
    const orderId = params.get("orderId") ?? "";
    const amount = Number(params.get("amount") ?? "0");

    if (!paymentKey || !orderId || !amount) {
      toast.error("결제 정보가 올바르지 않습니다.");
      navigate("/cart");
      return;
    }

    verify.mutate({ paymentKey, orderId, amount });
  }, []);

  if (verify.isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
        <div className="w-10 h-10 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">결제를 확인하고 있습니다...</p>
      </div>
    );
  }

  if (verify.isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-[#1a1a1a]">결제 검증 실패</h1>
        <p className="text-gray-500 text-sm">{verify.error?.message}</p>
        <a href="/mypage" className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm font-medium hover:bg-[#b8965e] transition-colors">마이페이지로</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">결제가 완료되었습니다</h1>
      <p className="text-gray-500 text-sm">주문이 정상적으로 접수되었습니다.</p>
      <div className="flex gap-3 mt-4">
        <a href="/mypage" className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm font-medium hover:bg-[#b8965e] transition-colors">주문내역 확인</a>
        <a href="/index-main.html" className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">홈으로</a>
      </div>
    </div>
  );
}
