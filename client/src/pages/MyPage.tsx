import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { saveCart } from "@/lib/cart";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Tab = "info" | "orders" | "verification";

type AddressForm = {
  id?: number;
  label: string;
  recipientName: string;
  recipientPhone: string;
  shippingZipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
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

function formatPrice(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("ko-KR")}원`;
}

function roleLabel(memberRole?: string | null, verificationStatus?: string | null) {
  if (memberRole === "membership") return "멤버십 회원";
  if (memberRole === "professional" && verificationStatus === "approved") return "전문가 회원";
  return "일반 회원";
}

function couponLabel(coupon: CouponRow["coupon"]) {
  if (coupon.benefitType === "discount_amount") return `${coupon.benefitValue.toLocaleString("ko-KR")}원 할인`;
  if (coupon.benefitType === "discount_rate") return `${coupon.benefitValue}% 할인`;
  if (coupon.benefitType === "free_basic_shipping" || coupon.benefitType === "free_all_shipping") return "배송비 무료";
  return "혜택 적용";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    none: { label: "미제출", color: "bg-gray-100 text-gray-600" },
    pending: { label: "심사중", color: "bg-yellow-100 text-yellow-700" },
    approved: { label: "승인완료", color: "bg-green-100 text-green-700" },
    rejected: { label: "반려", color: "bg-red-100 text-red-600" },
  };
  const current = map[status] ?? map.none;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${current.color}`}>{current.label}</span>;
}

