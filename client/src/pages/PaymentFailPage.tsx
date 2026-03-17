import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

export default function PaymentFailPage() {
  const [, navigate] = useLocation();
  const called = useRef(false);

  const fail = trpc.order.fail.useMutation();

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId") ?? localStorage.getItem("pendingOrder") ?? "";
    if (orderId) {
      fail.mutate(
        { orderId },
        {
          onSettled: () => {
            localStorage.removeItem("pendingOrder");
          },
        },
      );
      return;
    }
    localStorage.removeItem("pendingOrder");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-2">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">결제가 취소되었습니다</h1>
      <p className="text-gray-500 text-sm">결제가 완료되지 않았습니다. 다시 시도해주세요.</p>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => navigate("/checkout")}
          className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm font-medium hover:bg-[#b8965e] transition-colors"
        >
          다시 결제하기
        </button>
        <a href="/index-main.html" className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
          홈으로
        </a>
      </div>
    </div>
  );
}
