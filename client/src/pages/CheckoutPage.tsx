import { useAuth } from "@/_core/hooks/useAuth";
import type { DaumPostcodeResult } from "@/lib/daum-postcode";
import { getLoginUrl } from "@/const";
import { loadCart, type CartItem } from "@/lib/cart";
import { trpc } from "@/lib/trpc";
import { parsePrice } from "@shared/commerce";
import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      requestPayment: (method: string, options: Record<string, unknown>) => Promise<void>;
    };
  }
}

type ShippingForm = {
  recipientName: string;
  recipientPhone: string;
  shippingZipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingMemo: string;
};

type SavedAddress = {
  id: number;
  label: string;
  recipientName: string;
  recipientPhone: string;
  shippingZipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string | null;
  isDefault: boolean;
};

type CouponRow = {
  issue: {
    id: string;
    isUsed: boolean;
    createdAt: string | Date;
  };
  coupon: {
    id: string;
    name: string;
    benefitType: string;
    benefitValue: number;
    status: string;
  };
};

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY ?? "";

function formatPrice(value: number | string | null | undefined) {
  const amount = parsePrice(value);
  return amount === null ? "0원" : `${amount.toLocaleString("ko-KR")}원`;
}

function describeCoupon(coupon: CouponRow["coupon"]) {
  if (coupon.benefitType === "discount_amount") return `${coupon.benefitValue.toLocaleString("ko-KR")}원 할인`;
  if (coupon.benefitType === "discount_rate") return `${coupon.benefitValue}% 할인`;
  if (coupon.benefitType === "free_basic_shipping" || coupon.benefitType === "free_all_shipping") return "배송비 무료";
  return "혜택 적용";
}

const emptyShipping: ShippingForm = {
  recipientName: "",
  recipientPhone: "",
  shippingZipCode: "",
  shippingAddress: "",
  shippingAddressDetail: "",
  shippingMemo: "",
};