function OrderStatusBadge({ status, shippingStatus }: { status: string; shippingStatus?: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    created: { label: "결제대기", color: "bg-gray-100 text-gray-600" },
    paid: { label: "결제완료", color: "bg-green-100 text-green-700" },
    ready: { label: "배송준비중", color: "bg-blue-100 text-blue-700" },
    hold: { label: "배송보류", color: "bg-yellow-100 text-yellow-700" },
    shipping: { label: "배송중", color: "bg-indigo-100 text-indigo-700" },
    delivered: { label: "배송완료", color: "bg-purple-100 text-purple-700" },
    cancelled: { label: "취소완료", color: "bg-red-100 text-red-600" },
    failed: { label: "결제실패", color: "bg-red-100 text-red-700" },
  };
  const key = status === "paid" && shippingStatus && shippingStatus !== "none" && shippingStatus !== "pending_payment"
    ? shippingStatus
    : status;
  const current = map[key] ?? { label: key, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${current.color}`}>{current.label}</span>;
}

function isCancellable(order: { status: string; paidAt?: Date | string | null }) {
  if (order.status !== "paid" || !order.paidAt) return false;
  const diffHours = (Date.now() - new Date(order.paidAt).getTime()) / (1000 * 60 * 60);
  return diffHours <= 24;
}

function remainingCancelTime(paidAt: Date | string | null | undefined) {
  if (!paidAt) return "";
  const diff = 24 * 60 * 60 * 1000 - (Date.now() - new Date(paidAt).getTime());
  if (diff <= 0) return "취소 기간 만료";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `취소 가능 시간: ${hours}시간 ${minutes}분 남음`;
}

const emptyAddressForm: AddressForm = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  shippingZipCode: "",
  shippingAddress: "",
  shippingAddressDetail: "",
  isDefault: false,
};

export default function MyPage() {
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("info");
  const [cancelConfirmOrderId, setCancelConfirmOrderId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);

  const { data: user, refetch: refetchUser } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const { data: verification, refetch: refetchVerification } = trpc.verification.get.useQuery(undefined, { enabled: !!authUser });
  const { data: orders, refetch: refetchOrders } = trpc.order.myOrders.useQuery(undefined, { enabled: !!authUser });
  const addresses = trpc.user.addresses.useQuery(undefined, { enabled: !!authUser });
  const coupons = trpc.promotion.myCoupons.useQuery(undefined, { enabled: !!authUser });

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("프로필이 저장되었습니다.");
      refetchUser();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveAddressMutation = trpc.user.saveAddress.useMutation({
    onSuccess: () => {
      toast.success(addressForm.id ? "배송지가 수정되었습니다." : "배송지가 저장되었습니다.");
      setAddressForm(emptyAddressForm);
      addresses.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAddressMutation = trpc.user.deleteAddress.useMutation({
    onSuccess: () => {
      toast.success("배송지가 삭제되었습니다.");
      addresses.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const submitVerification = trpc.verification.submit.useMutation({
    onSuccess: () => {
      toast.success("사업자 인증 서류가 제출되었습니다.");
      refetchUser();
      refetchVerification();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelByUser = trpc.order.cancelByUser.useMutation({
    onSuccess: () => {
      toast.success("주문이 취소되었습니다.");
      setCancelConfirmOrderId(null);
      refetchOrders();
    },
    onError: (error) => {
      toast.error(error.message);
      setCancelConfirmOrderId(null);
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (verification) {
      setBizNumber(verification.businessNumber ?? "");
      setBizName(verification.businessName ?? "");
      setBizPhone(verification.contactPhone ?? "");
    }
  }, [verification]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f4ed]">
        <p className="text-sm text-[#6f645d]">로그인이 필요합니다.</p>
        <a href={getLoginUrl()} className="rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258]">
          로그인
        </a>
      </div>
    );
  }

  const handleSaveProfile = () => {
    updateProfile.mutate({ name: name || undefined, phone: phone || undefined });
  };

  const handleSaveAddress = () => {
    if (!addressForm.label.trim() || !addressForm.recipientName.trim() || !addressForm.recipientPhone.trim() || !addressForm.shippingZipCode.trim() || !addressForm.shippingAddress.trim()) {
      toast.error("배송지 정보를 모두 입력해주세요.");
      return;
    }
    saveAddressMutation.mutate({
      id: addressForm.id,
      label: addressForm.label,
      recipientName: addressForm.recipientName,
      recipientPhone: addressForm.recipientPhone,
      shippingZipCode: addressForm.shippingZipCode,
      shippingAddress: addressForm.shippingAddress,
      shippingAddressDetail: addressForm.shippingAddressDetail || undefined,
      isDefault: addressForm.isDefault,
    });
  };

  const handleSubmitVerification = async () => {
    if (!file) {
      toast.error("사업자등록증 파일을 첨부해주세요.");
      return;
    }
    if (!bizNumber.trim() || !bizName.trim()) {
      toast.error("사업자번호와 상호명을 입력해주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      submitVerification.mutate({
        businessNumber: bizNumber,
        businessName: bizName,
        contactPhone: bizPhone || undefined,
        fileBase64: base64,
        fileName: file.name,
        fileMimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleReorder = (order: NonNullable<typeof orders>[number]) => {
    const reorderItems = order.items.flatMap((item) =>
      item.productId ? [{ productId: item.productId, quantity: item.quantity }] : [],
    );

    if (reorderItems.length === 0) {
      toast.error("재주문 가능한 상품 정보가 없습니다.");
      return;
    }

    saveCart(reorderItems);
    toast.success("주문 상품을 장바구니에 담았습니다.");
    navigate("/cart");
  };

  const activeCoupons = ((coupons.data ?? []) as CouponRow[]).filter(
    (row) => row.coupon.status === "active" && !row.issue.isUsed,
  );

  return (
    <div className="min-h-screen bg-[#f8f4ed] text-[#1f1714]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <a href="/index-main.html" className="text-lg font-semibold tracking-[0.35em] text-[#1f1714]">REAGE</a>
          <div className="flex items-center gap-3">
            <a href="/shop" className="text-sm text-[#6f645d] transition hover:text-[#1f1714]">쇼핑</a>
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/index-main.html";
              }}
              className="text-sm font-medium text-[#8b1a1a] transition hover:text-[#731515]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5efe4] text-xl font-semibold text-[#c9a96e]">
                {(user?.name ?? authUser.name ?? "U")[0]}
              </div>
              <div>
                <p className="text-lg font-semibold text-[#1f1714]">{user?.name ?? authUser.name ?? "회원"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#6f645d]">
                  <span>{roleLabel(user?.memberRole, user?.proVerificationStatus)}</span>
                  <span>·</span>
                  <StatusBadge status={user?.proVerificationStatus ?? "none"} />
                </div>
              </div>
            </div>
            <div className="rounded-full border border-[#eadfce] bg-[#faf6f0] px-4 py-2 text-sm text-[#5d5049]">
              보유 쿠폰 {activeCoupons.length}장
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-full bg-white p-1 shadow-[0_10px_24px_rgba(67,44,23,0.08)]">
          {[
            { id: "info", label: "내 정보" },
            { id: "orders", label: "주문내역" },
            { id: "verification", label: "전문가 인증" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as Tab)}
              className={`flex-1 rounded-full py-3 text-sm font-medium transition ${
                tab === item.id ? "bg-[#1f1714] text-white" : "text-[#6f645d] hover:bg-[#faf5ee]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div className="space-y-5">
            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <h2 className="text-lg font-semibold text-[#1f1714]">기본 정보</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">이름</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">연락처</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049] md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">이메일</span>
                  <input value={user?.email ?? ""} disabled className="w-full rounded-2xl border border-[#e5dac9] bg-[#faf6f0] px-4 py-3 text-[#8a7b70]" />
                </label>
              </div>
              <button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="mt-5 rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258] disabled:opacity-60">
                {updateProfile.isPending ? "저장 중..." : "기본 정보 저장"}
              </button>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#1f1714]">저장된 배송지</h2>
                <button
                  onClick={() => setAddressForm(emptyAddressForm)}
                  className="text-sm font-medium text-[#8b1a1a]"
                >
                  새 배송지 입력
                </button>
              </div>

              {(addresses.data?.length ?? 0) > 0 && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(addresses.data ?? []).map((address) => (
                    <div key={address.id} className="rounded-[24px] border border-[#eadfce] bg-[#faf6f0] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1f1714]">{address.label}</p>
                          {address.isDefault && <span className="rounded-full bg-[#1f1714] px-2 py-0.5 text-[11px] text-[#f0d9ae]">기본</span>}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => setAddressForm({
                              id: address.id,
                              label: address.label,
                              recipientName: address.recipientName,
                              recipientPhone: address.recipientPhone,
                              shippingZipCode: address.shippingZipCode,
                              shippingAddress: address.shippingAddress,
                              shippingAddressDetail: address.shippingAddressDetail ?? "",
                              isDefault: address.isDefault,
                            })}
                            className="font-medium text-[#8b1a1a]"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteAddressMutation.mutate({ id: address.id })}
                            className="font-medium text-[#6f645d]"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[#5d5049]">{address.recipientName} · {address.recipientPhone}</p>
                      <p className="mt-1 text-xs leading-5 text-[#8a7b70]">
                        ({address.shippingZipCode}) {address.shippingAddress} {address.shippingAddressDetail ?? ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">배송지 이름</span>
                  <input value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">수령인</span>
                  <input value={addressForm.recipientName} onChange={(event) => setAddressForm((current) => ({ ...current, recipientName: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">연락처</span>
                  <input value={addressForm.recipientPhone} onChange={(event) => setAddressForm((current) => ({ ...current, recipientPhone: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049]">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">우편번호</span>
                  <input value={addressForm.shippingZipCode} onChange={(event) => setAddressForm((current) => ({ ...current, shippingZipCode: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049] md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">주소</span>
                  <input value={addressForm.shippingAddress} onChange={(event) => setAddressForm((current) => ({ ...current, shippingAddress: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
                <label className="block text-sm text-[#5d5049] md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">상세주소</span>
                  <input value={addressForm.shippingAddressDetail} onChange={(event) => setAddressForm((current) => ({ ...current, shippingAddressDetail: event.target.value }))} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                </label>
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-[#5d5049]">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))} />
                기본 배송지로 저장
              </label>

              <button onClick={handleSaveAddress} disabled={saveAddressMutation.isPending} className="mt-5 rounded-full bg-[#1f1714] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#372b26] disabled:opacity-60">
                {saveAddressMutation.isPending ? "저장 중..." : addressForm.id ? "배송지 수정" : "배송지 저장"}
              </button>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
              <h2 className="text-lg font-semibold text-[#1f1714]">보유 쿠폰</h2>
              {activeCoupons.length === 0 ? (
                <div className="mt-4 rounded-[24px] bg-[#faf6f0] px-4 py-5 text-sm text-[#6f645d]">
                  사용 가능한 쿠폰이 없습니다.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {activeCoupons.map((row) => (
                    <div key={row.issue.id} className="rounded-[24px] border border-[#eadfce] bg-[#faf6f0] px-4 py-4">
                      <p className="text-sm font-semibold text-[#1f1714]">{row.coupon.name}</p>
                      <p className="mt-2 text-sm text-[#8b1a1a]">{couponLabel(row.coupon)}</p>
                      <p className="mt-2 text-xs text-[#8a7b70]">
                        발급일 {new Date(row.issue.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            {!orders || orders.length === 0 ? (
              <div className="rounded-[30px] border border-[#eadfce] bg-white px-8 py-14 text-center shadow-[0_18px_50px_rgba(67,44,23,0.08)]">
                <p className="text-sm text-[#6f645d]">주문 내역이 없습니다.</p>
                <a href="/shop" className="mt-4 inline-flex rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258]">
                  쇼핑하러 가기
                </a>
              </div>
            ) : (
              orders.map((order) => {
                const cancellable = isCancellable(order);
                const paidAmount = Number(order.finalAmount ?? order.totalAmount ?? 0);
                const discountAmount = Number(order.discountAmount ?? 0);
                const shippingAmount = Number(order.shippingAmount ?? 0);
                const createdDate = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("ko-KR")
                  : "주문일 미확인";

                return (
                  <div key={order.id} className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#8a7b70]">{createdDate}</p>
                        <p className="mt-1 text-lg font-semibold text-[#1f1714]">{order.orderName}</p>
                        <p className="mt-1 text-xs text-[#8a7b70]">주문번호 {order.orderId}</p>
                      </div>
                      <OrderStatusBadge status={order.status} shippingStatus={order.shippingStatus} />
                    </div>

                    {order.recipientName && (
                      <div className="mt-4 rounded-[24px] bg-[#faf6f0] px-4 py-4 text-sm text-[#5d5049]">
                        <p className="font-medium text-[#1f1714]">배송지</p>
                        <p className="mt-2">{order.recipientName} · {order.recipientPhone}</p>
                        <p className="mt-1">{order.shippingAddress} {order.shippingAddressDetail}</p>
                        {order.shippingMemo && <p className="mt-1 text-xs text-[#8a7b70]">메모: {order.shippingMemo}</p>}
                      </div>
                    )}

                    <div className="mt-4 space-y-2 border-t border-[#f3ebdf] pt-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-4 text-sm">
                          <span className="text-[#5d5049]">{item.productName} × {item.quantity}</span>
                          <span className="font-medium text-[#1f1714]">{formatPrice(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[24px] bg-[#fff8f6] px-4 py-4">
                      <div className="flex justify-between text-sm text-[#6f645d]">
                        <span>상품 금액</span>
                        <span>{formatPrice(order.totalAmount)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-[#6f645d]">
                        <span>할인 금액</span>
                        <span className="text-[#8b1a1a]">-{formatPrice(discountAmount)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-[#6f645d]">
                        <span>배송비</span>
                        <span>{shippingAmount === 0 ? "무료" : formatPrice(shippingAmount)}</span>
                      </div>
                      {order.promotionLabel && (
                        <div className="mt-2 text-xs text-[#8a7b70]">적용 혜택: {order.promotionLabel}</div>
                      )}
                      <div className="mt-3 flex justify-between border-t border-[#f0dfd8] pt-3 text-sm font-semibold text-[#1f1714]">
                        <span>실결제 금액</span>
                        <span className="text-[#8b1a1a]">{formatPrice(paidAmount)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#8a7b70]">
                        {cancellable ? remainingCancelTime(order.paidAt) : order.status === "failed" ? "결제가 완료되지 않은 주문입니다." : ""}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleReorder(order)}
                          className="rounded-full border border-[#c9a96e] px-4 py-2 text-sm font-medium text-[#8b1a1a] transition hover:bg-[#f7efe3]"
                        >
                          재주문
                        </button>
                        {cancellable && (
                          <button
                            onClick={() => setCancelConfirmOrderId(order.orderId)}
                            className="rounded-full border border-[#e5b4b4] px-4 py-2 text-sm font-medium text-[#8b1a1a] transition hover:bg-[#fff3f3]"
                          >
                            주문 취소
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "verification" && (
          <div className="rounded-[30px] border border-[#eadfce] bg-white px-6 py-6 shadow-[0_18px_50px_rgba(67,44,23,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[#1f1714]">사업자 인증</h2>
              <StatusBadge status={user?.proVerificationStatus ?? "none"} />
            </div>

            {user?.proVerificationStatus === "approved" ? (
              <div className="py-10 text-center">
                <p className="text-lg font-semibold text-green-700">전문가 인증이 완료되었습니다.</p>
                <p className="mt-2 text-sm text-[#6f645d]">전문가 가격으로 제품을 구매할 수 있습니다.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-7 text-[#6f645d]">
                  사업자등록증을 제출하시면 심사 후 전문가 회원으로 승인됩니다. 승인 완료 시 전문가 할인가가 적용됩니다.
                </p>
                {verification?.status === "pending" && (
                  <div className="rounded-[22px] border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-700">
                    서류 심사가 진행 중입니다. 영업일 기준 1~3일 내 결과를 안내드립니다.
                  </div>
                )}
                {verification?.status === "rejected" && (
                  <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
                    인증이 반려되었습니다. {verification.rejectReason ? `사유: ${verification.rejectReason}` : "서류를 다시 제출해주세요."}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-[#5d5049]">
                    <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">사업자등록번호</span>
                    <input value={bizNumber} onChange={(event) => setBizNumber(event.target.value)} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                  </label>
                  <label className="block text-sm text-[#5d5049]">
                    <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">상호명</span>
                    <input value={bizName} onChange={(event) => setBizName(event.target.value)} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                  </label>
                  <label className="block text-sm text-[#5d5049] md:col-span-2">
                    <span className="mb-2 block text-xs font-semibold text-[#8a7b70]">담당자 연락처</span>
                    <input value={bizPhone} onChange={(event) => setBizPhone(event.target.value)} className="w-full rounded-2xl border border-[#e5dac9] px-4 py-3 outline-none transition focus:border-[#c9a96e]" />
                  </label>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-[24px] border-2 border-dashed border-[#d8c7b5] px-6 py-8 text-center transition hover:border-[#c9a96e]"
                >
                  {file ? (
                    <p className="text-sm font-medium text-[#8b1a1a]">{file.name}</p>
                  ) : (
                    <p className="text-sm text-[#8a7b70]">클릭하여 사업자등록증 파일 업로드 (PDF, JPG, PNG)</p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />

                <button
                  onClick={handleSubmitVerification}
                  disabled={submitVerification.isPending || verification?.status === "pending"}
                  className="rounded-full bg-[#c9a96e] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#b79258] disabled:opacity-60"
                >
                  {submitVerification.isPending ? "제출 중..." : verification?.status === "pending" ? "심사 중" : "인증 서류 제출"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {cancelConfirmOrderId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
            <h3 className="text-lg font-semibold text-[#1f1714]">주문 취소</h3>
            <p className="mt-3 text-sm leading-6 text-[#6f645d]">
              주문번호 <strong className="text-[#1f1714]">{cancelConfirmOrderId}</strong>을 취소하시겠습니까?
            </p>
            <p className="mt-2 text-xs leading-5 text-[#8a7b70]">환불은 3~5 영업일 내 카드사 반영 기준으로 처리됩니다.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setCancelConfirmOrderId(null)} className="rounded-full border border-[#e5dac9] px-4 py-2 text-sm text-[#5d5049]">
                돌아가기
              </button>
              <button
                onClick={() => cancelByUser.mutate({ orderId: cancelConfirmOrderId })}
                disabled={cancelByUser.isPending}
                className="rounded-full bg-[#8b1a1a] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {cancelByUser.isPending ? "처리 중..." : "취소 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
