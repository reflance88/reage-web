import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

// ─── Design tokens (AdminPage와 동일) ─────────────────────────────────────────
const C = {
  bg: "#F7F5F2",
  white: "#FFFFFF",
  primary: "#6B0F1A",
  gold: "#C9A96E",
  border: "#E8E6E3",
  text: "#1A1412",
  muted: "#6B6B6B",
  blue: "#1D4ED8",
  green: "#166534",
  orange: "#B45309",
  tableHead: "#F9F8F7",
};

// ─── 공통 스타일 ───────────────────────────────────────────────────────────────
const sectionBox: React.CSSProperties = {
  background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`,
  padding: "24px", marginBottom: "20px",
};
const sectionTitle: React.CSSProperties = {
  fontSize: "15px", fontWeight: 800, color: C.text, marginBottom: "16px",
  paddingBottom: "10px", borderBottom: `1px solid ${C.border}`,
};
const rowStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "160px 1fr", gap: "0",
  borderBottom: `1px solid ${C.border}`, minHeight: "44px",
};
const labelStyle: React.CSSProperties = {
  padding: "10px 14px", background: "#F9F8F7", fontSize: "13px",
  fontWeight: 600, color: C.text, display: "flex", alignItems: "center",
  borderRight: `1px solid ${C.border}`,
};
const cellStyle: React.CSSProperties = {
  padding: "8px 14px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px",
};
const inputStyle: React.CSSProperties = {
  padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: "6px",
  fontSize: "13px", outline: "none", width: "100%", maxWidth: "400px",
};
const selectStyle: React.CSSProperties = {
  padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: "6px",
  fontSize: "13px", background: "#fff", cursor: "pointer",
};
const radioLabel: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "13px",
};
const checkLabel: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "13px",
};

function RequiredBadge() {
  return (
    <span style={{
      background: "#DC2626", color: "#fff", fontSize: "10px", fontWeight: 700,
      padding: "1px 5px", borderRadius: "3px", marginLeft: "4px",
    }}>필수</span>
  );
}

function SaveBtn({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          padding: "12px 48px", background: "#1D4ED8", color: "#fff",
          border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md"; disabled?: boolean;
}) {
  const bg = variant === "primary" ? C.primary : variant === "danger" ? "#991B1B" : variant === "success" ? "#166534" : variant === "secondary" ? C.gold : "#fff";
  const color = variant === "outline" ? C.text : "#fff";
  const border = variant === "outline" ? `1.5px solid ${C.border}` : "none";
  const pad = size === "sm" ? "5px 12px" : "8px 18px";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: pad, borderRadius: "8px", border, background: bg, color, fontSize: size === "sm" ? "12px" : "13px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR");
}
function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ko-KR");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 프로모션 대시보드
// ═══════════════════════════════════════════════════════════════════════════════
function PromotionDashboard({ onNavigate }: { onNavigate: (id: string) => void }) {
  const stats = trpc.adminExt.getPromotionStats.useQuery();
  const s = stats.data;

  const statCards = [
    { label: "발급 중인 쿠폰", value: s?.activeCoupons ?? 0, unit: "개", color: "#1D4ED8", nav: "promotion-coupon-list" },
    { label: "총 쿠폰 발급 수", value: s?.totalCouponIssued ?? 0, unit: "건", color: "#166534", nav: "promotion-coupon-list" },
    { label: "등록된 할인코드", value: s?.activeDiscountCodes ?? 0, unit: "개", color: "#B45309", nav: "promotion-discount-list" },
    { label: "활성 리마인드 알림", value: s?.activeRemindAlerts ?? 0, unit: "개", color: "#7C3AED", nav: "promotion-remind" },
  ];

  return (
    <div>
      <SectionHeader title="프로모션 대시보드" />

      {/* 통계 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((card, i) => (
          <div key={i}
            onClick={() => onNavigate(card.nav)}
            style={{
              background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`,
              padding: "20px 24px", cursor: "pointer", transition: "box-shadow 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "8px" }}>{card.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: card.color }}>
              {card.value.toLocaleString()}
              <span style={{ fontSize: "14px", fontWeight: 500, color: C.muted, marginLeft: "4px" }}>{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 빠른 메뉴 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>빠른 메뉴</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "🎫 쿠폰 만들기", desc: "새 쿠폰을 생성합니다", nav: "promotion-coupon-create" },
            { label: "📋 쿠폰 발급/조회", desc: "발급된 쿠폰을 조회합니다", nav: "promotion-coupon-list" },
            { label: "🏷️ 할인코드 등록", desc: "새 할인코드를 등록합니다", nav: "promotion-discount-create" },
            { label: "🔍 할인코드 조회", desc: "등록된 할인코드를 조회합니다", nav: "promotion-discount-list" },
            { label: "🔔 리마인드 Me", desc: "리마인드 알림을 관리합니다", nav: "promotion-remind" },
          ].map((m, i) => (
            <div key={i}
              onClick={() => onNavigate(m.nav)}
              style={{
                background: "#F9F8F7", borderRadius: "10px", border: `1px solid ${C.border}`,
                padding: "16px 20px", cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0EEE9")}
              onMouseLeave={e => (e.currentTarget.style.background = "#F9F8F7")}
            >
              <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>{m.label}</div>
              <div style={{ fontSize: "12px", color: C.muted }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 쿠폰 만들기
// ═══════════════════════════════════════════════════════════════════════════════
function CouponCreateForm({ onSuccess, editCoupon }: { onSuccess: () => void; editCoupon?: any }) {
  const isEdit = !!editCoupon;

  const [name, setName] = useState(editCoupon?.name ?? "");
  const [description, setDescription] = useState(editCoupon?.description ?? "");
  const [benefitType, setBenefitType] = useState(editCoupon?.benefitType ?? "discount_rate");
  const [benefitValue, setBenefitValue] = useState(editCoupon?.benefitValue ?? 0);
  const [issueType, setIssueType] = useState(editCoupon?.issueType ?? "customer_download");
  const [targetMember, setTargetMember] = useState(editCoupon?.targetMember ?? "all");
  const [displayTiming, setDisplayTiming] = useState(editCoupon?.displayTiming ?? "immediate");
  const [periodType, setPeriodType] = useState(editCoupon?.periodType ?? "fixed");
  const [validDays, setValidDays] = useState(editCoupon?.validDays ?? 30);
  const [startDate, setStartDate] = useState(editCoupon?.startDate ? new Date(editCoupon.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(editCoupon?.endDate ? new Date(editCoupon.endDate).toISOString().slice(0, 10) : "");
  const [usePc, setUsePc] = useState(editCoupon?.usePc ?? true);
  const [useMobile, setUseMobile] = useState(editCoupon?.useMobile ?? true);
  const [applyScope, setApplyScope] = useState(editCoupon?.applyScope ?? "order");
  const [productScope, setProductScope] = useState(editCoupon?.productScope ?? "all");
  const [minAmountType, setMinAmountType] = useState(editCoupon?.minAmountType ?? "none");
  const [minAmount, setMinAmount] = useState(editCoupon?.minAmount ?? 0);
  const [calcBasis, setCalcBasis] = useState(editCoupon?.calcBasis ?? "before_discount");
  const [maxUsagePerOrder, setMaxUsagePerOrder] = useState(editCoupon?.maxUsagePerOrder ?? 1);
  const [paymentMethodLimit, setPaymentMethodLimit] = useState(editCoupon?.paymentMethodLimit ?? "none");
  const [imageType, setImageType] = useState(editCoupon?.imageType ?? "default");
  const [notifyOnLogin, setNotifyOnLogin] = useState(editCoupon?.notifyOnLogin ?? false);
  const [sendSms, setSendSms] = useState(editCoupon?.sendSms ?? false);
  const [sendEmail, setSendEmail] = useState(editCoupon?.sendEmail ?? false);
  const [status, setStatus] = useState(editCoupon?.status ?? "active");

  const createCoupon = trpc.adminExt.createCoupon.useMutation({
    onSuccess: () => { toast.success("쿠폰이 등록되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCoupon = trpc.adminExt.updateCoupon.useMutation({
    onSuccess: () => { toast.success("쿠폰이 수정되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error("쿠폰 이름을 입력해 주세요."); return; }
    const payload = {
      name, description, benefitType, benefitValue: Number(benefitValue),
      issueType, targetMember, displayTiming, periodType,
      validDays: periodType === "days_from_issue" ? Number(validDays) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      usePc, useMobile, applyScope, productScope,
      minAmountType, minAmount: Number(minAmount), calcBasis,
      maxUsagePerOrder: Number(maxUsagePerOrder), paymentMethodLimit,
      imageType, notifyOnLogin, sendSms, sendEmail, status,
    };
    if (isEdit) {
      updateCoupon.mutate({ id: editCoupon.id, ...payload });
    } else {
      createCoupon.mutate(payload);
    }
  };

  const benefitUnit = benefitType === "discount_rate" || benefitType === "point_rate" ? "%" : "KRW";

  return (
    <div>
      {/* 발급 정보 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>발급 정보</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰이름 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="쿠폰 이름 입력" style={{ ...inputStyle, maxWidth: "600px" }} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰설명</div>
            <div style={cellStyle}>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="쿠폰 설명 (선택)" style={{ ...inputStyle, maxWidth: "600px" }} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>혜택구분 <RequiredBadge /></div>
            <div style={cellStyle}>
              <select value={benefitType} onChange={e => setBenefitType(e.target.value)} style={selectStyle}>
                <option value="discount_amount">할인금액</option>
                <option value="discount_rate">할인율</option>
                <option value="point_amount">적립금액</option>
                <option value="point_rate">적립율</option>
                <option value="free_basic_shipping">기본배송비할인</option>
                <option value="free_all_shipping">전체배송비할인</option>
                <option value="instant_point">즉시적립</option>
              </select>
              <input
                type="number" value={benefitValue} onChange={e => setBenefitValue(Number(e.target.value))}
                style={{ ...inputStyle, maxWidth: "80px" }} min={0}
              />
              <span style={{ fontSize: "13px", color: C.muted }}>{benefitUnit}</span>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>발급구분</div>
            <div style={cellStyle}>
              <select value={issueType} onChange={e => setIssueType(e.target.value)} style={selectStyle}>
                <option value="target">대상자 지정 발급</option>
                <option value="conditional_auto">조건부 자동</option>
                <option value="customer_download">고객 다운로드</option>
                <option value="periodic_auto">정기 자동</option>
              </select>
              <select value={targetMember} onChange={e => setTargetMember(e.target.value)} style={selectStyle}>
                <option value="all">전체 회원 대상</option>
                <option value="specific">특정 회원</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>노출시점</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={displayTiming === "immediate"} onChange={() => setDisplayTiming("immediate")} /> 즉시 노출
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={displayTiming === "scheduled"} onChange={() => setDisplayTiming("scheduled")} /> 지정한 시점에 노출
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 사용 정보 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>사용 정보</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>사용 기간</div>
            <div style={cellStyle}>
              <select value={periodType} onChange={e => setPeriodType(e.target.value)} style={selectStyle}>
                <option value="fixed">기간 설정</option>
                <option value="days_from_issue">발급일로부터</option>
              </select>
              {periodType === "fixed" ? (
                <>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }} />
                  <span style={{ fontSize: "13px" }}>~</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }} />
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[
                      { l: "오늘", days: 0 },
                      { l: "3일", days: 3 },
                      { l: "7일", days: 7 },
                      { l: "1개월", days: 30 },
                    ].map(q => (
                      <button key={q.l} onClick={() => {
                        const s = new Date(); const e = new Date();
                        e.setDate(e.getDate() + q.days);
                        setStartDate(s.toISOString().slice(0, 10));
                        setEndDate(e.toISOString().slice(0, 10));
                      }} style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                        {q.l}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <input type="number" value={validDays} onChange={e => setValidDays(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "80px" }} min={1} />
                  <span style={{ fontSize: "13px", color: C.muted }}>일 이내</span>
                </>
              )}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>사용 범위 <RequiredBadge /></div>
            <div style={cellStyle}>
              <label style={checkLabel}>
                <input type="checkbox" checked={usePc} onChange={e => setUsePc(e.target.checked)} /> PC쇼핑몰
              </label>
              <label style={checkLabel}>
                <input type="checkbox" checked={useMobile} onChange={e => setUseMobile(e.target.checked)} /> 모바일쇼핑몰
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>적용 범위</div>
            <div style={cellStyle}>
              <select value={applyScope} onChange={e => setApplyScope(e.target.value)} style={selectStyle}>
                <option value="order">주문서 쿠폰</option>
                <option value="product">상품 쿠폰</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰적용 상품 선택</div>
            <div style={cellStyle}>
              {[
                { v: "all", l: "전체상품" },
                { v: "specific", l: "특정상품" },
                { v: "exclude", l: "제외상품" },
              ].map(o => (
                <label key={o.v} style={radioLabel}>
                  <input type="radio" checked={productScope === o.v} onChange={() => setProductScope(o.v)} /> {o.l}
                </label>
              ))}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>사용가능 기준금액</div>
            <div style={cellStyle}>
              <select value={minAmountType} onChange={e => setMinAmountType(e.target.value)} style={selectStyle}>
                <option value="none">제한 없음</option>
                <option value="order_amount">주문금액 기준</option>
                <option value="product_amount">상품금액 기준</option>
              </select>
              {minAmountType !== "none" && (
                <>
                  <input type="number" value={minAmount} onChange={e => setMinAmount(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "120px" }} min={0} />
                  <span style={{ fontSize: "13px", color: C.muted }}>원 이상</span>
                </>
              )}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>적용 계산 기준</div>
            <div style={cellStyle}>
              <select value={calcBasis} onChange={e => setCalcBasis(e.target.value)} style={selectStyle}>
                <option value="before_discount">할인(쿠폰 제외) 적용 전 결제 금액</option>
                <option value="after_discount">할인 적용 후</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>동일쿠폰사용 설정 <RequiredBadge /></div>
            <div style={cellStyle}>
              <span style={{ fontSize: "13px" }}>주문서당</span>
              <input type="number" value={maxUsagePerOrder} onChange={e => setMaxUsagePerOrder(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "60px" }} min={1} />
              <span style={{ fontSize: "13px", color: C.muted }}>개 까지 사용가능</span>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>사용가능 결제수단 <RequiredBadge /></div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={paymentMethodLimit === "none"} onChange={() => setPaymentMethodLimit("none")} /> 제한없음
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={paymentMethodLimit === "specific"} onChange={() => setPaymentMethodLimit("specific")} /> 결제수단 선택
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 개별 이미지 설정 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>개별 이미지 설정</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>개별 이미지 설정</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={imageType === "default"} onChange={() => setImageType("default")} /> 기본 이미지 사용
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={imageType === "custom"} onChange={() => setImageType("custom")} /> 직접 업로드
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 부가 서비스 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>부가 서비스</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>로그인시 쿠폰발급 알림</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={notifyOnLogin} onChange={() => setNotifyOnLogin(true)} /> 사용함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!notifyOnLogin} onChange={() => setNotifyOnLogin(false)} /> 사용안함
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰발급 SMS 발송</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={sendSms} onChange={() => setSendSms(true)} /> 발송함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!sendSms} onChange={() => setSendSms(false)} /> 발송안함
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰발급 이메일 발송</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={sendEmail} onChange={() => setSendEmail(true)} /> 발송함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!sendEmail} onChange={() => setSendEmail(false)} /> 발송안함
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>쿠폰 상태</div>
            <div style={cellStyle}>
              <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                <option value="active">발급중</option>
                <option value="paused">발급중지</option>
                <option value="expired">만료</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <SaveBtn onClick={handleSave} loading={createCoupon.isPending || updateCoupon.isPending} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 쿠폰 발급/조회
// ═══════════════════════════════════════════════════════════════════════════════
function CouponListSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [editCoupon, setEditCoupon] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const coupons = trpc.adminExt.getCoupons.useQuery({ page, limit: 10, status: filterStatus || undefined });
  const deleteCoupon = trpc.adminExt.deleteCoupon.useMutation({
    onSuccess: () => { toast.success("쿠폰이 삭제되었습니다."); coupons.refetch(); setDeleteConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  if (editCoupon) {
    return (
      <div>
        <SectionHeader title="쿠폰 수정" action={<Btn variant="outline" onClick={() => setEditCoupon(null)}>← 목록으로</Btn>} />
        <CouponCreateForm editCoupon={editCoupon} onSuccess={() => { setEditCoupon(null); coupons.refetch(); }} />
      </div>
    );
  }

  const benefitTypeLabel = (t: string) => ({
    discount_amount: "할인금액", discount_rate: "할인율", point_amount: "적립금액",
    point_rate: "적립율", free_basic_shipping: "기본배송비할인",
    free_all_shipping: "전체배송비할인", instant_point: "즉시적립",
  }[t] ?? t);

  const issueTypeLabel = (t: string) => ({
    target: "대상자 지정", conditional_auto: "조건부 자동",
    customer_download: "고객 다운로드", periodic_auto: "정기 자동",
  }[t] ?? t);

  const statusLabel = (s: string) => ({
    active: { l: "발급중", bg: "#DCFCE7", c: "#166534" },
    paused: { l: "발급중지", bg: "#FEF3C7", c: "#B45309" },
    expired: { l: "만료", bg: "#F3F4F6", c: "#374151" },
  }[s] ?? { l: s, bg: "#F3F4F6", c: "#374151" });

  const data = coupons.data?.items ?? [];
  const total = coupons.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <SectionHeader title="쿠폰 발급/조회" action={<Btn onClick={() => onNavigate("promotion-coupon-create")}>+ 쿠폰 만들기</Btn>} />

      {/* 검색 필터 */}
      <div style={{ ...sectionBox, marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>혜택구분</div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
              <option value="">전체</option>
              <option value="active">발급중</option>
              <option value="paused">발급중지</option>
              <option value="expired">만료</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={() => { setPage(1); coupons.refetch(); }}
              style={{ padding: "7px 24px", background: "#374151", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div style={sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", color: C.muted }}>총 {total}개</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Btn size="sm" variant="danger" onClick={() => { if (deleteConfirm) deleteCoupon.mutate({ id: deleteConfirm }); }}>× 삭제</Btn>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: C.tableHead }}>
                {["쿠폰번호", "쿠폰명", "생성일자", "혜택", "사용기간", "발급수", "발급구분", "상태", "관리"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: C.muted }}>등록된 쿠폰이 없습니다.</td></tr>
              ) : data.map(c => {
                const st = statusLabel(c.status);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px", color: C.blue, fontFamily: "monospace", fontSize: "12px" }}>#{String(c.id).padStart(10, "0")}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDateTime(c.createdAt)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: "12px", color: C.muted }}>{benefitTypeLabel(c.benefitType)}</div>
                      <div style={{ fontWeight: 700, color: C.primary }}>
                        {c.benefitValue}{c.benefitType.includes("rate") ? "%" : "원"} 할인
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "12px", color: C.muted }}>
                      {c.periodType === "days_from_issue"
                        ? `발급일로부터 ${c.validDays}일 이내`
                        : c.startDate && c.endDate
                          ? `${fmtDate(c.startDate)} ~ ${fmtDate(c.endDate)}`
                          : "기간 없음"}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>{c.totalIssued}</td>
                    <td style={{ padding: "10px 12px" }}>{issueTypeLabel(c.issueType)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: st.bg, color: st.c, padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>{st.l}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Btn size="sm" variant="outline" onClick={() => setEditCoupon(c)}>수정</Btn>
                        <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(c.id)}>삭제</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: "6px 12px", border: `1px solid ${page === p ? C.primary : C.border}`, borderRadius: "6px", background: page === p ? C.primary : "#fff", color: page === p ? "#fff" : C.text, cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>›</button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>쿠폰 삭제</h3>
            <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>이 쿠폰을 삭제하시겠습니까?</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>취소</button>
              <button onClick={() => deleteCoupon.mutate({ id: deleteConfirm })} disabled={deleteCoupon.isPending}
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#991B1B", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {deleteCoupon.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 할인코드 등록
// ═══════════════════════════════════════════════════════════════════════════════
function DiscountCodeCreateForm({ onSuccess, editCode }: { onSuccess: () => void; editCode?: any }) {
  const isEdit = !!editCode;

  const [name, setName] = useState(editCode?.name ?? "");
  const [code, setCode] = useState(editCode?.code ?? "");
  const [discountRate, setDiscountRate] = useState(editCode?.discountRate ?? 0);
  const [truncateUnit, setTruncateUnit] = useState(editCode?.truncateUnit ?? 0);
  const [maxDiscountPerProduct, setMaxDiscountPerProduct] = useState(editCode?.maxDiscountPerProduct ?? "");
  const [startDate, setStartDate] = useState(editCode?.startDate ? new Date(editCode.startDate).toISOString().slice(0, 10) : "");
  const [endDate, setEndDate] = useState(editCode?.endDate ? new Date(editCode.endDate).toISOString().slice(0, 10) : "");
  const [applyScope, setApplyScope] = useState(editCode?.applyScope ?? "all");
  const [minOrderAmountType, setMinOrderAmountType] = useState(editCode?.minOrderAmountType ?? "none");
  const [minOrderAmount, setMinOrderAmount] = useState(editCode?.minOrderAmount ?? 0);
  const [maxUsageType, setMaxUsageType] = useState(editCode?.maxUsageType ?? "none");
  const [maxUsageCount, setMaxUsageCount] = useState(editCode?.maxUsageCount ?? "");
  const [targetType, setTargetType] = useState(editCode?.targetType ?? "none");
  const [samePersonLimitType, setSamePersonLimitType] = useState(editCode?.samePersonLimitType ?? "none");
  const [samePersonLimitCount, setSamePersonLimitCount] = useState(editCode?.samePersonLimitCount ?? "");

  const createCode = trpc.adminExt.createDiscountCode.useMutation({
    onSuccess: () => { toast.success("할인코드가 등록되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateCode = trpc.adminExt.updateDiscountCode.useMutation({
    onSuccess: () => { toast.success("할인코드가 수정되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error("할인코드 이름을 입력해 주세요."); return; }
    if (!code.trim()) { toast.error("입력코드를 입력해 주세요."); return; }
    const payload = {
      name, code, discountRate: Number(discountRate), truncateUnit: Number(truncateUnit),
      maxDiscountPerProduct: maxDiscountPerProduct ? Number(maxDiscountPerProduct) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      applyScope, minOrderAmountType, minOrderAmount: Number(minOrderAmount),
      maxUsageType, maxUsageCount: maxUsageCount ? Number(maxUsageCount) : undefined,
      targetType, samePersonLimitType,
      samePersonLimitCount: samePersonLimitCount ? Number(samePersonLimitCount) : undefined,
    };
    if (isEdit) {
      updateCode.mutate({ id: editCode.id, ...payload });
    } else {
      createCode.mutate(payload);
    }
  };

  return (
    <div>
      {/* 기본 정보 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>기본 정보</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>할인코드 이름 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="할인코드 이름 입력" style={{ ...inputStyle, maxWidth: "500px" }} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>입력코드 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="예: REAGE2024" style={{ ...inputStyle, maxWidth: "200px", fontFamily: "monospace" }} />
              <button onClick={() => {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                setCode(random);
              }} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                자동생성
              </button>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>혜택구분 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input type="number" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "80px" }} min={0} max={100} />
              <span style={{ fontSize: "13px" }}>% / 절사단위</span>
              <select value={truncateUnit} onChange={e => setTruncateUnit(Number(e.target.value))} style={selectStyle}>
                <option value={0}>절사안함</option>
                <option value={10}>10원</option>
                <option value={100}>100원</option>
                <option value={1000}>1000원</option>
              </select>
              <span style={{ fontSize: "13px" }}>/ 상품당 최대 할인금액</span>
              <input type="number" value={maxDiscountPerProduct} onChange={e => setMaxDiscountPerProduct(e.target.value)} placeholder="제한없음" style={{ ...inputStyle, maxWidth: "100px" }} min={0} />
              <span style={{ fontSize: "13px", color: C.muted }}>KRW</span>
            </div>
          </div>
        </div>
      </div>

      {/* 사용 정보 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>사용 정보</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>사용기간</div>
            <div style={cellStyle}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }} />
              <span style={{ fontSize: "13px" }}>~</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, maxWidth: "150px" }} />
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { l: "오늘", d: 0 }, { l: "3일", d: 3 }, { l: "7일", d: 7 },
                  { l: "1개월", d: 30 }, { l: "3개월", d: 90 }, { l: "1년", d: 365 },
                ].map(q => (
                  <button key={q.l} onClick={() => {
                    const s = new Date(); const e = new Date();
                    e.setDate(e.getDate() + q.d);
                    setStartDate(s.toISOString().slice(0, 10));
                    setEndDate(e.toISOString().slice(0, 10));
                  }} style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", background: "#fff", fontSize: "12px", cursor: "pointer" }}>
                    {q.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>적용범위</div>
            <div style={cellStyle}>
              {[
                { v: "all", l: "전체 상품" },
                { v: "specific", l: "특정 상품" },
                { v: "category", l: "특정 분류" },
              ].map(o => (
                <label key={o.v} style={radioLabel}>
                  <input type="radio" checked={applyScope === o.v} onChange={() => setApplyScope(o.v)} /> {o.l}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 제한 정보 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>제한 정보</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>사용가능 최소 주문금액</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={minOrderAmountType === "none"} onChange={() => setMinOrderAmountType("none")} /> 제한안함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={minOrderAmountType === "limited"} onChange={() => setMinOrderAmountType("limited")} /> 제한함
              </label>
              {minOrderAmountType === "limited" && (
                <>
                  <input type="number" value={minOrderAmount} onChange={e => setMinOrderAmount(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "120px" }} min={0} />
                  <span style={{ fontSize: "13px", color: C.muted }}>원 이상</span>
                </>
              )}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>최대사용 가능횟수</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={maxUsageType === "none"} onChange={() => setMaxUsageType("none")} /> 제한안함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={maxUsageType === "limited"} onChange={() => setMaxUsageType("limited")} /> 제한함
              </label>
              {maxUsageType === "limited" && (
                <>
                  <input type="number" value={maxUsageCount} onChange={e => setMaxUsageCount(e.target.value)} style={{ ...inputStyle, maxWidth: "100px" }} min={1} />
                  <span style={{ fontSize: "13px", color: C.muted }}>회</span>
                </>
              )}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>사용가능 대상</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={targetType === "none"} onChange={() => setTargetType("none")} /> 제한안함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={targetType === "member_only"} onChange={() => setTargetType("member_only")} /> 회원만
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>동일인 사용 가능횟수</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={samePersonLimitType === "none"} onChange={() => setSamePersonLimitType("none")} /> 제한안함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={samePersonLimitType === "limited"} onChange={() => setSamePersonLimitType("limited")} /> 제한함
              </label>
              {samePersonLimitType === "limited" && (
                <>
                  <input type="number" value={samePersonLimitCount} onChange={e => setSamePersonLimitCount(e.target.value)} style={{ ...inputStyle, maxWidth: "100px" }} min={1} />
                  <span style={{ fontSize: "13px", color: C.muted }}>회</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <SaveBtn onClick={handleSave} loading={createCode.isPending || updateCode.isPending} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 할인코드 조회
// ═══════════════════════════════════════════════════════════════════════════════
function DiscountCodeListSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [editCode, setEditCode] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const codes = trpc.adminExt.getDiscountCodes.useQuery({ page, limit: 10 });
  const deleteCode = trpc.adminExt.deleteDiscountCode.useMutation({
    onSuccess: () => { toast.success("할인코드가 삭제되었습니다."); codes.refetch(); setDeleteConfirm(null); },
    onError: (e) => toast.error(e.message),
  });

  if (editCode) {
    return (
      <div>
        <SectionHeader title="할인코드 수정" action={<Btn variant="outline" onClick={() => setEditCode(null)}>← 목록으로</Btn>} />
        <DiscountCodeCreateForm editCode={editCode} onSuccess={() => { setEditCode(null); codes.refetch(); }} />
      </div>
    );
  }

  const data = (codes.data?.items ?? []).filter(c =>
    (!searchName || c.name.includes(searchName)) &&
    (!searchCode || c.code.includes(searchCode.toUpperCase()))
  );
  const total = codes.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <SectionHeader title="할인코드 조회" action={<Btn onClick={() => onNavigate("promotion-discount-create")}>+ 할인코드 등록</Btn>} />

      {/* 검색 */}
      <div style={{ ...sectionBox, marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>할인코드 이름</div>
            <input value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="이름 검색" style={{ ...inputStyle, maxWidth: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>입력코드</div>
            <input value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="코드 검색" style={{ ...inputStyle, maxWidth: "100%" }} />
          </div>
          <button onClick={() => setPage(1)}
            style={{ padding: "7px 24px", background: "#374151", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            검색
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div style={sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", color: C.muted }}>총 {total}개</div>
          <Btn size="sm" variant="danger" onClick={() => { if (deleteConfirm) deleteCode.mutate({ id: deleteConfirm }); }}>× 삭제</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: C.tableHead }}>
                {["할인코드 이름", "입력코드", "할인율", "시작일", "종료일", "등록일", "적용범위", "잔여횟수/총횟수", "관리"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 결과가 존재하지 않습니다.</td></tr>
              ) : data.map(c => {
                const remaining = c.maxUsageCount ? c.maxUsageCount - c.usedCount : null;
                const applyScopeLabel = { all: "전체 상품", specific: "특정 상품", category: "특정 분류" }[c.applyScope] ?? c.applyScope;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", color: C.primary, fontWeight: 700 }}>{c.code}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>{c.discountRate}%</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(c.startDate)}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(c.endDate)}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(c.createdAt)}</td>
                    <td style={{ padding: "10px 12px" }}>{applyScopeLabel}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {remaining !== null ? `${remaining}/${c.maxUsageCount}` : "무제한"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Btn size="sm" variant="outline" onClick={() => setEditCode(c)}>수정</Btn>
                        <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(c.id)}>삭제</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: "6px 12px", border: `1px solid ${page === p ? C.primary : C.border}`, borderRadius: "6px", background: page === p ? C.primary : "#fff", color: page === p ? "#fff" : C.text, cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>›</button>
          </div>
        )}
      </div>

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>할인코드 삭제</h3>
            <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>이 할인코드를 삭제하시겠습니까?</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>취소</button>
              <button onClick={() => deleteCode.mutate({ id: deleteConfirm })} disabled={deleteCode.isPending}
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#991B1B", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {deleteCode.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 리마인드 Me
// ═══════════════════════════════════════════════════════════════════════════════
// ─── 리마인드 알림 유형별 자동 채움 기본값 ──────────────────────────────────────
const REMIND_TYPE_DEFAULTS: Record<string, {
  name: string;
  targetType: string;
  targetDays: number;
  sendToOptOut: boolean;
  sendToSpecial: boolean;
  sendToBad: boolean;
  channel: string;
  frequency: string;
  sendDayOfWeek: number;
  sendHour: number;
  senderName: string;
  senderEmail: string;
  emailSubject: string;
  emailBody: string;
  benefitEnabled: boolean;
  benefitDays: number;
  benefitTrigger: string;
}> = {
  viewed: {
    name: "최근 조회 상품 추천 알림",
    targetType: "all",
    targetDays: 30,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: true,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 5,
    sendHour: 16,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 최근 관심 있는 상품을 확인하세요",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n최근 쇼핑몰을 방문하셔서 관심을 가지고 계신 상품이 있습니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 최근 관심 있으신 상품을 추천해 드립니다.\n\n○ 상품\n{MATCH_D1}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 7,
    benefitTrigger: "order_complete",
  },
  purchased: {
    name: "재구매 유도 알림",
    targetType: "all",
    targetDays: 30,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: true,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 5,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 많이 구매한 상품과 관련있는 상품 정보를 알려드립니다",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n저번에 구매하신 상품과 관련된 상품을 추천해 드립니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 최근 관심 있으신 상품을 추천해 드립니다.\n\n○ 구매 관련 정보\n{RECOMMENDS}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 7,
    benefitTrigger: "order_complete",
  },
  cart: {
    name: "장바구니 이탈 알림",
    targetType: "cart_abandon",
    targetDays: 3,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: false,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 5,
    sendHour: 9,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 장바구니 상품을 확인해 주세요",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n장바구니에 담아두신 상품이 있어 안내해 드립니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 아직 결제하지 않은 상품이 있습니다.\n\n○ 장바구니 정보\n{BASKET}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 3,
    benefitTrigger: "order_complete",
  },
  wishlist: {
    name: "관심상품 정보 알림",
    targetType: "all",
    targetDays: 30,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: true,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 5,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 관심상품 가격이 변경되었습니다",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n최근 쇼핑몰에 관심을 가지고 계신 상품이 있습니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 최근 관심 있으신 상품을 추천해 드립니다.\n\n○ 관심상품 정보\n{WISHLIST}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 7,
    benefitTrigger: "order_complete",
  },
  point: {
    name: "보유 적립금 알림",
    targetType: "all",
    targetDays: 30,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: false,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 5,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 보유 적립금을 사용하세요",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n아직 쇼핑몰에서 사용하지 않은 적립금이 있습니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 보유하신 적립금을 안내해 드립니다.\n\n○ 보유 적립금 현황\n{REWARD_PNT}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 30,
    benefitTrigger: "order_complete",
  },
  coupon: {
    name: "만료 예정 쿠폰 알림",
    targetType: "all",
    targetDays: 7,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: false,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 2,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 만료예정 쿠폰을 알려드립니다",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n아직 사용하지 않은 쿠폰이 있어 안내해 드립니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님이 보유하신 쿠폰을 안내해 드립니다.\n\n○ 만료예정 쿠폰 정보\n{SEL_COUPON}\n{VALID}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: false,
    benefitDays: 7,
    benefitTrigger: "order_complete",
  },
  login: {
    name: "쇼핑몰 소식 알림",
    targetType: "all",
    targetDays: 90,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: false,
    channel: "email",
    frequency: "monthly",
    sendDayOfWeek: 1,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 쇼핑몰 소식을 알려드립니다",
    emailBody: `안녕하세요 {MALL_NAME} 입니다.\n쇼핑몰의 새로운 소식을 알려드립니다.\n\n{MEMBER_NAME}({MEMBER_ID}) 고객님께 새로운 소식을 전해드립니다.\n\n○ 새로운 소식\n{MALL_LINK}\n\n혜택 본 쇼핑몰에서 구매 시 쇼핑몰에서 발행한 고객님에게 {TYPE} 이에의 혜택이 제공됩니다.\n{BENEFIT}\n※ 혜택 제공 기간: {BENEFIT_DATE}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: true,
    benefitDays: 14,
    benefitTrigger: "order_complete",
  },
  dormant: {
    name: "휴면회원 전환 알림",
    targetType: "dormant_N_days",
    targetDays: 30,
    sendToOptOut: false,
    sendToSpecial: true,
    sendToBad: false,
    channel: "email",
    frequency: "weekly",
    sendDayOfWeek: 1,
    sendHour: 10,
    senderName: "REAGE",
    senderEmail: "no-reply@reage.co.kr",
    emailSubject: "[광고] {MALL_NAME} 휴면회원 전환에 대해 알려드립니다",
    emailBody: `안녕하세요 {MEMBER_NAME}({MEMBER_ID})님! {MALL_NAME} 입니다.\n\n회원님께서 쇼핑몰을 방문하신지 오랜 시간이 지났습니다.\n\n장기간 미접속 시 회원님의 계정은 휴면계정으로 전환될 수 있으며, 보유하신 적립금 및 쿠폰이 소멸될 수 있습니다.\n\n○ 휴면회원 전환 예정일: {DORMANT}\n\n지금 바로 로그인하시어 소중한 혜택을 유지하시기 바랍니다.\n\n{MALL_LINK}\n\n더이상 알림을 원하지 않으시면 {MEMBER_NAME}({MEMBER_ID}) 고객님의 계정으로 접속하시고 수신거부를 설정해 주세요.`,
    benefitEnabled: false,
    benefitDays: 7,
    benefitTrigger: "login",
  },
};

const REMIND_TYPES = [
  { v: "viewed", l: "최근 조회한 상품을 보여주고 구매를 유도", icon: "🖥️" },
  { v: "purchased", l: "상품을 구매한 회원에게 다른 상품을 추천", icon: "🛍️" },
  { v: "cart", l: "장바구니에 담긴 상품을 보여주고 구매를 유도", icon: "🛒" },
  { v: "wishlist", l: "관심상품에 담긴 상품을 보여주고 구매를 유도", icon: "❤️" },
  { v: "point", l: "적립금 보유중임을 알려주고 구매를 유도", icon: "💰" },
  { v: "coupon", l: "쿠폰 보유중임을 알려주고 구매를 유도", icon: "🎫" },
  { v: "login", l: "로그인한 지 오래된 회원에게 로그인을 유도", icon: "🔑" },
  { v: "dormant", l: "휴면예정임을 알려주고 로그인을 유도", icon: "😴" },
];

function RemindCreateForm({ onSuccess, editAlert }: { onSuccess: () => void; editAlert?: any }) {
  const isEdit = !!editAlert;

  const [alertType, setAlertType] = useState(editAlert?.alertType ?? "cart");
  const [name, setName] = useState(editAlert?.name ?? "");
  const [isActive, setIsActive] = useState(editAlert?.isActive ?? true);
  const [channel, setChannel] = useState(editAlert?.channel ?? "email");
  const [frequency, setFrequency] = useState(editAlert?.frequency ?? "weekly");
  const [sendDayOfWeek, setSendDayOfWeek] = useState(editAlert?.sendDayOfWeek ?? 5);
  const [sendHour, setSendHour] = useState(editAlert?.sendHour ?? 9);
  const [targetType, setTargetType] = useState(editAlert?.targetType ?? "all");
  const [targetDays, setTargetDays] = useState(editAlert?.targetDays ?? 30);
  const [sendToOptOut, setSendToOptOut] = useState(editAlert?.sendToOptOut ?? false);
  const [sendToSpecial, setSendToSpecial] = useState(editAlert?.sendToSpecial ?? true);
  const [sendToBad, setSendToBad] = useState(editAlert?.sendToBad ?? true);
  const [senderName, setSenderName] = useState(editAlert?.senderName ?? "");
  const [senderEmail, setSenderEmail] = useState(editAlert?.senderEmail ?? "");
  const [emailSubject, setEmailSubject] = useState(editAlert?.emailSubject ?? "");
  const [emailBody, setEmailBody] = useState(editAlert?.emailBody ?? "");
  const [benefitEnabled, setBenefitEnabled] = useState(editAlert?.benefitEnabled ?? false);
  const [benefitDays, setBenefitDays] = useState(editAlert?.benefitDays ?? 30);
  const [benefitTrigger, setBenefitTrigger] = useState(editAlert?.benefitTrigger ?? "order_complete");

  // 알림 유형 카드 선택 시 자동 채움 함수
  const handleAlertTypeChange = (typeValue: string) => {
    setAlertType(typeValue);
    // 수정 모드에서는 자동 채움 안 함
    if (isEdit) return;
    const defaults = REMIND_TYPE_DEFAULTS[typeValue];
    if (!defaults) return;
    setName(defaults.name);
    setTargetType(defaults.targetType);
    setTargetDays(defaults.targetDays);
    setSendToOptOut(defaults.sendToOptOut);
    setSendToSpecial(defaults.sendToSpecial);
    setSendToBad(defaults.sendToBad);
    setChannel(defaults.channel);
    setFrequency(defaults.frequency);
    setSendDayOfWeek(defaults.sendDayOfWeek);
    setSendHour(defaults.sendHour);
    setSenderName(defaults.senderName);
    setSenderEmail(defaults.senderEmail);
    setEmailSubject(defaults.emailSubject);
    setEmailBody(defaults.emailBody);
    setBenefitEnabled(defaults.benefitEnabled);
    setBenefitDays(defaults.benefitDays);
    setBenefitTrigger(defaults.benefitTrigger);
  };

  const createAlert = trpc.adminExt.createRemindAlert.useMutation({
    onSuccess: () => { toast.success("리마인드 알림이 등록되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });
  const updateAlert = trpc.adminExt.updateRemindAlert.useMutation({
    onSuccess: () => { toast.success("리마인드 알림이 수정되었습니다."); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error("알림명을 입력해 주세요."); return; }
    const payload = {
      name, alertType, isActive, channel, frequency,
      sendDayOfWeek: Number(sendDayOfWeek), sendHour: Number(sendHour),
      targetType, targetDays: Number(targetDays),
      sendToOptOut, sendToSpecial, sendToBad,
      senderName: senderName || undefined, senderEmail: senderEmail || undefined,
      emailSubject: emailSubject || undefined, emailBody: emailBody || undefined,
      benefitEnabled, benefitDays: Number(benefitDays), benefitTrigger,
      benefitContent: "coupon",
    };
    if (isEdit) {
      updateAlert.mutate({ id: editAlert.id, ...payload });
    } else {
      createAlert.mutate(payload);
    }
  };

  const days = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div>
      {/* 알림 유형 선택 카드 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>알림 유형 선택</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "12px" }}>
          {REMIND_TYPES.map(t => (
            <div key={t.v}
              onClick={() => handleAlertTypeChange(t.v)}
              style={{
                border: `2px solid ${alertType === t.v ? C.primary : C.border}`,
                borderRadius: "10px", padding: "16px 14px", cursor: "pointer",
                background: alertType === t.v ? "#FDF2F4" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{t.icon}</div>
              <div style={{ fontSize: "12px", color: C.text, lineHeight: 1.4 }}>{t.l}</div>
            </div>
          ))}
        </div>
        {!isEdit && (
          <div style={{ background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#795548", lineHeight: 1.6 }}>
            ℹ️ <strong>유형을 선택하면 알림명, 수신 대상, 발송 수단, 주기, 메일 제목/내용 등이 자동으로 채워집니다.</strong><br />
            효과적인 마케팅을 위하여 '언제 보낼 것인지, 어떤 회원에게 보낼 것인지' 등 상세 설정을 반드시 확인하시기 바랍니다.
          </div>
        )}
        {isEdit && (
          <div style={{ background: "#E3F2FD", border: "1px solid #90CAF9", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#1565C0", lineHeight: 1.6 }}>
            ✏️ 수정 모드에서는 유형 변경 시 자동 채움이 적용되지 않습니다. 직접 수정해 주세요.
          </div>
        )}
      </div>

      {/* 기본 설정 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>기본 설정</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>사용여부</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={isActive} onChange={() => setIsActive(true)} /> 사용함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!isActive} onChange={() => setIsActive(false)} /> 사용안함
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>알림명 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={name} onChange={e => setName(e.target.value.slice(0, 50))} placeholder="알림명 입력 (관리자용)" style={{ ...inputStyle, maxWidth: "400px" }} />
              <span style={{ fontSize: "12px", color: C.muted }}>[{name.length}/50]</span>
            </div>
          </div>
        </div>
      </div>

      {/* 수신 대상 설정 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>수신 대상 설정</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>수신 대상</div>
            <div style={cellStyle}>
              <select value={targetType} onChange={e => setTargetType(e.target.value)} style={selectStyle}>
                <option value="all">전체 회원</option>
                <option value="dormant_N_days">휴면 전환 예정</option>
                <option value="no_purchase">미구매 회원</option>
                <option value="cart_abandon">장바구니 이탈</option>
              </select>
              {targetType === "dormant_N_days" && (
                <>
                  <input type="number" value={targetDays} onChange={e => setTargetDays(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "70px" }} min={1} />
                  <span style={{ fontSize: "13px", color: C.muted }}>일 전 회원 대상으로 발송함</span>
                </>
              )}
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>수신거부회원 발송여부</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={sendToOptOut} onChange={() => setSendToOptOut(true)} /> 발송함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!sendToOptOut} onChange={() => setSendToOptOut(false)} /> 발송안함
              </label>
              <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>
                - 리마인드 알림은 광고성 정보이므로 수신거부 방법이 명시되어야 합니다.
              </span>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>특별관리회원 발송여부</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={sendToSpecial} onChange={() => setSendToSpecial(true)} /> 발송함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!sendToSpecial} onChange={() => setSendToSpecial(false)} /> 발송안함
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>불량회원 발송여부</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={sendToBad} onChange={() => setSendToBad(true)} /> 발송함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!sendToBad} onChange={() => setSendToBad(false)} /> 발송안함
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 수단 및 기간 설정 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>알림 수단 및 기간 설정</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>알림 수단</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={channel === "email"} onChange={() => setChannel("email")} /> 이메일
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={channel === "sms"} onChange={() => setChannel("sms")} /> SMS
              </label>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>알림 주기</div>
            <div style={cellStyle}>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} style={selectStyle}>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
              {frequency === "weekly" && (
                <>
                  <span style={{ fontSize: "13px" }}>기준</span>
                  <select value={sendDayOfWeek} onChange={e => setSendDayOfWeek(Number(e.target.value))} style={selectStyle}>
                    {days.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                  </select>
                </>
              )}
              <select value={sendHour} onChange={e => setSendHour(Number(e.target.value))} style={selectStyle}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}시</option>)}
              </select>
              <span style={{ fontSize: "13px", color: C.muted }}>에 발송</span>
            </div>
          </div>
        </div>
      </div>

      {/* 알림 내용 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>알림 내용</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>보내는 사람 이름 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="REAGE" style={{ ...inputStyle, maxWidth: "200px" }} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>보내는 이메일 주소 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="no-reply@reage.co.kr" style={{ ...inputStyle, maxWidth: "300px" }} />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={labelStyle}>메일 제목 <RequiredBadge /></div>
            <div style={cellStyle}>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="[광고] REAGE 쇼핑몰 소식을 알려드립니다." style={{ ...inputStyle, maxWidth: "500px" }} />
            </div>
          </div>
          <div style={{ ...rowStyle, minHeight: "120px" }}>
            <div style={labelStyle}>메일 내용</div>
            <div style={{ ...cellStyle, alignItems: "flex-start", paddingTop: "12px" }}>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="메일 내용을 입력하세요. {MEMBER_NAME}, {MALL_LINK} 등 변수를 사용할 수 있습니다."
                style={{ ...inputStyle, maxWidth: "600px", height: "120px", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 알림 수신 후 혜택 설정 */}
      <div style={sectionBox}>
        <div style={sectionTitle}>알림 수신 후 혜택 설정</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <div style={rowStyle}>
            <div style={labelStyle}>혜택 설정</div>
            <div style={cellStyle}>
              <label style={radioLabel}>
                <input type="radio" checked={benefitEnabled} onChange={() => setBenefitEnabled(true)} /> 사용함
              </label>
              <label style={radioLabel}>
                <input type="radio" checked={!benefitEnabled} onChange={() => setBenefitEnabled(false)} /> 사용안함
              </label>
            </div>
          </div>
          {benefitEnabled && (
            <>
              <div style={rowStyle}>
                <div style={labelStyle}>혜택 기간</div>
                <div style={cellStyle}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {[{ l: "내일", d: 1 }, { l: "3일", d: 3 }, { l: "7일", d: 7 }, { l: "1개월", d: 30 }].map(q => (
                      <button key={q.l} onClick={() => setBenefitDays(q.d)}
                        style={{ padding: "4px 8px", border: `1px solid ${benefitDays === q.d ? C.primary : C.border}`, borderRadius: "4px", background: benefitDays === q.d ? C.primary : "#fff", color: benefitDays === q.d ? "#fff" : C.text, fontSize: "12px", cursor: "pointer" }}>
                        {q.l}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={benefitDays} onChange={e => setBenefitDays(Number(e.target.value))} style={{ ...inputStyle, maxWidth: "70px" }} min={1} />
                  <span style={{ fontSize: "13px", color: C.muted }}>일</span>
                </div>
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>혜택 지급시점</div>
                <div style={cellStyle}>
                  <label style={radioLabel}>
                    <input type="radio" checked={benefitTrigger === "order_complete"} onChange={() => setBenefitTrigger("order_complete")} /> 주문완료 시
                  </label>
                  <label style={radioLabel}>
                    <input type="radio" checked={benefitTrigger === "login"} onChange={() => setBenefitTrigger("login")} /> 로그인 시
                  </label>
                </div>
              </div>
              <div style={rowStyle}>
                <div style={labelStyle}>혜택 내용</div>
                <div style={cellStyle}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>● 쿠폰 발급</span>
                  <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>
                    (쿠폰은 쿠폰 만들기에서 생성 후 연결하세요)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <SaveBtn onClick={handleSave} loading={createAlert.isPending || updateAlert.isPending} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 리마인드 Me 목록
// ═══════════════════════════════════════════════════════════════════════════════
function RemindListSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [editAlert, setEditAlert] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const alerts = trpc.adminExt.getRemindAlerts.useQuery({ page, limit: 10 });
  const deleteAlert = trpc.adminExt.deleteRemindAlert.useMutation({
    onSuccess: () => { toast.success("알림이 삭제되었습니다."); alerts.refetch(); setDeleteConfirm(null); },
    onError: (e) => toast.error(e.message),
  });
  const updateAlert = trpc.adminExt.updateRemindAlert.useMutation({
    onSuccess: () => { toast.success("상태가 변경되었습니다."); alerts.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (showCreate) {
    return (
      <div>
        <SectionHeader title="리마인드 알림 등록" action={<Btn variant="outline" onClick={() => setShowCreate(false)}>← 목록으로</Btn>} />
        <RemindCreateForm onSuccess={() => { setShowCreate(false); alerts.refetch(); }} />
      </div>
    );
  }

  if (editAlert) {
    return (
      <div>
        <SectionHeader title="리마인드 알림 수정" action={<Btn variant="outline" onClick={() => setEditAlert(null)}>← 목록으로</Btn>} />
        <RemindCreateForm editAlert={editAlert} onSuccess={() => { setEditAlert(null); alerts.refetch(); }} />
      </div>
    );
  }

  const data = alerts.data?.items ?? [];
  const total = alerts.data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const alertTypeLabel = (t: string) => { const found = REMIND_TYPES.find(r => r.v === t); return found ? found.l.slice(0, 20) + "..." : t; };
  const channelLabel = (c: string) => ({ email: "이메일", sms: "SMS" }[c] ?? c);
  const statusBadge = (isActive: boolean, endDate: Date | null | undefined) => {
    if (!isActive) return { l: "사용안함", bg: "#F3F4F6", c: "#374151" };
    if (endDate && new Date(endDate) < new Date()) return { l: "만료", bg: "#FEE2E2", c: "#991B1B" };
    return { l: "사용함", bg: "#DCFCE7", c: "#166534" };
  };

  return (
    <div>
      <SectionHeader title="리마인드 Me 알림 관리" />

      {/* 검색 필터 */}
      <div style={{ ...sectionBox, marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>알림 유형</div>
            <select style={{ ...selectStyle, width: "100%" }}>
              <option value="">전체</option>
              {REMIND_TYPES.map(t => <option key={t.v} value={t.v}>{t.icon} {t.l.slice(0, 20)}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>알림 수단</div>
            <select style={{ ...selectStyle, width: "100%" }}>
              <option value="">전체</option>
              <option value="email">이메일</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <button style={{ padding: "7px 24px", background: "#374151", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            검색
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div style={sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", color: C.muted }}>총 {total}개 등록</div>
          <Btn onClick={() => setShowCreate(true)}>+ 리마인드 알림 등록</Btn>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "8px" }}>
          <Btn size="sm" variant="danger" onClick={() => { if (deleteConfirm) deleteAlert.mutate({ id: deleteConfirm }); }}>× 삭제</Btn>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: C.tableHead }}>
                {["알림 유형", "알림 수단", "알림명", "등록일", "알림시작일", "알림종료일", "상태", "설정"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 내역이 없습니다.</td></tr>
              ) : data.map(a => {
                const st = statusBadge(a.isActive, a.endDate);
                const typeInfo = REMIND_TYPES.find(t => t.v === a.alertType);
                return (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ marginRight: "6px" }}>{typeInfo?.icon}</span>
                      <span style={{ fontSize: "12px" }}>{typeInfo?.l.slice(0, 15)}...</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{channelLabel(a.channel)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(a.createdAt)}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(a.startDate)}</td>
                    <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(a.endDate)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: st.bg, color: st.c, padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>{st.l}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Btn size="sm" variant="outline" onClick={() => setEditAlert(a)}>수정</Btn>
                        <Btn size="sm" variant={a.isActive ? "secondary" : "success"} onClick={() => updateAlert.mutate({ id: a.id, isActive: !a.isActive })}>
                          {a.isActive ? "중지" : "활성화"}
                        </Btn>
                        <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(a.id)}>삭제</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: "6px 12px", border: `1px solid ${page === p ? C.primary : C.border}`, borderRadius: "6px", background: page === p ? C.primary : "#fff", color: page === p ? "#fff" : C.text, cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", cursor: "pointer" }}>›</button>
          </div>
        )}

        {/* 도움말 */}
        <div style={{ marginTop: "20px", padding: "16px", background: "#F9F8F7", borderRadius: "8px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: C.text }}>❓ 리마인드 알림 관리 도움말</div>
          <div style={{ fontSize: "12px", color: C.muted, lineHeight: 1.8 }}>
            - 리마인드 알림은 설정한 다음 날부터 알림 주기대로 작동합니다.<br />
            - SMS 발송 서비스를 사용 안함으로 설정하더라도, SMS 잔여건수가 존재할 경우 SMS 알림이 발송됩니다.<br />
            - 삭제된 항목은 더 이상 리마인드 알림이 작동하지 않습니다.
          </div>
        </div>
      </div>

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px" }}>알림 삭제</h3>
            <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>이 리마인드 알림을 삭제하시겠습니까?</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>취소</button>
              <button onClick={() => deleteAlert.mutate({ id: deleteConfirm })} disabled={deleteAlert.isPending}
                style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: "#991B1B", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                {deleteAlert.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: PromotionSection
// ═══════════════════════════════════════════════════════════════════════════════
export default function PromotionSection({ subPage, onNavigate }: { subPage: string; onNavigate: (id: string) => void }) {
  if (subPage === "promotion-dashboard" || subPage === "promotion") {
    return <PromotionDashboard onNavigate={onNavigate} />;
  }
  if (subPage === "promotion-coupon-create") {
    return (
      <div>
        <SectionHeader title="쿠폰 만들기" action={<Btn variant="outline" onClick={() => onNavigate("promotion-coupon-list")}>← 쿠폰 목록</Btn>} />
        <CouponCreateForm onSuccess={() => onNavigate("promotion-coupon-list")} />
      </div>
    );
  }
  if (subPage === "promotion-coupon-list") {
    return <CouponListSection onNavigate={onNavigate} />;
  }
  if (subPage === "promotion-discount-create") {
    return (
      <div>
        <SectionHeader title="할인코드 등록" action={<Btn variant="outline" onClick={() => onNavigate("promotion-discount-list")}>← 할인코드 목록</Btn>} />
        <DiscountCodeCreateForm onSuccess={() => onNavigate("promotion-discount-list")} />
      </div>
    );
  }
  if (subPage === "promotion-discount-list") {
    return <DiscountCodeListSection onNavigate={onNavigate} />;
  }
  if (subPage === "promotion-remind") {
    return <RemindListSection onNavigate={onNavigate} />;
  }
  return <PromotionDashboard onNavigate={onNavigate} />;
}