export default function CheckoutPage() {
  const { user: authUser, loading } = useAuth();
  const [, navigate] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [tossLoaded, setTossLoaded] = useState(false);
  const [daumLoaded, setDaumLoaded] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedCouponIssueId, setSelectedCouponIssueId] = useState<string | undefined>(undefined);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | undefined>(undefined);
  const [saveCurrentAddress, setSaveCurrentAddress] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState("기본 배송지");
  const [submitting, setSubmitting] = useState(false);

  const { data: user } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const addresses = trpc.user.addresses.useQuery(undefined, { enabled: !!authUser });
  const coupons = trpc.promotion.myCoupons.useQuery(undefined, { enabled: !!authUser });
  const quote = trpc.order.quote.useQuery(
    {
      items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      couponIssueId: selectedCouponIssueId,
      discountCode: appliedDiscountCode,
    },
    {
      enabled: !!authUser && cartItems.length > 0,
      retry: false,
    },
  );

  const saveAddressMutation = trpc.user.saveAddress.useMutation();
  const createOrderMutation = trpc.order.create.useMutation();
  const failOrderMutation = trpc.order.fail.useMutation();

  useEffect(() => {
    const stored = loadCart();
    if (stored.length === 0) {
      navigate("/cart");
      return;
    }
    setCartItems(stored);
  }, [navigate]);

  useEffect(() => {
    if (user?.name && !shipping.recipientName) {
      setShipping((current) => ({ ...current, recipientName: user.name ?? "" }));
    }
  }, [shipping.recipientName, user?.name]);

  useEffect(() => {
    const rows = (addresses.data ?? []) as SavedAddress[];
    if (rows.length === 0 || selectedAddressId !== null || shipping.shippingAddress) return;
    const target = rows.find((row) => row.isDefault) ?? rows[0];
    if (!target) return;
    setSelectedAddressId(target.id);
    setShipping({
      recipientName: target.recipientName,
      recipientPhone: target.recipientPhone,
      shippingZipCode: target.shippingZipCode,
      shippingAddress: target.shippingAddress,
      shippingAddressDetail: target.shippingAddressDetail ?? "",
      shippingMemo: "",
    });
  }, [addresses.data, selectedAddressId, shipping.shippingAddress]);

  useEffect(() => {
    if (typeof window.TossPayments !== "undefined") {
      setTossLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.onload = () => setTossLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (typeof window.daum !== "undefined" && window.daum.Postcode) {
      setDaumLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setDaumLoaded(true);
    document.head.appendChild(script);
  }, []);

  const setField = (field: keyof ShippingForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShipping((current) => ({ ...current, [field]: event.target.value }));
  };

  const selectAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setShipping({
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      shippingZipCode: address.shippingZipCode,
      shippingAddress: address.shippingAddress,
      shippingAddressDetail: address.shippingAddressDetail ?? "",
      shippingMemo: "",
    });
  };

  const openAddressSearch = () => {
    if (!daumLoaded || typeof window.daum === "undefined") {
      toast.error("주소 검색 모듈을 불러오는 중입니다.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeResult) => {
        const address = data.roadAddress || data.jibunAddress;
        setShipping((current) => ({
          ...current,
          shippingZipCode: data.zonecode,
          shippingAddress: address,
          shippingAddressDetail: "",
        }));
      },
    }).open();
  };

  const usableCoupons = ((coupons.data ?? []) as CouponRow[]).filter(
    (row) => !row.issue.isUsed && row.coupon.status === "active",
  );

  const isShippingValid =
    shipping.recipientName.trim() &&
    shipping.recipientPhone.trim() &&
    shipping.shippingZipCode.trim() &&
    shipping.shippingAddress.trim();

  const applyDiscountCode = () => {
    const normalized = discountCodeInput.trim().toUpperCase();
    if (!normalized) {
      toast.error("할인코드를 입력해주세요.");
      return;
    }
    setAppliedDiscountCode(normalized);
  };

  const handlePay = async () => {
    if (!authUser) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!isShippingValid) {
      toast.error("배송지 정보를 모두 입력해주세요.");
      return;
    }
    if (!quote.data) {
      toast.error(quote.error?.message ?? "주문 금액을 계산하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!tossLoaded) {
      toast.error("결제 모듈을 불러오는 중입니다.");
      return;
    }
    if (!TOSS_CLIENT_KEY) {
      toast.error("결제 설정이 완료되지 않았습니다.");
      return;
    }

    setSubmitting(true);

    try {
      if (saveCurrentAddress) {
        await saveAddressMutation.mutateAsync({
          label: saveAddressLabel.trim() || "배송지",
          recipientName: shipping.recipientName,
          recipientPhone: shipping.recipientPhone,
          shippingZipCode: shipping.shippingZipCode,
          shippingAddress: shipping.shippingAddress,
          shippingAddressDetail: shipping.shippingAddressDetail || undefined,
          isDefault: (addresses.data?.length ?? 0) === 0,
        });
        await addresses.refetch();
      }

      const order = await createOrderMutation.mutateAsync({
        items: cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        couponIssueId: selectedCouponIssueId,
        discountCode: appliedDiscountCode,
        recipientName: shipping.recipientName,
        recipientPhone: shipping.recipientPhone,
        shippingZipCode: shipping.shippingZipCode,
        shippingAddress: shipping.shippingAddress,
        shippingAddressDetail: shipping.shippingAddressDetail || undefined,
        shippingMemo: shipping.shippingMemo || undefined,
      });

      localStorage.setItem("pendingOrder", order.orderId);

      try {
        const toss = window.TossPayments(TOSS_CLIENT_KEY);
        await toss.requestPayment("카드", {
          amount: order.finalAmount,
          orderId: order.orderId,
          orderName: order.orderName,
          customerName: user?.name ?? shipping.recipientName,
          customerEmail: user?.email ?? undefined,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
        });
      } catch (error) {
        try {
          await failOrderMutation.mutateAsync({ orderId: order.orderId });
        } catch {
          toast.error("결제 실패 주문 정리에 실패했습니다. 관리자에게 문의해주세요.");
        } finally {
          localStorage.removeItem("pendingOrder");
        }

        const err = error as { code?: string; message?: string };
        if (err?.code === "USER_CANCEL") {
          toast.error("결제를 취소했습니다.");
          return;
        }
        toast.error(err?.message ?? "결제 중 오류가 발생했습니다.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "주문 생성 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (authUser && cartItems.length > 0 && quote.isLoading && !quote.data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f4ed]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f4ed] px-4">
        <p className="text-sm text-[#6f645d]">주문을 진행하려면 로그인이 필요합니다.</p>
        <a href={getLoginUrl()} className="rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258]">
          로그인
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f4ed] text-[#1f1714]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <a href="/index-main.html" className="text-lg font-semibold tracking-[0.35em] text-[#1f1714]">REAGE</a>
          <button
            onClick={() => navigate("/cart")}
            className="rounded-full border border-black/10 px-4 py-2 text-sm text-[#5d5049] transition hover:border-[#c9a96e] hover:text-[#1f1714]"
          >
            장바구니로
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <p className="text-xs font-medium tracking-[0.3em] text-[#c9a96e]">CHECKOUT</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#1f1714]">주문 / 결제</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1f1714]">주문 상품</h2>
                <span className="text-sm text-[#8a7b70]">{quote.data?.items.length ?? cartItems.length}개</span>
              </div>
              <div className="mt-4 space-y-4">
                {(quote.data?.items ?? []).map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-4 rounded-[22px] bg-[#faf6f0] px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1f1714]">{item.product.name}</p>
                      <p className="mt-1 text-xs text-[#8a7b70]">{formatPrice(item.unitPrice)} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#1f1714]">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1f1714]">저장된 배송지</h2>
                <span className="text-xs text-[#8a7b70]">기본 배송지를 바로 불러올 수 있습니다.</span>
              </div>
              {(addresses.data?.length ?? 0) === 0 ? (
                <div className="mt-4 rounded-[22px] bg-[#faf6f0] px-4 py-4 text-sm text-[#6f645d]">
                  저장된 배송지가 없습니다. 현재 입력한 배송지를 결제와 함께 저장할 수 있습니다.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(addresses.data ?? []).map((address) => (
                    <button
                      key={address.id}
                      onClick={() => selectAddress(address as SavedAddress)}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        selectedAddressId === address.id
                          ? "border-[#8b1a1a] bg-[#fff8f6]"
                          : "border-[#eadfce] bg-[#faf6f0] hover:border-[#c9a96e]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1f1714]">{address.label}</p>
                        {address.isDefault && <span className="rounded-full bg-[#1f1714] px-2 py-0.5 text-[11px] text-[#f0d9ae]">기본</span>}
                      </div>
                      <p className="mt-2 text-sm text-[#5d5049]">{address.recipientName} · {address.recipientPhone}</p>
                      <p className="mt-1 text-xs leading-5 text-[#8a7b70]">
                        ({address.shippingZipCode}) {address.shippingAddress} {address.shippingAddressDetail ?? ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <h2 className="text-lg font-semibold text-[#1f1714]">배송지 정보</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">수령인 이름</span>
                  <input value={shipping.recipientName} onChange={setField("recipientName")} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">연락처</span>
                  <input value={shipping.recipientPhone} onChange={setField("recipientPhone")} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">우편번호</span>
                <div className="flex gap-2">
                  <input value={shipping.shippingZipCode} readOnly className="w-36 rounded-2xl border border-[#e5dac9] bg-[#faf6f0] px-4 py-3 outline-none" />
                  <button
                    type="button"
                    onClick={openAddressSearch}
                    className="rounded-full bg-[#1f1714] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#372b26]"
                  >
                    {daumLoaded ? "주소 검색" : "로딩 중"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">주소</span>
                  <input value={shipping.shippingAddress} readOnly className="w-full rounded-2xl border border-[#e5dac9] bg-[#faf6f0] px-4 py-3 outline-none" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">상세주소</span>
                  <input value={shipping.shippingAddressDetail} onChange={setField("shippingAddressDetail")} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">배송 메모</span>
                  <select value={shipping.shippingMemo} onChange={setField("shippingMemo")} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]">
                    <option value="">배송 메모 선택</option>
                    <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                    <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                    <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                    <option value="부재 시 문자 남겨주세요">부재 시 문자 남겨주세요</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-[24px] bg-[#faf6f0] px-4 py-4">
                <label className="flex items-center gap-3 text-sm text-[#5d5049]">
                  <input
                    type="checkbox"
                    checked={saveCurrentAddress}
                    onChange={(event) => setSaveCurrentAddress(event.target.checked)}
                    className="h-4 w-4 rounded border-[#c9a96e]"
                  />
                  이번 배송지를 내 주소록에 저장
                </label>
                {saveCurrentAddress && (
                  <input
                    value={saveAddressLabel}
                    onChange={(event) => setSaveAddressLabel(event.target.value)}
                    placeholder="예: 본가, 사무실"
                    className="mt-3 w-full rounded-2xl border border-[#e5dac9] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c9a96e]"
                  />
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <h2 className="text-lg font-semibold text-[#1f1714]">쿠폰 / 할인코드</h2>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">보유 쿠폰</span>
                  <select
                    value={selectedCouponIssueId ?? ""}
                    onChange={(event) => setSelectedCouponIssueId(event.target.value || undefined)}
                    className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]"
                  >
                    <option value="">쿠폰 선택 안 함</option>
                    {usableCoupons.map((row) => (
                      <option key={row.issue.id} value={row.issue.id}>
                        {row.coupon.name} · {describeCoupon(row.coupon)}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">할인코드</span>
                  <div className="flex gap-2">
                    <input
                      value={discountCodeInput}
                      onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                      placeholder="예: REAGE10"
                      className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 text-sm outline-none transition focus:border-[#c9a96e]"
                    />
                    <button
                      type="button"
                      onClick={applyDiscountCode}
                      className="rounded-full border border-[#c9a96e] px-4 py-3 text-sm font-medium text-[#8b1a1a] transition hover:bg-[#f7efe3]"
                    >
                      적용
                    </button>
                  </div>
                  {appliedDiscountCode && (
                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#faf6f0] px-4 py-3 text-sm text-[#5d5049]">
                      <span>적용 코드: <strong className="text-[#1f1714]">{appliedDiscountCode}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedDiscountCode(undefined);
                          setDiscountCodeInput("");
                        }}
                        className="text-xs font-medium text-[#8b1a1a]"
                      >
                        제거
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {quote.error?.message && (
                <div className="mt-4 rounded-[22px] border border-[#f3d1d1] bg-[#fff3f3] px-4 py-4 text-sm text-[#8b1a1a]">
                  {quote.error.message}
                </div>
              )}
            </section>
          </div>

          <aside className="h-fit rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_20px_60px_rgba(67,44,23,0.08)]">
            <h2 className="text-lg font-semibold text-[#1f1714]">결제 요약</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[#6f645d]">
                <span>상품 금액</span>
                <span>{formatPrice(quote.data?.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between text-[#6f645d]">
                <span>할인 금액</span>
                <span className="text-[#8b1a1a]">-{formatPrice(quote.data?.discountAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-[#6f645d]">
                <span>배송비</span>
                <span>{(quote.data?.shippingAmount ?? 0) === 0 ? "무료" : formatPrice(quote.data?.shippingAmount ?? 0)}</span>
              </div>
              {quote.data?.promotionLabel && (
                <div className="rounded-2xl bg-[#faf6f0] px-4 py-3 text-xs leading-5 text-[#6f645d]">
                  적용 혜택: <strong className="text-[#1f1714]">{quote.data.promotionLabel}</strong>
                </div>
              )}
              <div className="rounded-[24px] bg-[#1f1714] px-5 py-5 text-white">
                <div className="flex justify-between">
                  <span className="text-sm text-white/72">총 결제금액</span>
                  <span className="text-2xl font-semibold">{formatPrice(quote.data?.finalAmount ?? 0)}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/70">
                  쿠폰, 할인코드, 배송비, 재고를 서버에서 다시 검증한 뒤 결제를 시작합니다.
                </p>
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={submitting || createOrderMutation.isPending || saveAddressMutation.isPending || !quote.data || !!quote.error}
              className="mt-5 w-full rounded-full bg-[#8b1a1a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#731515] disabled:cursor-not-allowed disabled:bg-[#d9c9c9]"
            >
              {submitting ? "결제 준비 중..." : "결제하기"}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
