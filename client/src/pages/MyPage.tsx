import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Tab = "info" | "orders" | "verification";

function formatPrice(n: number | string) {
  return Number(n).toLocaleString("ko-KR") + "원";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    none: { label: "미제출", color: "bg-gray-100 text-gray-600" },
    pending: { label: "심사중", color: "bg-yellow-100 text-yellow-700" },
    approved: { label: "승인완료", color: "bg-green-100 text-green-700" },
    rejected: { label: "반려", color: "bg-red-100 text-red-600" },
  };
  const s = map[status] ?? map.none;
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>;
}

export default function MyPage() {
  const { user: authUser, loading: authLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("info");

  const { data: user, refetch: refetchUser } = trpc.user.me.useQuery(undefined, { enabled: !!authUser });
  const { data: verification, refetch: refetchVerification } = trpc.verification.get.useQuery(undefined, { enabled: !!authUser });
  const { data: orders } = trpc.order.myOrders.useQuery(undefined, { enabled: !!authUser });

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => { toast.success("프로필이 저장되었습니다."); refetchUser(); },
    onError: (e) => toast.error(e.message),
  });

  const submitVerification = trpc.verification.submit.useMutation({
    onSuccess: () => { toast.success("사업자 인증 서류가 제출되었습니다. 심사 후 결과를 안내드립니다."); refetchUser(); refetchVerification(); },
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) { setName(user.name ?? ""); setPhone(user.phone ?? ""); }
  }, [user]);

  useEffect(() => {
    if (verification) {
      setBizNumber(verification.businessNumber ?? "");
      setBizName(verification.businessName ?? "");
      setBizPhone(verification.contactPhone ?? "");
    }
  }, [verification]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FAFAF8]">
        <p className="text-gray-600">로그인이 필요합니다.</p>
        <a href={getLoginUrl()} className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm font-medium hover:bg-[#b8965e] transition-colors">로그인</a>
      </div>
    );
  }

  const handleSaveProfile = () => {
    updateProfile.mutate({ name: name || undefined, phone: phone || undefined });
  };

  const handleSubmitVerification = async () => {
    if (!file) { toast.error("사업자등록증 파일을 첨부해주세요."); return; }
    if (!bizNumber.trim() || !bizName.trim()) { toast.error("사업자번호와 상호명을 입력해주세요."); return; }
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "내 정보" },
    { id: "orders", label: "주문내역" },
    { id: "verification", label: "전문가 인증" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/index-main.html" className="text-lg font-semibold tracking-widest text-[#1a1a1a]">REAGE</a>
          <div className="flex items-center gap-3">
            <a href="/index-main.html" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← 홈으로</a>
            <button
              onClick={() => { logout(); window.location.href = '/index-main.html'; }}
              className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-6">마이페이지</h1>

        {/* 회원 등급 배지 */}
        {user && (
          <div className="bg-white rounded-xl p-4 mb-6 flex items-center gap-3 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#F5EFE4] flex items-center justify-center text-[#C9A96E] font-bold text-lg">
              {(user.name ?? authUser.name ?? "U")[0]}
            </div>
            <div>
              <p className="font-medium text-[#1a1a1a]">{user.name ?? authUser.name ?? "회원"}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {user.memberRole === "professional" && user.proVerificationStatus === "approved"
                  ? "전문가 회원"
                  : "일반 회원"}
                {" · "}
                <StatusBadge status={user.proVerificationStatus} />
              </p>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === t.id ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 내 정보 */}
        {tab === "info" && (
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#1a1a1a] mb-2">기본 정보</h2>
            <div>
              <label className="block text-xs text-gray-500 mb-1">이름</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30" placeholder="이름을 입력하세요" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">이메일</label>
              <input value={user?.email ?? ""} disabled className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">연락처</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30" placeholder="010-0000-0000" />
            </div>
            <button onClick={handleSaveProfile} disabled={updateProfile.isPending} className="w-full py-2.5 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#b8965e] transition-colors disabled:opacity-50">
              {updateProfile.isPending ? "저장 중..." : "저장하기"}
            </button>
          </div>
        )}

        {/* 주문내역 */}
        {tab === "orders" && (
          <div className="space-y-3">
            {!orders || orders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                <p className="text-gray-400 text-sm">주문 내역이 없습니다.</p>
                <a href="/shop.html" className="mt-3 inline-block text-[#C9A96E] text-sm hover:underline">쇼핑하러 가기</a>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("ko-KR")}</p>
                      <p className="font-medium text-[#1a1a1a] mt-0.5">{order.orderName}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">결제완료</span>
                  </div>
                  <div className="border-t border-gray-50 pt-3 space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                        <span className="text-[#1a1a1a]">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
                    <span className="text-sm text-gray-500">합계</span>
                    <span className="font-semibold text-[#C9A96E]">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 전문가 인증 */}
        {tab === "verification" && (
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-[#1a1a1a]">사업자 인증</h2>
              {user && <StatusBadge status={user.proVerificationStatus} />}
            </div>

            {user?.proVerificationStatus === "approved" ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-medium text-green-700">전문가 인증이 완료되었습니다.</p>
                <p className="text-sm text-gray-500 mt-1">전문가 할인가로 제품을 구매하실 수 있습니다.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 leading-relaxed">
                  사업자등록증을 제출하시면 심사 후 전문가 회원으로 승인됩니다. 승인 완료 시 전문가 할인가가 적용됩니다.
                </p>
                {verification?.status === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    서류 심사가 진행 중입니다. 영업일 기준 1~3일 내 결과를 안내드립니다.
                  </div>
                )}
                {verification?.status === "rejected" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                    인증이 반려되었습니다. {verification.rejectReason ? `사유: ${verification.rejectReason}` : "서류를 다시 제출해주세요."}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">사업자등록번호 <span className="text-red-400">*</span></label>
                  <input value={bizNumber} onChange={(e) => setBizNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30" placeholder="000-00-00000" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">상호명 <span className="text-red-400">*</span></label>
                  <input value={bizName} onChange={(e) => setBizName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30" placeholder="상호명을 입력하세요" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">담당자 연락처</label>
                  <input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/30" placeholder="010-0000-0000" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">사업자등록증 첨부 <span className="text-red-400">*</span></label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A96E]/50 transition-colors"
                  >
                    {file ? (
                      <p className="text-sm text-[#C9A96E]">{file.name}</p>
                    ) : (
                      <p className="text-sm text-gray-400">클릭하여 파일 선택 (PDF, JPG, PNG)</p>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <button
                  onClick={handleSubmitVerification}
                  disabled={submitVerification.isPending || verification?.status === "pending"}
                  className="w-full py-2.5 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#b8965e] transition-colors disabled:opacity-50"
                >
                  {submitVerification.isPending ? "제출 중..." : verification?.status === "pending" ? "심사 중 (재제출 불가)" : "인증 서류 제출"}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
