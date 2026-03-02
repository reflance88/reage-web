import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { CartItem } from "./CartPage";

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

interface ShippingForm {
  recipientName: string;
  recipientPhone: string;
  shippingZipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingMemo: string;
}

export default function CheckoutPage() {
  const { user: authUser, loading } = useAuth();
  const [, navigate] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tossLoaded, setTossLoaded] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>({
    recipientName: "",
    recipientPhone: "",
    shippingZipCode: "",
    shippingAddress: "",
    shippingAddressDetail: "",
    shippingMemo: "",
  });

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const isPro = user?.memberRole === "professional" && user?.proVerificationStatus === "approved";

  const createOrder = trpc.order.create.useMutation({
    onSuccess: async (data) => {
      // 주문 생성 성공 후 토스 결제 요청
      if (!tossLoaded) { toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
      if (!TOSS_CLIENT_KEY) { toast.error("결제 설정이 완료되지 않았습니다. 관리자에게 문의해주세요."); return; }
      try {
        const toss = window.TossPayments(TOSS_CLIENT_KEY);
        await toss.requestPayment("카드", {
          amount: data.totalAmount,
          orderId: data.orderId,
          orderName: data.orderName,
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
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("reage_cart");
      if (raw) {
        const items = JSON.parse(raw) as CartItem[];
        if (items.length === 0) navigate("/cart");
        else setCartItems(items);
      } else {
        navigate("/cart");
      }
    } catch { navigate("/cart"); }
  }, []);

  // 로그인한 사용자 이름 자동 채우기
  useEffect(() => {
    if (user?.name && !shipping.recipientName) {
      setShipping(prev => ({ ...prev, recipientName: user.name ?? "" }));
    }
  }, [user]);

  useEffect(() => {
    if (typeof window.TossPayments !== "undefined") { setTossLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.onload = () => setTossLoaded(true);
    document.head.appendChild(script);
  }, []);

  const getPrice = (item: CartItem) => isPro ? item.pricePro : item.priceConsumer;
  const total = cartItems.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);

  const isShippingValid =
    shipping.recipientName.trim() !== "" &&
    shipping.recipientPhone.trim() !== "" &&
    shipping.shippingZipCode.trim() !== "" &&
    shipping.shippingAddress.trim() !== "";

  const handlePay = () => {
    if (!isShippingValid) { toast.error("배송지 정보를 모두 입력해주세요."); return; }
    if (!tossLoaded) { toast.error("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요."); return; }
    createOrder.mutate({
      items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      recipientName: shipping.recipientName,
      recipientPhone: shipping.recipientPhone,
      shippingZipCode: shipping.shippingZipCode,
      shippingAddress: shipping.shippingAddress,
      shippingAddressDetail: shipping.shippingAddressDetail || undefined,
      shippingMemo: shipping.shippingMemo || undefined,
    });
  };

  const setField = (field: keyof ShippingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShipping(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (loading || cartItems.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1.5px solid #E5E7EB", fontSize: "14px", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px", display: "block",
  };
  const requiredMark = <span style={{ color: "#C9A96E", marginLeft: "2px" }}>*</span>;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/index-main.html" className="text-lg font-semibold tracking-widest text-[#1a1a1a]">REAGE</a>
          <button onClick={() => navigate("/cart")} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← 장바구니</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">주문 / 결제</h1>

        {/* 주문 상품 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-[#1a1a1a] mb-4">주문 상품</h2>
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.productId} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{item.name} × {item.quantity}</span>
                <span className="font-medium text-[#1a1a1a]">{formatPrice(getPrice(item) * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-semibold text-[#1a1a1a]">합계</span>
              <span className="text-lg font-bold text-[#C9A96E]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* 배송지 정보 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-[#1a1a1a] mb-4">배송지 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>수령인 이름{requiredMark}</label>
                <input
                  style={inputStyle}
                  placeholder="홍길동"
                  value={shipping.recipientName}
                  onChange={setField("recipientName")}
                />
              </div>
              <div>
                <label style={labelStyle}>연락처{requiredMark}</label>
                <input
                  style={inputStyle}
                  placeholder="010-0000-0000"
                  value={shipping.recipientPhone}
                  onChange={setField("recipientPhone")}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>우편번호{requiredMark}</label>
              <input
                style={{ ...inputStyle, maxWidth: "160px" }}
                placeholder="12345"
                value={shipping.shippingZipCode}
                onChange={setField("shippingZipCode")}
                maxLength={5}
              />
            </div>

            <div>
              <label style={labelStyle}>주소{requiredMark}</label>
              <input
                style={inputStyle}
                placeholder="서울특별시 강남구 테헤란로 123"
                value={shipping.shippingAddress}
                onChange={setField("shippingAddress")}
              />
            </div>

            <div>
              <label style={labelStyle}>상세주소</label>
              <input
                style={inputStyle}
                placeholder="101동 202호"
                value={shipping.shippingAddressDetail}
                onChange={setField("shippingAddressDetail")}
              />
            </div>

            <div>
              <label style={labelStyle}>배송 메모</label>
              <select
                style={inputStyle}
                value={shipping.shippingMemo}
                onChange={setField("shippingMemo")}
              >
                <option value="">배송 메모 선택 (선택사항)</option>
                <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                <option value="부재 시 문자 남겨주세요">부재 시 문자 남겨주세요</option>
              </select>
            </div>
          </div>
        </div>

        {/* 주문자 정보 */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-[#1a1a1a] mb-3">주문자 정보</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">이름</span>
              <span>{user?.name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">이메일</span>
              <span>{user?.email ?? "-"}</span>
            </div>
          </div>
        </div>

        {/* 결제 버튼 */}
        <button
          onClick={handlePay}
          disabled={!tossLoaded || createOrder.isPending || !isShippingValid}
          className="w-full py-4 bg-[#C9A96E] text-white rounded-xl font-semibold text-base hover:bg-[#b8965e] transition-colors disabled:opacity-50 shadow-md"
        >
          {createOrder.isPending ? "주문 생성 중..." : !tossLoaded ? "결제 모듈 로딩 중..." : `${formatPrice(total)} 결제하기`}
        </button>
        {!isShippingValid && (
          <p className="text-xs text-center text-[#C9A96E]">배송지 정보(수령인·연락처·주소·우편번호)를 모두 입력해야 결제할 수 있습니다.</p>
        )}
        <p className="text-xs text-center text-gray-400">토스페이먼츠를 통해 안전하게 결제됩니다.</p>
      </main>
    </div>
  );
}
