import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef } from "react";
import OrderDetailModal from "@/components/OrderDetailModal";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F5F2",
  white: "#FFFFFF",
  primary: "#6B0F1A",
  gold: "#C9A96E",
  border: "#E8E6E3",
  text: "#1A1412",
  muted: "#6B6B6B",
  sidebar: "#1A1412",
  sidebarText: "rgba(255,255,255,0.75)",
  sidebarActive: "#6B0F1A",
  blue: "#1D4ED8",
  green: "#166534",
  orange: "#B45309",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR");
}
function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#FEF3C7", color: "#B45309", label: "대기" },
    approved: { bg: "#DCFCE7", color: "#166534", label: "승인" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "반려" },
    paid:     { bg: "#DCFCE7", color: "#166534", label: "결제완료" },
    created:  { bg: "#EFF6FF", color: "#1D4ED8", label: "생성됨" },
    failed:   { bg: "#FEE2E2", color: "#991B1B", label: "실패" },
    cancelled:{ bg: "#F3F4F6", color: "#374151", label: "취소" },
    none:     { bg: "#F3F4F6", color: "#374151", label: "미제출" },
    professional: { bg: "#EDE9FE", color: "#5B21B6", label: "전문가" },
    consumer: { bg: "#F3F4F6", color: "#374151", label: "일반" },
    user:     { bg: "#F3F4F6", color: "#374151", label: "일반" },
    admin:    { bg: "#EDE9FE", color: "#5B21B6", label: "관리자" },
    active:   { bg: "#DCFCE7", color: "#166534", label: "사용함" },
    inactive: { bg: "#F3F4F6", color: "#374151", label: "사용안함" },
    published:{ bg: "#DCFCE7", color: "#166534", label: "게시됨" },
    draft:    { bg: "#FEF3C7", color: "#B45309", label: "임시저장" },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "999px",
      background: s.bg, color: s.color, fontSize: "11px", fontWeight: 700,
    }}>{s.label}</span>
  );
}

function ConfirmModal({
  open, title, message, onConfirm, onCancel, loading, danger,
}: {
  open: boolean; title: string; message: string; onConfirm: () => void;
  onCancel: () => void; loading?: boolean; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
        <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px", color: C.text }}>{title}</h3>
        <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px", lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: danger ? "#991B1B" : C.primary, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Structure ─────────────────────────────────────────────────────
type NavItem = { id: string; label: string; children?: { id: string; label: string }[] };

const NAV: NavItem[] = [
  {
    id: "dashboard", label: "대시보드",
  },
  {
    id: "order", label: "주문",
    children: [
      { id: "order-dashboard", label: "주문 대시보드" },
      { id: "order-all", label: "전체 주문 조회" },
      { id: "order-unpaid", label: "입금전 관리" },
      { id: "order-preparing", label: "배송 준비중 관리" },
      { id: "order-waiting", label: "배송 대기 관리" },
      { id: "order-shipping", label: "배송 중 관리" },
      { id: "order-done", label: "배송 완료 조회" },
      { id: "order-cancel-pre", label: "입금전 취소 관리" },
      { id: "order-cancel", label: "취소 관리" },
      { id: "order-exchange", label: "교환 관리" },
      { id: "order-return", label: "반품 관리" },
      { id: "order-refund", label: "환불 관리" },
      { id: "order-card-cancel", label: "카드 취소 조회" },
      { id: "order-admin-refund", label: "관리자 환불 관리" },
    ],
  },
  {
    id: "product", label: "상품",
    children: [
      { id: "product-dashboard", label: "상품 대시보드" },
      { id: "product-list", label: "상품 목록" },
      { id: "product-register", label: "상품 등록" },
      { id: "product-manage", label: "상품 관리" },
      { id: "product-category", label: "분류 관리" },
      { id: "product-stock", label: "재고 관리" },
    ],
  },
  {
    id: "customer", label: "고객",
    children: [
      { id: "customer-dashboard", label: "고객 대시보드" },
      { id: "customer-search", label: "회원 조회" },
      { id: "customer-manage", label: "회원 관리" },
      { id: "customer-verification", label: "사업자 인증" },
      { id: "customer-membership", label: "멤버십 관리" },
    ],
  },
  {
    id: "board", label: "게시판",
    children: [
      { id: "board-dashboard", label: "게시판 대시보드" },
      { id: "board-review", label: "후기 관리" },
      { id: "board-gallery", label: "갤러리 관리" },
      { id: "board-instructor", label: "인증강사 관리" },
      { id: "board-magazine", label: "매거진 관리" },
    ],
  },
  {
    id: "stats", label: "통계",
    children: [
      { id: "stats-dashboard", label: "통계 대시보드" },
      { id: "stats-sales", label: "매출 분석" },
      { id: "stats-product", label: "상품 분석" },
      { id: "stats-customer", label: "고객 분석" },
      { id: "stats-access", label: "접속 통계" },
    ],
  },
  {
    id: "popup", label: "팝업",
    children: [
      { id: "popup-list", label: "팝업 목록" },
      { id: "popup-register", label: "팝업 등록" },
    ],
  },
];

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV.forEach(n => { if (n.children) init[n.id] = false; }); // 초기상태: 모두 닫힐
    return init;
  });

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <nav style={{
      width: "220px", minWidth: "220px", background: C.sidebar, height: "100vh",
      position: "sticky", top: 0, overflowY: "auto", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ color: "#fff", fontSize: "20px", fontWeight: 800, letterSpacing: "0.1em" }}>REAGE</span>
        </a>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "4px" }}>관리자</div>
      </div>

      <div style={{ flex: 1, padding: "8px 0" }}>
        {NAV.map(item => (
          <div key={item.id}>
            {!item.children ? (
              <button
                onClick={() => onSelect(item.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  background: active === item.id ? C.sidebarActive : "transparent",
                  color: active === item.id ? "#fff" : C.sidebarText,
                  border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
                <span style={{ fontSize: "16px" }}>{item.id === "dashboard" ? "🏠" : ""}</span>
                {item.label}
              </button>
            ) : (
              <>
                <button
                  onClick={() => toggle(item.id)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 16px",
                    background: "transparent", color: "#fff",
                    border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    letterSpacing: "0.05em", opacity: 0.9,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{
                      item.id === "order" ? "🛒" :
                      item.id === "product" ? "📦" :
                      item.id === "customer" ? "👤" :
                      item.id === "board" ? "📋" :
                      item.id === "stats" ? "📊" :
                      item.id === "popup" ? "🎯" : ""
                    }</span>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "10px", opacity: 0.6 }}>{expanded[item.id] ? "▲" : "▼"}</span>
                </button>
                {expanded[item.id] && item.children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onSelect(child.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 16px 8px 36px",
                      background: active === child.id ? C.sidebarActive : "transparent",
                      color: active === child.id ? "#fff" : C.sidebarText,
                      border: "none", cursor: "pointer", fontSize: "12px",
                    }}
                  >
                    {child.label}
                  </button>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ─── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
      <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: color ?? C.text }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9F8F7" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} style={{ padding: "40px", textAlign: "center", color: C.muted }}>데이터가 없습니다.</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: C.text }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "검색..."}
      style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "260px", outline: "none" }}
    />
  );
}

// ─── Filter Select ─────────────────────────────────────────────────────────────
function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", background: "#fff", cursor: "pointer" }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Btn ───────────────────────────────────────────────────────────────────────
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
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: pad, borderRadius: "8px", border, background: bg, color, fontSize: size === "sm" ? "12px" : "13px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardSection() {
  const [days, setDays] = useState(30);
  const summaryQuery = trpc.admin.dashboard.useQuery();
  const chartsQuery = trpc.admin.dashboardCharts.useQuery({ days });
  const summary = summaryQuery.data;
  const orderStats = { data: chartsQuery.data?.orderStats };
  const signupStats = { data: chartsQuery.data?.signupStats };
  const verStats = { data: chartsQuery.data?.verificationStats };

  const COLORS = [C.orange, C.green, "#991B1B"];

  return (
    <div>
      <SectionHeader title="대시보드" action={
        <FilterSelect value={String(days)} onChange={v => setDays(Number(v))} options={[
          { value: "7", label: "최근 7일" }, { value: "14", label: "최근 14일" },
          { value: "30", label: "최근 30일" }, { value: "60", label: "최근 60일" },
          { value: "90", label: "최근 90일" },
        ]} />
      } />

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <SummaryCard label="대기 중 인증" value={summary?.pendingVerifications ?? "—"} color={C.orange} />
        <SummaryCard label="전체 회원" value={summary?.totalUsers ?? "—"} />
        <SummaryCard label="오늘 주문" value={summary?.todayOrders ?? "—"} color={C.green} />
        <SummaryCard label="누적 매출" value={summary ? krw(summary.totalPaidAmount) : "—"} color={C.primary} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>일별 주문 수</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={orderStats.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="orderCount" stroke={C.primary} fill={C.primary} fillOpacity={0.15} name="주문 수" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={orderStats.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 10000).toFixed(0) + "만"} />
              <Tooltip formatter={(v: number) => krw(v)} />
              <Line type="monotone" dataKey="revenue" stroke={C.gold} strokeWidth={2} dot={false} name="매출" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>신규 가입자</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={signupStats.data ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="signupCount" fill={C.blue} name="가입자" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>사업자 인증 현황</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[
                { name: "대기", value: verStats.data?.pending ?? 0 },
                { name: "승인", value: verStats.data?.approved ?? 0 },
                { name: "반려", value: verStats.data?.rejected ?? 0 },
              ]} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ORDER
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Shipping Status Badge ────────────────────────────────────────────────────
function ShippingBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending_payment: { bg: "#FEF3C7", color: "#B45309", label: "입금전" },
    ready:           { bg: "#DBEAFE", color: "#1D4ED8", label: "배송준비" },
    hold:            { bg: "#FEE2E2", color: "#991B1B", label: "배송보류" },
    shipping:        { bg: "#D1FAE5", color: "#065F46", label: "배송중" },
    delivered:       { bg: "#DCFCE7", color: "#166534", label: "배송완료" },
    none:            { bg: "#F3F4F6", color: "#374151", label: "해당없음" },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 700 }}>{s.label}</span>;
}

// ─── CS Status Badge ──────────────────────────────────────────────────────────
function CsBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    requested:  { bg: "#FEF3C7", color: "#B45309", label: "신청" },
    processing: { bg: "#DBEAFE", color: "#1D4ED8", label: "처리중" },
    completed:  { bg: "#DCFCE7", color: "#166534", label: "완료" },
    rejected:   { bg: "#FEE2E2", color: "#991B1B", label: "거부/철회" },
    ready:      { bg: "#D1FAE5", color: "#065F46", label: "준비" },
    hold:       { bg: "#F3F4F6", color: "#374151", label: "보류" },
    pending:    { bg: "#FEF3C7", color: "#B45309", label: "환불전" },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 700 }}>{s.label}</span>;
}

// ─── Shipping Detail Modal ────────────────────────────────────────────────────
function ShippingDetailModal({ order, onClose, onSave }: { order: any; onClose: () => void; onSave: (data: any) => void }) {
  const [form, setForm] = useState({
    shippingStatus: order?.shippingStatus ?? "ready",
    courierName: order?.courierName ?? "",
    trackingNumber: order?.trackingNumber ?? "",
    recipientName: order?.recipientName ?? "",
    recipientPhone: order?.recipientPhone ?? "",
    shippingAddress: order?.shippingAddress ?? "",
    shippingMemo: order?.shippingMemo ?? "",
    adminMemo: order?.adminMemo ?? "",
  });
  if (!order) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "17px", fontWeight: 800 }}>배송 정보 관리</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: "12px", fontSize: "13px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>주문번호</span><span style={{ fontFamily: "monospace" }}>{order.orderId}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>주문명</span><span>{order.orderName}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>결제금액</span><span style={{ fontWeight: 700 }}>{krw(order.totalAmount)}</span></div>
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted }}>배송 상태
            <select value={form.shippingStatus} onChange={e => setForm(f => ({ ...f, shippingStatus: e.target.value }))}
              style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }}>
              <option value="pending_payment">입금전</option>
              <option value="ready">배송준비중</option>
              <option value="hold">배송보류</option>
              <option value="shipping">배송중</option>
              <option value="delivered">배송완료</option>
            </select>
          </label>
          {["courierName:운송사", "trackingNumber:송장번호", "recipientName:수령인이름", "recipientPhone:수령인연락처", "shippingAddress:배송주소", "shippingMemo:배송메모", "adminMemo:관리자메모"].map(kv => {
            const [key, label] = kv.split(":");
            return (
              <label key={key} style={{ fontSize: "12px", fontWeight: 600, color: C.muted }}>{label}
                <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }} />
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Btn size="sm" onClick={() => onSave(form)}>저장</Btn>
          <Btn size="sm" variant="outline" onClick={onClose}>닫기</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Order Dashboard ─────────────────────────────────────────────────────────
function OrderDashboard() {
  const dashboard = trpc.admin.dashboard.useQuery();
  const d = dashboard.data;
  return (
    <div>
      <SectionHeader title="주문 대시보드" />
      {/* 실시간 매출 현황 */}
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px", color: C.text }}>실시간 매출 현황</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600 }}>구분</th>
              <th style={{ padding: "8px 12px", textAlign: "right", color: C.muted, fontWeight: 600 }}>오늘</th>
              <th style={{ padding: "8px 12px", textAlign: "right", color: C.muted, fontWeight: 600 }}>이번 달</th>
              <th style={{ padding: "8px 12px", textAlign: "right", color: C.muted, fontWeight: 600 }}>바로가기</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px" }}>총 주문 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>{krw(d?.todayRevenue ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.todayOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right", color: C.primary, fontWeight: 700 }}>{krw(d?.totalPaidAmount ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.totalOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right" }}><Btn size="sm" variant="outline">주문조회</Btn></td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* 오늘의 할 일 */}
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>오늘의 할 일</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
          {[
            { label: "입금전", value: d?.pendingOrders ?? 0, color: C.orange },
            { label: "배송준비중", value: d?.readyToShip ?? 0, color: C.blue },
            { label: "배송대기", value: 0, color: C.muted },
            { label: "배송중", value: d?.shippingOrders ?? 0, color: C.green },
            { label: "취소신청", value: d?.cancelRequested ?? 0, color: C.primary },
            { label: "교환신청", value: d?.exchangeRequested ?? 0, color: C.primary },
            { label: "반품신청", value: d?.returnRequested ?? 0, color: C.primary },
            { label: "환불전", value: d?.refundPending ?? 0, color: C.primary },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: item.value > 0 ? item.color : C.muted }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      {/* 오늘 처리한 일 */}
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>오늘 처리한 일</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
          {[
            { label: "배송완료", value: d?.deliveredOrders ?? 0 },
            { label: "취소완료", value: d?.cancelCompleted ?? 0 },
            { label: "교환완료", value: d?.exchangeCompleted ?? 0 },
            { label: "반품완료", value: d?.returnCompleted ?? 0 },
            { label: "환불완료", value: d?.refundCompleted ?? 0 },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: C.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Order Section ────────────────────────────────────────────────────────────
function OrderSection({ subPage }: { subPage: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [csTab, setCsTab] = useState("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  // ─── Shipping status pages ──────────────────────────────────────────────────
  const shippingStatusMap: Record<string, "pending_payment" | "ready" | "hold" | "shipping" | "delivered"> = {
    "order-preparing": "ready",
    "order-waiting": "hold",
    "order-shipping": "shipping",
    "order-done": "delivered",
  };
  const isShippingPage = subPage in shippingStatusMap;
  const shippingStatus = shippingStatusMap[subPage];

  const shippingOrders = trpc.admin.ordersByShippingStatus.useQuery(
    { shippingStatus: shippingStatus ?? "ready", page: 1, limit: 50 },
    { enabled: isShippingPage }
  );

  const updateShipping = trpc.admin.updateShipping.useMutation({
    onSuccess: () => { toast.success("배송 정보가 저장되었습니다."); shippingOrders.refetch(); setShippingModalOpen(false); },
  });

  // ─── CS pages ────────────────────────────────────────────────────────────────
  const isCsPage = ["order-cancel-pre", "order-cancel", "order-exchange", "order-return", "order-refund", "order-card-cancel", "order-admin-refund"].includes(subPage);

  const cancellations = trpc.admin.cancellations.useQuery(
    { cancelType: subPage === "order-cancel-pre" ? "pre_payment" : subPage === "order-cancel" ? "post_payment" : undefined, page: 1, limit: 50 },
    { enabled: ["order-cancel-pre", "order-cancel"].includes(subPage) }
  );
  const exchanges = trpc.admin.exchanges.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-exchange" });
  const returns = trpc.admin.returns.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-return" });
  const refunds = trpc.admin.refunds.useQuery({ page: 1, limit: 50 }, { enabled: ["order-refund", "order-admin-refund"].includes(subPage) });
  const cardCancellations = trpc.admin.cardCancellations.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-card-cancel" });

  const updateCancellation = trpc.admin.updateCancellation.useMutation({ onSuccess: () => { toast.success("업데이트 완료"); cancellations.refetch(); } });
  const updateExchange = trpc.admin.updateExchange.useMutation({ onSuccess: () => { toast.success("업데이트 완료"); exchanges.refetch(); } });
  const updateReturn = trpc.admin.updateReturn.useMutation({ onSuccess: () => { toast.success("업데이트 완료"); returns.refetch(); } });
  const updateRefund = trpc.admin.updateRefund.useMutation({ onSuccess: () => { toast.success("업데이트 완료"); refunds.refetch(); } });

  // ─── General order pages ─────────────────────────────────────────────────────
  const effectiveStatus = subPage === "order-unpaid" ? "created" : statusFilter !== "all" ? statusFilter : undefined;
  const orders = trpc.admin.searchOrders.useQuery(
    { search: search || undefined, status: effectiveStatus as any, page: 1, limit: 50 },
    { enabled: !isShippingPage && !isCsPage }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => { toast.success("주문 상태가 변경되었습니다."); orders.refetch(); },
  });
  const cancelOrder = trpc.order.cancel.useMutation({
    onSuccess: () => { toast.success("결제가 취소되었습니다."); orders.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null); // orderId

  // ─── Order Dashboard ─────────────────────────────────────────────────────────
  if (subPage === "order-dashboard") {
    return <OrderDashboard />;
  }

  // ─── Shipping pages ───────────────────────────────────────────────────────────
  const shippingTitleMap: Record<string, string> = {
    "order-preparing": "배송 준비중 관리",
    "order-waiting": "배송 대기 관리",
    "order-shipping": "배송 중 관리",
    "order-done": "배송 완료 조회",
  };

  if (isShippingPage) {
    const rows = shippingOrders.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title={shippingTitleMap[subPage]} />
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["주문일/주문번호", "주문자", "송장번호", "운송정보", "상품명", "결제금액", "배송상태", "관리"]}
            rows={rows.map((o: any) => [
              <div><div style={{ fontSize: "11px", color: C.muted }}>{fmtDateTime(o.createdAt)}</div><div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o.orderId}</div></div>,
              <span style={{ fontWeight: 600 }}>{o.orderName ?? "—"}</span>,
              <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{o.trackingNumber ?? "—"}</span>,
              <span>{o.courierName ?? "—"}</span>,
              <span>{o.orderName ?? "—"}</span>,
              krw(o.totalAmount),
              <ShippingBadge status={o.shippingStatus ?? "none"} />,
              <Btn size="sm" variant="outline" onClick={() => { setSelectedOrder(o); setShippingModalOpen(true); }}>송장입력</Btn>,
            ])}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 주문내역이 없습니다.</div>}
        </div>
        {shippingModalOpen && selectedOrder && (
          <ShippingDetailModal
            order={selectedOrder}
            onClose={() => setShippingModalOpen(false)}
            onSave={(data) => updateShipping.mutate({ orderId: selectedOrder.orderId, ...data })}
          />
        )}
      </div>
    );
  }

  // ─── CS pages ────────────────────────────────────────────────────────────────
  if (["order-cancel-pre", "order-cancel"].includes(subPage)) {
    const title = subPage === "order-cancel-pre" ? "입금전 취소 관리" : "취소 관리";
    const rows = cancellations.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title={title} />
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["전체", "취소신청", "취소처리중", "취소완료", "접수거부/철회"].map((t, i) => {
            const vals = ["all", "requested", "processing", "completed", "rejected"];
            return <button key={t} onClick={() => setCsTab(vals[i])} style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === vals[i] ? C.primary : C.border}`, background: csTab === vals[i] ? C.primary : "#fff", color: csTab === vals[i] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t}</button>;
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["취소신청일", "주문번호/취소번호", "주문자", "상품명/옵션", "취소금액", "결제수단", "주문상태", "취소처리", "메모"]}
            rows={(rows.filter((r: any) => csTab === "all" || r.orderCancellations?.status === csTab)).map((r: any) => {
              const c = r.orderCancellations;
              const o = r.orders;
              return [
                fmtDate(c?.createdAt),
                <div><div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o?.orderId ?? "—"}</div></div>,
                <span>{o?.orderName ?? "—"}</span>,
                <span>{o?.orderName ?? "—"}</span>,
                krw(c?.cancelAmount),
                <span>{o?.paymentMethod ?? "—"}</span>,
                <CsBadge status={c?.status ?? "requested"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  {c?.status === "requested" && <Btn size="sm" onClick={() => updateCancellation.mutate({ id: c.id, status: "processing" })}>취소처리</Btn>}
                  {c?.status === "processing" && <Btn size="sm" onClick={() => updateCancellation.mutate({ id: c.id, status: "completed" })}>취소완료</Btn>}
                </div>,
                <span style={{ fontSize: "11px", color: C.muted }}>{c?.adminNote ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 주문내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  if (subPage === "order-exchange") {
    const rows = exchanges.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title="교환 관리" />
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["전체", "교환신청", "교환처리중", "교환완료", "접수거부/철회"].map((t, i) => {
            const vals = ["all", "requested", "processing", "completed", "rejected"];
            return <button key={t} onClick={() => setCsTab(vals[i])} style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === vals[i] ? C.primary : C.border}`, background: csTab === vals[i] ? C.primary : "#fff", color: csTab === vals[i] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t}</button>;
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["교환신청일", "주문번호/교환번호", "주문자", "상품명/옵션", "주문상태", "교환처리", "메모"]}
            rows={(rows.filter((r: any) => csTab === "all" || r.orderExchanges?.status === csTab)).map((r: any) => {
              const ex = r.orderExchanges;
              const o = r.orders;
              return [
                fmtDate(ex?.createdAt),
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o?.orderId ?? "—"}</div>,
                <span>{o?.orderName ?? "—"}</span>,
                <span>{o?.orderName ?? "—"}</span>,
                <CsBadge status={ex?.status ?? "requested"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  {ex?.status === "requested" && <Btn size="sm" onClick={() => updateExchange.mutate({ id: ex.id, status: "processing" })}>교환처리</Btn>}
                  {ex?.status === "processing" && <Btn size="sm" onClick={() => updateExchange.mutate({ id: ex.id, status: "completed" })}>교환완료</Btn>}
                </div>,
                <span style={{ fontSize: "11px", color: C.muted }}>{ex?.adminMemo ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 주문내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  if (subPage === "order-return") {
    const rows = returns.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title="반품 관리" />
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["전체", "반품신청", "반품처리중", "반품완료", "접수거부/철회"].map((t, i) => {
            const vals = ["all", "requested", "processing", "completed", "rejected"];
            return <button key={t} onClick={() => setCsTab(vals[i])} style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === vals[i] ? C.primary : C.border}`, background: csTab === vals[i] ? C.primary : "#fff", color: csTab === vals[i] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t}</button>;
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["반품신청일", "주문번호/취소번호", "주문자", "상품명/옵션", "운송정보", "주문상태", "반품처리", "메모"]}
            rows={(rows.filter((r: any) => csTab === "all" || r.orderReturns?.status === csTab)).map((r: any) => {
              const ret = r.orderReturns;
              const o = r.orders;
              return [
                fmtDate(ret?.createdAt),
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o?.orderId ?? "—"}</div>,
                <span>{o?.orderName ?? "—"}</span>,
                <span>{o?.orderName ?? "—"}</span>,
                <span style={{ fontSize: "11px" }}>{ret?.returnCourierName ? `${ret.returnCourierName} ${ret.returnTrackingNumber ?? ""}` : "—"}</span>,
                <CsBadge status={ret?.status ?? "requested"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  {ret?.status === "requested" && <Btn size="sm" onClick={() => updateReturn.mutate({ id: ret.id, status: "processing" })}>반품처리</Btn>}
                  {ret?.status === "processing" && <Btn size="sm" onClick={() => updateReturn.mutate({ id: ret.id, status: "completed" })}>반품완료</Btn>}
                </div>,
                <span style={{ fontSize: "11px", color: C.muted }}>{ret?.adminMemo ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 주문내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  if (["order-refund", "order-admin-refund"].includes(subPage)) {
    const title = subPage === "order-admin-refund" ? "관리자 환불 관리" : "환불 관리";
    const rows = refunds.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title={title} />
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["전체", "환불전", "환불완료", "환불보류", "환불철회"].map((t, i) => {
            const vals = ["all", "pending", "completed", "hold", "rejected"];
            return <button key={t} onClick={() => setCsTab(vals[i])} style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === vals[i] ? C.primary : C.border}`, background: csTab === vals[i] ? C.primary : "#fff", color: csTab === vals[i] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t}</button>;
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["주문일", "환불접수일", "주문번호/환불번호", "주문자", "총수량", "총환불액", "사용한적립금/예치금", "결제수단", "환불수단", "처리상태", "환불처리", "메모"]}
            rows={(rows.filter((r: any) => csTab === "all" || r.orderRefunds?.status === csTab)).map((r: any) => {
              const ref = r.orderRefunds;
              const o = r.orders;
              return [
                fmtDate(o?.createdAt),
                fmtDate(ref?.createdAt),
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o?.orderId ?? "—"}</div>,
                <span>{o?.orderName ?? "—"}</span>,
                "—",
                krw(ref?.refundAmount),
                "0/0",
                <span>{o?.paymentMethod ?? "—"}</span>,
                <span>{ref?.refundMethod ?? "—"}</span>,
                <CsBadge status={ref?.status ?? "pending"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  {ref?.status === "pending" && <Btn size="sm" onClick={() => updateRefund.mutate({ id: ref.id, status: "completed", completedAt: new Date() })}>환불완료</Btn>}
                </div>,
                <span style={{ fontSize: "11px", color: C.muted }}>{ref?.adminNote ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 환불내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  if (subPage === "order-card-cancel") {
    const rows = cardCancellations.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title="카드 취소 조회" />
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["결제일(취소일)", "주문번호", "주문자", "TID(거래번호)", "취소금액", "취소구분", "취소처리자", "메모"]}
            rows={rows.map((r: any) => {
              const cc = r.cardCancellations;
              const o = r.orders;
              return [
                fmtDate(cc?.cancelledAt),
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{o?.orderId ?? "—"}</div>,
                <span>{o?.orderName ?? "—"}</span>,
                <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{cc?.tid ?? "—"}</span>,
                krw(cc?.cancelAmount),
                <span>{cc?.cancelType === "full" ? "전체취소" : "부분취소"}</span>,
                <span>{cc?.cancelledBy ?? "—"}</span>,
                <span style={{ fontSize: "11px", color: C.muted }}>{cc?.adminMemo ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 카드취소 내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  // ─── General order list ───────────────────────────────────────────────────────
  const title = subPage === "order-all" ? "전체 주문 조회"
    : subPage === "order-unpaid" ? "입금전 관리" : "주문 관리";

  return (
    <div>
      <SectionHeader title={title} />
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="주문번호, 이메일 검색" />
        {subPage === "order-all" && (
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: "all", label: "전체 상태" },
            { value: "created", label: "입금전" },
            { value: "paid", label: "결제완료" },
            { value: "failed", label: "실패" },
            { value: "cancelled", label: "취소" },
          ]} />
        )}
      </div>
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["주문번호", "회원", "주문명", "금액", "결제상태", "배송상태", "결제일", "관리"]}
          rows={(orders.data?.items ?? []).map((item: any) => {
            const o = item.o;
            return [
              <button
                style={{ fontFamily: "monospace", fontSize: "11px", color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                onClick={() => setDetailOrderId(o.orderId)}
              >{o.orderId}</button>,
              <div><div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div><div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div></div>,
              o.orderName ?? "—",
              krw(o.totalAmount),
              <StatusBadge status={o.status} />,
              <ShippingBadge status={o.shippingStatus ?? "none"} />,
              fmtDate(o.paidAt),
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn size="sm" variant="outline" onClick={() => setDetailOrderId(o.orderId)}>상세</Btn>
                {o.status !== "cancelled" && (
                  <Btn size="sm" variant="danger" onClick={() => setCancelConfirm(o.orderId)}>취소</Btn>
                )}
              </div>,
            ];
          })}
        />
      </div>
      {detailOrderId && (
        <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />
      )}
      {cancelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px 24px", maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px", color: "#1a1a1a" }}>결제 취소 확인</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>주문번호 <strong>{cancelConfirm}</strong>의 결제를 취소하시겠습니까?<br />결제완료 주문은 토스페이먼츠 취소 API를 통해 환불 처리됩니다.</p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setCancelConfirm(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: "14px" }}>아니오</button>
              <button
                onClick={() => { cancelOrder.mutate({ orderId: cancelConfirm, cancelReason: "관리자 취소" }); setCancelConfirm(null); }}
                disabled={cancelOrder.isPending}
                style={{ padding: "8px 16px", borderRadius: "8px", background: "#DC2626", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              >
                {cancelOrder.isPending ? "취소 중..." : "취소 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
function ProductSection({ subPage }: { subPage: string }) {
  const products = trpc.admin.allProducts.useQuery();
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { toast.success("상품이 수정되었습니다."); products.refetch(); setEditId(null); setConfirmOpen(false); },
  });

  const title = subPage === "product-dashboard" ? "상품 대시보드"
    : subPage === "product-list" ? "상품 목록"
    : subPage === "product-register" ? "상품 등록"
    : subPage === "product-manage" ? "상품 관리"
    : subPage === "product-category" ? "분류 관리"
    : subPage === "product-stock" ? "재고 관리" : "상품 관리";

  if (subPage === "product-dashboard") {
    return (
      <div>
        <SectionHeader title="상품 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="전체 상품" value={products.data?.length ?? "—"} />
          <SummaryCard label="노출 중" value={products.data?.filter((p: any) => p.visible).length ?? "—"} color={C.green} />
          <SummaryCard label="전문가 전용" value={products.data?.filter((p: any) => p.isProOnly).length ?? "—"} color={C.primary} />
        </div>
      </div>
    );
  }

  if (subPage === "product-register") {
    return (
      <div>
        <SectionHeader title="상품 등록" />
        <div style={{ background: C.white, borderRadius: "12px", padding: "24px", border: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: "14px" }}>현재 상품 등록은 DB 시드 방식으로 관리됩니다. 상품 가격/노출 변경은 상품 관리 탭을 이용해 주세요.</p>
        </div>
      </div>
    );
  }

  if (subPage === "product-stock") {
    return (
      <div>
        <SectionHeader title="재고 관리" />
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["상품명", "현재 재고", "상태"]}
            rows={(products.data ?? []).map((p: any) => [
              p.name,
              <span style={{ fontWeight: 700 }}>{p.stock}</span>,
              <StatusBadge status={p.stock > 0 ? "active" : "inactive"} />,
            ])}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={title} />
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["상품명", "일반가", "전문가가", "노출", "전문가전용", "관리"]}
          rows={(products.data ?? []).map((p: any) => [
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{p.slug}</div>
            </div>,
            editId === p.id
              ? <input type="number" value={editData.priceConsumer ?? p.priceConsumer} onChange={e => setEditData((d: any) => ({ ...d, priceConsumer: e.target.value }))} style={{ width: "100px", padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: "6px" }} />
              : krw(p.priceConsumer),
            editId === p.id
              ? <input type="number" value={editData.pricePro ?? p.pricePro} onChange={e => setEditData((d: any) => ({ ...d, pricePro: e.target.value }))} style={{ width: "100px", padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: "6px" }} />
              : krw(p.pricePro),
            editId === p.id
              ? <input type="checkbox" checked={editData.visible ?? p.visible} onChange={e => setEditData((d: any) => ({ ...d, visible: e.target.checked }))} />
              : <StatusBadge status={p.visible ? "active" : "inactive"} />,
            editId === p.id
              ? <input type="checkbox" checked={editData.isProOnly ?? p.isProOnly} onChange={e => setEditData((d: any) => ({ ...d, isProOnly: e.target.checked }))} />
              : <StatusBadge status={p.isProOnly ? "active" : "inactive"} />,
            editId === p.id
              ? <div style={{ display: "flex", gap: "6px" }}>
                  <Btn size="sm" onClick={() => setConfirmOpen(true)}>저장</Btn>
                  <Btn size="sm" variant="outline" onClick={() => { setEditId(null); setEditData({}); }}>취소</Btn>
                </div>
              : <Btn size="sm" variant="outline" onClick={() => { setEditId(p.id); setEditData({}); }}>편집</Btn>,
          ])}
        />
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="상품 정보 수정"
        message="상품 정보를 저장하시겠습니까?"
        onConfirm={() => {
          if (editId === null) return;
          updateProduct.mutate({ productId: editId, ...editData });
        }}
        onCancel={() => setConfirmOpen(false)}
        loading={updateProduct.isPending}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CUSTOMER
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerSection({ subPage }: { subPage: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVer, setSelectedVer] = useState<any>(null);
  const [verDetailOpen, setVerDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: "approve" | "reject"; id: number; userId: number }>(null);
  const [rejectReason, setRejectReason] = useState("");

  const users = trpc.admin.users.useQuery({ page: 1, limit: 50 });
  const verifications = trpc.admin.searchVerifications.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    page: 1, limit: 50,
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("역할이 변경되었습니다."); users.refetch(); },
  });
  const approveVer = trpc.admin.approveVerification.useMutation({
    onSuccess: () => { toast.success("인증이 승인되었습니다."); verifications.refetch(); setConfirmAction(null); },
  });
  const rejectVer = trpc.admin.rejectVerification.useMutation({
    onSuccess: () => { toast.success("인증이 반려되었습니다."); verifications.refetch(); setConfirmAction(null); },
  });
  // Note: approveVerification uses { id, userId }, rejectVerification uses { id, userId, reason }

  const title = subPage === "customer-dashboard" ? "고객 대시보드"
    : subPage === "customer-search" ? "회원 조회"
    : subPage === "customer-manage" ? "회원 관리"
    : "사업자 인증";

  if (subPage === "customer-dashboard") {
    return (
      <div>
        <SectionHeader title="고객 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="전체 회원" value={users.data?.total ?? "—"} />
          <SummaryCard label="대기 중 인증" value={verifications.data?.total ?? "—"} color={C.orange} />
        </div>
      </div>
    );
  }

  if (subPage === "customer-membership") {
    return <MembershipSection />;
  }

  if (subPage === "customer-verification") {
    return (
      <div>
        <SectionHeader title="사업자 인증 관리" />
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="이름, 이메일, 사업자번호 검색" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
            { value: "all", label: "전체" }, { value: "pending", label: "대기" },
            { value: "approved", label: "승인" }, { value: "rejected", label: "반려" },
          ]} />
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["회원", "상호명", "사업자번호", "상태", "신청일", "관리"]}
            rows={(verifications.data?.items ?? []).map((item: any) => [
              <div><div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div><div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div></div>,
              item.v.businessName,
              item.v.businessNumber,
              <StatusBadge status={item.v.status} />,
              fmtDate(item.v.submittedAt),
              <div style={{ display: "flex", gap: "6px" }}>
                <Btn size="sm" variant="outline" onClick={() => { setSelectedVer(item); setVerDetailOpen(true); }}>상세</Btn>
                {item.v.status === "pending" && (
                  <>
                    <Btn size="sm" variant="success" onClick={() => setConfirmAction({ type: "approve", id: item.v.id, userId: item.v.userId })}>승인</Btn>
                    <Btn size="sm" variant="danger" onClick={() => { setConfirmAction({ type: "reject", id: item.v.id, userId: item.v.userId }); setRejectReason(""); }}>반려</Btn>
                  </>
                )}
              </div>,
            ])}
          />
        </div>

        {verDetailOpen && selectedVer && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
            <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 800 }}>인증 상세</h3>
                <button onClick={() => setVerDetailOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "grid", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>회원</span><span>{selectedVer.userName} ({selectedVer.userEmail})</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>상호명</span><span>{selectedVer.v.businessName}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>사업자번호</span><span>{selectedVer.v.businessNumber}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>연락처</span><span>{selectedVer.v.contactPhone ?? "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>상태</span><StatusBadge status={selectedVer.v.status} /></div>
                {selectedVer.v.rejectReason && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>반려 사유</span><span style={{ color: "#991B1B" }}>{selectedVer.v.rejectReason}</span></div>}
                {selectedVer.v.fileUrl && (
                  <div>
                    <span style={{ color: C.muted, display: "block", marginBottom: "8px" }}>첨부 서류</span>
                    <a href={selectedVer.v.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontWeight: 600 }}>📄 서류 보기</a>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Btn size="sm" variant="outline" onClick={() => setVerDetailOpen(false)}>닫기</Btn>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          open={!!confirmAction}
          title={confirmAction?.type === "approve" ? "인증 승인" : "인증 반려"}
          message={confirmAction?.type === "approve" ? "이 인증 신청을 승인하시겠습니까?" : "이 인증 신청을 반려하시겠습니까?"}
          onConfirm={() => {
            if (!confirmAction) return;
            if (confirmAction.type === "approve") {
              approveVer.mutate({ id: confirmAction.id, userId: confirmAction.userId });
            } else {
              rejectVer.mutate({ id: confirmAction.id, userId: confirmAction.userId, reason: rejectReason || "서류 미비" });
            }
          }}
          onCancel={() => setConfirmAction(null)}
          loading={approveVer.isPending || rejectVer.isPending}
          danger={confirmAction?.type === "reject"}
        />
      </div>
    );
  }

  // 회원 조회 / 회원 관리
  return (
    <div>
      <SectionHeader title={title} />
      <div style={{ marginBottom: "16px" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="이름, 이메일 검색" />
      </div>
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["이름", "이메일", "역할", "회원등급", "인증상태", "가입일", ...(subPage === "customer-manage" ? ["관리"] : [])]}
          rows={(users.data?.users ?? [])
            .filter((u: any) => {
              if (!search) return true;
              return u.name?.includes(search) || u.email?.includes(search);
            })
            .map((u: any) => [
              u.name ?? "—",
              u.email ?? "—",
              <StatusBadge status={u.role} />,
              <StatusBadge status={u.memberRole} />,
              <StatusBadge status={u.proVerificationStatus} />,
              fmtDate(u.createdAt),
              ...(subPage === "customer-manage" ? [
                <FilterSelect
                  value={u.role}
                  onChange={v => updateRole.mutate({ userId: u.id, role: v as "user" | "admin" })}
                  options={[{ value: "user", label: "일반" }, { value: "admin", label: "관리자" }]}
                />,
              ] : []),
            ])}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: BOARD (Gallery & Magazine)
// ═══════════════════════════════════════════════════════════════════════════════
function PostEditor({
  type, post, onSave, onCancel,
}: {
  type: "gallery" | "magazine";
  post?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [subtitle, setSubtitle] = useState(post?.subtitle ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(post?.coverImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.admin.uploadPostImage.useMutation();

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let coverImageUrl = post?.coverImageUrl ?? "";
      let coverImageKey = post?.coverImageKey ?? "";
      if (coverFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = ev => resolve((ev.target?.result as string).split(",")[1]);
          reader.readAsDataURL(coverFile);
        });
        const result = await uploadImage.mutateAsync({
          fileBase64: base64,
          fileName: coverFile.name,
          fileMimeType: coverFile.type,
          postType: type,
        });
        coverImageUrl = result.url;
        coverImageKey = result.key;
      }
      onSave({ title, subtitle, content, isPublished, coverImageUrl, coverImageKey });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: C.white, borderRadius: "12px", padding: "28px", border: `1px solid ${C.border}` }}>
      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>제목 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목을 입력하세요"
            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", boxSizing: "border-box" }} />
        </div>
        {type === "magazine" && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>부제목</label>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="부제목을 입력하세요"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", boxSizing: "border-box" }} />
          </div>
        )}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>커버 이미지</label>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {coverPreview && <img src={coverPreview} alt="cover" style={{ width: "120px", height: "80px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />}
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: "none" }} />
              <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()}>이미지 선택</Btn>
              <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>JPG, PNG, WebP / 10MB 이하</div>
            </div>
          </div>
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>내용</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용을 입력하세요. HTML 태그 사용 가능합니다."
            rows={12}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" id="isPublished" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
          <label htmlFor="isPublished" style={{ fontSize: "13px", fontWeight: 600 }}>게시 (체크 해제 시 임시저장)</label>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onCancel}>취소</Btn>
          <Btn onClick={handleSave} disabled={!title || uploading}>{uploading ? "저장 중..." : "저장"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Review Section ──────────────────────────────────────────────────────────
const REVIEW_CATEGORIES = [
  { value: "before_after", label: "비포 & 애프터" },
  { value: "device", label: "디바이스 후기" },
  { value: "education", label: "교육 후기" },
  { value: "event", label: "이벤트 후기" },
  { value: "etc", label: "기타" },
];

// ─── InstructorSection ──────────────────────────────────────────────────────────────────────────────────────
function InstructorSection() {
  const [uploading, setUploading] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<null | number>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = trpc.adminExt.certifiedInstructorList.useQuery({ page: 1, limit: 200 });
  const uploadImage = trpc.adminExt.uploadCertifiedInstructorImage.useMutation();
  const createItem = trpc.adminExt.createCertifiedInstructor.useMutation({
    onSuccess: () => { toast.success("인증강사 사진이 등록되었습니다."); list.refetch(); setNameInput(""); setDescInput(""); if (fileRef.current) fileRef.current.value = ""; },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteItem = trpc.adminExt.deleteCertifiedInstructor.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); list.refetch(); setDeleteConfirm(null); },
  });
  const togglePublish = trpc.adminExt.updateCertifiedInstructor.useMutation({
    onSuccess: () => { list.refetch(); },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("파일 크기가 10MB를 초과합니다."); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = ev => res((ev.target?.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const { url, key } = await uploadImage.mutateAsync({ fileBase64: base64, fileName: file.name, fileMimeType: file.type });
      await createItem.mutateAsync({ imageUrl: url, imageKey: key, name: nameInput || undefined, description: descInput || undefined, isPublished: true });
    } catch(err) {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const items = list.data?.items ?? [];

  return (
    <div>
      <SectionHeader title="인증강사 관리" />

      {/* 업로드 폼 */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: C.text }}>새 인증강사 사진 등록</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="이름 (선택)"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ flex: 1, minWidth: "160px", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }}
          />
          <input
            type="text"
            placeholder="설명 (선택)"
            value={descInput}
            onChange={e => setDescInput(e.target.value)}
            style={{ flex: 2, minWidth: "200px", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: C.primary, color: "#fff", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, opacity: uploading ? 0.7 : 1 }}>
            {uploading ? "업로드 중..." : "파일 선택"}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
          </label>
          <span style={{ fontSize: "12px", color: C.muted }}>JPG, PNG, WEBP · 최대 10MB</span>
        </div>
      </div>

      {/* 리스트 */}
      {list.isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>👤</div>
          <p>등록된 인증강사가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", background: C.white }}>
              <div style={{ aspectRatio: "1/1", background: "#f5f5f5", position: "relative" }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>👤</div>
                }
                {!item.isPublished && (
                  <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: "10px", padding: "2px 8px", borderRadius: "4px" }}>비공개</div>
                )}
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px", color: C.text }}>{item.name || "이름 없음"}</div>
                {item.description && <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>{item.description}</div>}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => togglePublish.mutate({ id: item.id, isPublished: !item.isPublished })}
                    style={{ flex: 1, padding: "6px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "11px", color: C.muted }}
                  >{item.isPublished ? "비공개" : "공개"}</button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    style={{ flex: 1, padding: "6px", border: `1px solid #fca5a5`, borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "11px", color: "#dc2626" }}
                  >삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm !== null}
        title="사진 삭제"
        message="이 인증강사 사진을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm !== null) deleteItem.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteItem.isPending}
        danger
      />
    </div>
  );
}

// ─── MembershipSection ─────────────────────────────────────────────────────────
const MEMBERSHIP_GRADES = [
  { value: "consumer", label: "일반", discount: 0 },
  { value: "professional", label: "전문가", discount: 10 },
  { value: "membership", label: "멤버십", discount: 20 },
];

function MembershipSection() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newGrade, setNewGrade] = useState("");
  const [discountRate, setDiscountRate] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const users = trpc.admin.users.useQuery({ page: 1, limit: 200 });
  const setMembership = trpc.adminExt.setMembership.useMutation({
    onSuccess: () => { toast.success("멤버십 등급이 변경되었습니다."); users.refetch(); setModalOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const allUsers = users.data?.users ?? [];
  const filtered = allUsers.filter((u: any) => {
    const matchSearch = !search || u.name?.includes(search) || u.email?.includes(search);
    const matchGrade = gradeFilter === "all" || (u.membershipGrade ?? "none") === gradeFilter;
    return matchSearch && matchGrade;
  });

  const openModal = (user: any) => {
    setSelectedUser(user);
    setNewGrade(user.memberRole ?? "consumer");
    const found = MEMBERSHIP_GRADES.find(g => g.value === (user.memberRole ?? "consumer"));
    setDiscountRate(found?.discount ?? 0);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    setMembership.mutate({ userId: selectedUser.id, membershipGrade: newGrade as "consumer" | "professional" | "membership", discountRate });
  };

  const gradeLabel = (g: string | null) => MEMBERSHIP_GRADES.find(x => x.value === (g ?? "consumer"))?.label ?? "일반";
  const gradeColor = (g: string | null) => {
    if (g === "membership") return "#7c3aed";
    if (g === "professional") return "#0369a1";
    return C.muted;
  };

  return (
    <div>
      <SectionHeader title="멤버십 등급 관리" />

      {/* 등급 설명 카드 */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {MEMBERSHIP_GRADES.map(g => (
          <div key={g.value} style={{ flex: 1, minWidth: "140px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: gradeColor(g.value), marginBottom: "4px" }}>{g.label}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>할인율: <strong>{g.discount}%</strong></div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>
              {g.value === "none" && "기본 등급"}
              {g.value === "professional" && "사업자 인증 완료 회원"}
              {g.value === "membership" && "최고 등급 · 전문가보다 추가 할인"}
            </div>
          </div>
        ))}
      </div>

      {/* 검색 및 필터 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="이름 또는 이메일 검색" />
        <FilterSelect
          value={gradeFilter}
          onChange={setGradeFilter}
          options={[{ value: "all", label: "전체 등급" }, ...MEMBERSHIP_GRADES.map(g => ({ value: g.value, label: g.label }))]}
        />
      </div>

      {/* 회원 테이블 */}
      {users.isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
      ) : (
        <Table
          headers={["이름", "이메일", "현재 등급", "할인율", "가입일", "관리"]}
          rows={filtered.map((u: any) => [
            <span style={{ fontWeight: 600 }}>{u.name ?? "—"}</span>,
            <span style={{ fontSize: "12px", color: C.muted }}>{u.email ?? "—"}</span>,
            <span style={{ fontWeight: 700, color: gradeColor(u.memberRole) }}>{gradeLabel(u.memberRole)}</span>,
            <span>{MEMBERSHIP_GRADES.find(g => g.value === (u.memberRole ?? "consumer"))?.discount ?? 0}%</span>,
            <span style={{ fontSize: "12px", color: C.muted }}>{fmtDate(u.createdAt)}</span>,
            <Btn size="sm" variant="outline" onClick={() => openModal(u)}>등급 변경</Btn>,
          ])}
        />
      )}

      {/* 등급 변경 모달 */}
      {modalOpen && selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.white, borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>멤버십 등급 변경</h3>
            <p style={{ fontSize: "13px", color: C.muted, marginBottom: "24px" }}>{selectedUser.name} ({selectedUser.email})</p>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "6px" }}>등급 선택</label>
              <select
                value={newGrade}
                onChange={e => {
                  setNewGrade(e.target.value);
                  const found = MEMBERSHIP_GRADES.find(g => g.value === e.target.value);
                  setDiscountRate(found?.discount ?? 0);
                }}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px" }}
              >
                {MEMBERSHIP_GRADES.map(g => <option key={g.value} value={g.value}>{g.label} ({g.discount}% 할인)</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "6px" }}>할인율 (%)</label>
              <input
                type="number" min={0} max={100}
                value={discountRate}
                onChange={e => setDiscountRate(Number(e.target.value))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setModalOpen(false)}>취소</Btn>
              <Btn onClick={handleSave} disabled={setMembership.isPending}>
                {setMembership.isPending ? "저장 중..." : "저장"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewSection() {
  const [selectedCategory, setSelectedCategory] = useState("before_after");
  const [deleteConfirm, setDeleteConfirm] = useState<null | number>(null);
  const [uploading, setUploading] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reviews = trpc.admin.reviewList.useQuery({ category: selectedCategory, page: 1, limit: 100 });
  const uploadImage = trpc.admin.uploadReviewImage.useMutation();
  const createReview = trpc.admin.createReview.useMutation({
    onSuccess: () => { toast.success("후기 사진이 등록되었습니다."); reviews.refetch(); setTitleInput(""); setDescInput(""); },
  });
  const deleteReview = trpc.admin.deleteReview.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); reviews.refetch(); setDeleteConfirm(null); },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => resolve((ev.target?.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const { url, key } = await uploadImage.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
        fileMimeType: file.type,
      });
      const catLabel = REVIEW_CATEGORIES.find(c => c.value === selectedCategory)?.label ?? selectedCategory;
      await createReview.mutateAsync({
        category: selectedCategory as any,
        categoryLabel: catLabel,
        imageUrl: url,
        imageKey: key,
        title: titleInput || undefined,
        description: descInput || undefined,
        isPublished: true,
      });
    } catch(err) {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const currentCatLabel = REVIEW_CATEGORIES.find(c => c.value === selectedCategory)?.label ?? selectedCategory;

  return (
    <div>
      <SectionHeader title="후기 관리" />

      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {REVIEW_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            style={{
              padding: "8px 18px", borderRadius: "20px", border: `1.5px solid ${selectedCategory === cat.value ? C.primary : C.border}`,
              background: selectedCategory === cat.value ? C.primary : C.white,
              color: selectedCategory === cat.value ? "#fff" : C.text,
              fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >{cat.label}</button>
        ))}
      </div>

      {/* 업로드 폼 */}
      <div style={{ background: C.white, borderRadius: "12px", padding: "24px", border: `1px solid ${C.border}`, marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>{currentCatLabel} 사진 업로드</div>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>제목 (선택)</label>
            <input value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="후기 제목을 입력하세요"
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", boxSizing: "border-box" as any }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>설명 (선택)</label>
            <textarea value={descInput} onChange={e => setDescInput(e.target.value)} placeholder="간단한 설명을 입력하세요" rows={2}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", resize: "none", boxSizing: "border-box" as any, fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
            <Btn onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "업로드 중..." : "+ 사진 업로드"}
            </Btn>
            <span style={{ fontSize: "12px", color: C.muted }}>JPG, PNG, WebP / 10MB 이하</span>
          </div>
        </div>
      </div>

      {/* 사진 목록 */}
      <div style={{ background: C.white, borderRadius: "12px", padding: "24px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>
          {currentCatLabel} 사진 목록 ({reviews.data?.total ?? 0}장)
        </div>
        {reviews.isLoading ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
        ) : (reviews.data?.items ?? []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>등록된 사진이 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {(reviews.data?.items ?? []).map((r: any) => (
              <div key={r.id} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={r.imageUrl} alt={r.title ?? ""} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                {r.title && (
                  <div style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, color: C.text, background: C.white }}>{r.title}</div>
                )}
                <div style={{ padding: "4px 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white }}>
                  <span style={{ fontSize: "11px", color: C.muted }}>{fmtDate(r.createdAt)}</span>
                  <button
                    onClick={() => setDeleteConfirm(r.id)}
                    style={{ fontSize: "11px", color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        title="사진 삭제"
        message="이 사진을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm) deleteReview.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteReview.isPending}
        danger
      />
    </div>
  );
}

function BoardSection({ subPage }: { subPage: string }) {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editPost, setEditPost] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<null | { id: number; type: "gallery" | "magazine" }>(null);

  const galleryPosts = trpc.admin.galleryPosts.useQuery({ page: 1, limit: 50 });
  const magazinePosts = trpc.admin.magazinePosts.useQuery({ page: 1, limit: 50 });

  const createGallery = trpc.admin.createGalleryPost.useMutation({
    onSuccess: () => { toast.success("갤러리 글이 등록되었습니다."); galleryPosts.refetch(); setView("list"); },
  });
  const updateGallery = trpc.admin.updateGalleryPost.useMutation({
    onSuccess: () => { toast.success("갤러리 글이 수정되었습니다."); galleryPosts.refetch(); setView("list"); },
  });
  const deleteGallery = trpc.admin.deleteGalleryPost.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); galleryPosts.refetch(); setDeleteConfirm(null); },
  });

  const createMagazine = trpc.admin.createMagazinePost.useMutation({
    onSuccess: () => { toast.success("매거진 글이 등록되었습니다."); magazinePosts.refetch(); setView("list"); },
  });
  const updateMagazine = trpc.admin.updateMagazinePost.useMutation({
    onSuccess: () => { toast.success("매거진 글이 수정되었습니다."); magazinePosts.refetch(); setView("list"); },
  });
  const deleteMagazine = trpc.admin.deleteMagazinePost.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); magazinePosts.refetch(); setDeleteConfirm(null); },
  });

  const isGallery = subPage === "board-gallery";
  const type = isGallery ? "gallery" : "magazine";
  const posts = isGallery ? galleryPosts.data?.items : magazinePosts.data?.items;
  const title = subPage === "board-dashboard" ? "게시판 대시보드" : isGallery ? "갤러리 관리" : "매거진 관리";

  if (subPage === "board-review") {
    return <ReviewSection />;
  }

  if (subPage === "board-instructor") {
    return <InstructorSection />;
  }

  if (subPage === "board-dashboard") {
    return (
      <div>
        <SectionHeader title="게시판 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="갤러리 게시물" value={galleryPosts.data?.total ?? "—"} />
          <SummaryCard label="매거진 게시물" value={magazinePosts.data?.total ?? "—"} />
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div>
        <SectionHeader title={`${isGallery ? "갤러리" : "매거진"} 글 작성`} />
        <PostEditor
          type={type}
          onSave={data => {
            if (isGallery) createGallery.mutate(data);
            else createMagazine.mutate(data);
          }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "edit" && editPost) {
    return (
      <div>
        <SectionHeader title={`${isGallery ? "갤러리" : "매거진"} 글 수정`} />
        <PostEditor
          type={type}
          post={editPost}
          onSave={data => {
            if (isGallery) updateGallery.mutate({ id: editPost.id, ...data });
            else updateMagazine.mutate({ id: editPost.id, ...data });
          }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={title} action={
        <Btn onClick={() => setView("create")}>+ 새 글 작성</Btn>
      } />
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["커버", "제목", ...(type === "magazine" ? ["부제목"] : []), "상태", "조회수", "작성일", "관리"]}
          rows={(posts ?? []).map((p: any) => [
            p.coverImageUrl
              ? <img src={p.coverImageUrl} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
              : <div style={{ width: "60px", height: "40px", background: C.border, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: C.muted }}>없음</div>,
            <span style={{ fontWeight: 600 }}>{p.title}</span>,
            ...(type === "magazine" ? [p.subtitle ?? "—"] : []),
            <StatusBadge status={p.isPublished ? "published" : "draft"} />,
            p.viewCount,
            fmtDate(p.createdAt),
            <div style={{ display: "flex", gap: "6px" }}>
              <Btn size="sm" variant="outline" onClick={() => { setEditPost(p); setView("edit"); }}>수정</Btn>
              <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm({ id: p.id, type })}>삭제</Btn>
            </div>,
          ])}
        />
      </div>
      <ConfirmModal
        open={!!deleteConfirm}
        title="게시물 삭제"
        message="이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "gallery") deleteGallery.mutate({ id: deleteConfirm.id });
          else deleteMagazine.mutate({ id: deleteConfirm.id });
        }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteGallery.isPending || deleteMagazine.isPending}
        danger
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: STATS
// ═══════════════════════════════════════════════════════════════════════════════
const DOW_LABELS = ["", "일", "월", "화", "수", "목", "금", "토"];

function StatsSection({ subPage }: { subPage: string }) {
  const [salesPeriod, setSalesPeriod] = useState<"day" | "week" | "month">("day");
  const [salesDays, setSalesDays] = useState(30);
  const [deviceFilter, setDeviceFilter] = useState<"all" | "pc" | "mobile">("all");

  const salesStats = trpc.admin.salesStats.useQuery({ period: salesPeriod, days: salesDays });
  const productStats = trpc.admin.productSalesStats.useQuery();
  const customerStats = trpc.admin.customerStats.useQuery();
  const pageViewStats = trpc.admin.pageViewStats.useQuery({ days: 30 });  const orderStats2 = trpc.admin.dashboardCharts.useQuery({ days: 30 });

  const title = subPage === "stats-dashboard" ? "통계 대시보드"
    : subPage === "stats-sales" ? "매출 분석"
    : subPage === "stats-product" ? "상품 분석"
    : subPage === "stats-customer" ? "고객 분석"
    : "접속 통계";

  if (subPage === "stats-dashboard") {
    return (
      <div>
        <SectionHeader title="통계 대시보드" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>최근 30일 매출</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={orderStats2.data?.orderStats ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => (v / 10000).toFixed(0) + "만"} />
                <Tooltip formatter={(v: number) => krw(v)} />
                <Area type="monotone" dataKey="revenue" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name="매출" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>방문자 현황</div>
            <div style={{ fontSize: "36px", fontWeight: 800, color: C.primary }}>{pageViewStats.data?.total ?? 0}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>최근 30일 총 방문</div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === "stats-sales") {
    return (
      <div>
        <SectionHeader title="매출 분석" action={
          <div style={{ display: "flex", gap: "8px" }}>
            <FilterSelect value={salesPeriod} onChange={v => setSalesPeriod(v as any)} options={[
              { value: "day", label: "일별" }, { value: "week", label: "주별" }, { value: "month", label: "월별" },
            ]} />
            <FilterSelect value={String(salesDays)} onChange={v => setSalesDays(Number(v))} options={[
              { value: "30", label: "최근 30일" }, { value: "60", label: "최근 60일" }, { value: "90", label: "최근 90일" },
            ]} />
          </div>
        } />
        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={salesStats.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="periodKey" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v / 10000).toFixed(0) + "만"} />
                <Tooltip formatter={(v: number) => krw(v)} />
                <Area type="monotone" dataKey="revenue" stroke={C.primary} fill={C.primary} fillOpacity={0.15} name="매출" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>주문 건수</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesStats.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="periodKey" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="orderCount" fill={C.gold} name="주문 수" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 집계</div>
            <Table
              headers={["기간", "주문 건수", "매출"]}
              rows={(salesStats.data ?? []).map((r: any) => [r.periodKey, r.orderCount + "건", krw(r.revenue)])}
            />
          </div>
        </div>
      </div>
    );
  }

  if (subPage === "stats-product") {
    return (
      <div>
        <SectionHeader title="상품 분석" />
        <div style={{ display: "grid", gap: "20px" }}>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>판매 상품 순위</div>
            <Table
              headers={["순위", "상품명", "판매 수량", "매출"]}
              rows={(productStats.data?.topSelling ?? []).map((r: any, i: number) => [
                <span style={{ fontWeight: 700, color: i < 3 ? C.primary : C.text }}>#{i + 1}</span>,
                r.productName,
                r.totalQty + "개",
                krw(r.totalRevenue),
              ])}
            />
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>취소/반품 순위</div>
            <p style={{ color: C.muted, fontSize: "13px" }}>취소/반품 데이터가 쌓이면 표시됩니다.</p>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>장바구니 상품 분석</div>
            <p style={{ color: C.muted, fontSize: "13px" }}>장바구니 데이터가 쌓이면 표시됩니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === "stats-customer") {
    return (
      <div>
        <SectionHeader title="고객 분석" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>회원 등급별 분석</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={(customerStats.data?.byMemberRole ?? []).map((r: any) => ({ name: r.role === "professional" ? "전문가" : "일반", value: r.count }))}
                  cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill={C.primary} />
                  <Cell fill={C.gold} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>요일별 주문 분석</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(customerStats.data?.byDayOfWeek ?? []).map((r: any) => ({ day: DOW_LABELS[r.dow] ?? r.dow, count: r.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill={C.primary} name="주문 수" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>시간별 주문 분석</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(customerStats.data?.byHour ?? []).map((r: any) => ({ hour: r.hour + "시", count: r.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill={C.gold} name="주문 수" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>배송 지역별 분석</div>
            <p style={{ color: C.muted, fontSize: "13px" }}>배송 주소 데이터가 쌓이면 표시됩니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // 접속 통계
  const filteredByDay = (pageViewStats.data?.byDay ?? []).filter((r: any) =>
    deviceFilter === "all" ? true : r.device === deviceFilter
  );
  const aggregatedByDay = filteredByDay.reduce((acc: any[], r: any) => {
    const existing = acc.find(a => a.day === r.day);
    if (existing) existing.count += r.count;
    else acc.push({ day: r.day, count: r.count });
    return acc;
  }, []);

  return (
    <div>
      <SectionHeader title="접속 통계" action={
        <FilterSelect value={deviceFilter} onChange={v => setDeviceFilter(v as any)} options={[
          { value: "all", label: "전체" }, { value: "pc", label: "PC" }, { value: "mobile", label: "모바일" },
        ]} />
      } />
      <div style={{ display: "grid", gap: "20px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="총 방문자" value={pageViewStats.data?.total ?? 0} />
          <SummaryCard label="PC 방문" value={(pageViewStats.data?.byDevice ?? []).find((r: any) => r.device === "pc")?.count ?? 0} />
          <SummaryCard label="모바일 방문" value={(pageViewStats.data?.byDevice ?? []).find((r: any) => r.device === "mobile")?.count ?? 0} />
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>일별 방문자 추이</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={aggregatedByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke={C.blue} fill={C.blue} fillOpacity={0.15} name="방문자" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>많이 찾는 페이지 Top 10</div>
          <Table
            headers={["순위", "페이지", "방문 수"]}
            rows={(pageViewStats.data?.topPages ?? []).map((r: any, i: number) => [
              <span style={{ fontWeight: 700, color: i < 3 ? C.primary : C.text }}>#{i + 1}</span>,
              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{r.path}</span>,
              r.count,
            ])}
          />
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>사이트 체류시간</div>
          <p style={{ color: C.muted, fontSize: "13px" }}>체류시간 데이터가 쌓이면 표시됩니다. (페이지뷰 트래킹 스크립트 연동 필요)</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: POPUP
// ═══════════════════════════════════════════════════════════════════════════════
function PopupForm({ popup, onSave, onCancel }: { popup?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(popup?.title ?? "");
  const [popupType, setPopupType] = useState(popup?.popupType ?? "both");
  const [isActive, setIsActive] = useState(popup?.isActive ?? true);
  const [linkUrl, setLinkUrl] = useState(popup?.linkUrl ?? "");
  const [linkTarget, setLinkTarget] = useState(popup?.linkTarget ?? "_blank");
  const [displayPosition, setDisplayPosition] = useState(popup?.displayPosition ?? "main");
  const [bottomText, setBottomText] = useState(popup?.bottomText ?? "today");
  const [startAt, setStartAt] = useState(popup?.startAt ? new Date(popup.startAt).toISOString().slice(0, 16) : "");
  const [endAt, setEndAt] = useState(popup?.endAt ? new Date(popup.endAt).toISOString().slice(0, 16) : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(popup?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.admin.uploadPostImage.useMutation();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let imageUrl = popup?.imageUrl ?? "";
      let imageKey = popup?.imageKey ?? "";
      if (imageFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = ev => resolve((ev.target?.result as string).split(",")[1]);
          reader.readAsDataURL(imageFile);
        });
        const result = await uploadImage.mutateAsync({
          fileBase64: base64,
          fileName: imageFile.name,
          fileMimeType: imageFile.type,
          postType: "gallery",
        });
        imageUrl = result.url;
        imageKey = result.key;
      }
      onSave({
        title, popupType, isActive, linkUrl: linkUrl || null, linkTarget,
        displayPosition, bottomText,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        imageUrl: imageUrl || null, imageKey: imageKey || null,
      });
    } finally {
      setUploading(false);
    }
  };

  const rowStyle = { display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "start", gap: "12px", paddingBottom: "16px", borderBottom: `1px solid ${C.border}` };
  const labelStyle = { fontSize: "13px", fontWeight: 700, color: C.text, paddingTop: "8px" };
  const inputStyle = { padding: "8px 12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "15px" }}>
        {popup ? "팝업 수정" : "팝업 등록"}
      </div>
      <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
        <div style={rowStyle}>
          <span style={labelStyle}>팝업 종류</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            {[{ v: "pc", l: "PC" }, { v: "mobile", l: "모바일" }, { v: "both", l: "PC + 모바일" }].map(o => (
              <label key={o.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                <input type="radio" name="popupType" value={o.v} checked={popupType === o.v} onChange={() => setPopupType(o.v)} />
                {o.l}
              </label>
            ))}
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>사용 여부</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
              <input type="radio" name="isActive" checked={isActive} onChange={() => setIsActive(true)} /> 사용함
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
              <input type="radio" name="isActive" checked={!isActive} onChange={() => setIsActive(false)} /> 사용 안함
            </label>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>하단 문구</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            {[{ v: "today", l: "오늘 하루 열지 않기" }, { v: "week", l: "일주일간 열지 않기" }, { v: "none", l: "없음" }].map(o => (
              <label key={o.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                <input type="radio" name="bottomText" value={o.v} checked={bottomText === o.v} onChange={() => setBottomText(o.v)} />
                {o.l}
              </label>
            ))}
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>팝업 제목</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="팝업 제목 (관리용)" style={inputStyle} />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>이미지 등록</span>
          <div>
            {imagePreview && (
              <img src={imagePreview} alt="popup" style={{ maxWidth: "300px", maxHeight: "200px", objectFit: "contain", borderRadius: "8px", border: `1px solid ${C.border}`, marginBottom: "10px", display: "block" }} />
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
            <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()}>직접 등록하기</Btn>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "6px" }}>권장 이미지: 300px~1920px / 10MB 이하 / jpg, jpeg, png</div>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>클릭 링크 URL</span>
          <div>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" style={inputStyle} />
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {[{ v: "_blank", l: "새 탭에서 열기" }, { v: "_self", l: "현재 탭에서 열기" }].map(o => (
                <label key={o.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                  <input type="radio" name="linkTarget" value={o.v} checked={linkTarget === o.v} onChange={() => setLinkTarget(o.v)} />
                  {o.l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>노출 위치</span>
          <select value={displayPosition} onChange={e => setDisplayPosition(e.target.value)} style={inputStyle}>
            <option value="main">메인화면</option>
            <option value="all">전체 페이지</option>
          </select>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>노출 기간</span>
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
              <span>~</span>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
            </div>
            <div style={{ fontSize: "11px", color: C.muted }}>비워두면 기간 제한 없이 노출됩니다.</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "10px", justifyContent: "center" }}>
        <Btn onClick={handleSave} disabled={!title || uploading}>{uploading ? "저장 중..." : "저장"}</Btn>
        <Btn variant="outline" onClick={onCancel}>취소</Btn>
      </div>
    </div>
  );
}

function PopupSection({ subPage, onNavigate }: { subPage: string; onNavigate: (id: string) => void }) {
  const [editPopup, setEditPopup] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const popups = trpc.admin.popups.useQuery();
  const createPopup = trpc.admin.createPopup.useMutation({
    onSuccess: () => { toast.success("팝업이 등록되었습니다."); popups.refetch(); onNavigate("popup-list"); },
  });
  const updatePopup = trpc.admin.updatePopup.useMutation({
    onSuccess: () => { toast.success("팝업이 수정되었습니다."); popups.refetch(); setEditPopup(null); onNavigate("popup-list"); },
  });
  const deletePopup = trpc.admin.deletePopup.useMutation({
    onSuccess: () => { toast.success("팝업이 삭제되었습니다."); popups.refetch(); setDeleteConfirm(null); },
  });

  if (subPage === "popup-register") {
    return (
      <div>
        <SectionHeader title="팝업 등록" />
        <PopupForm
          onSave={data => createPopup.mutate(data)}
          onCancel={() => onNavigate("popup-list")}
        />
      </div>
    );
  }

  if (editPopup) {
    return (
      <div>
        <SectionHeader title="팝업 수정" />
        <PopupForm
          popup={editPopup}
          onSave={data => updatePopup.mutate({ id: editPopup.id, ...data })}
          onCancel={() => setEditPopup(null)}
        />
      </div>
    );
  }

  const popupTypeLabel = (t: string) => t === "pc" ? "PC" : t === "mobile" ? "모바일" : "PC + 모바일";
  const bottomTextLabel = (t: string) => t === "today" ? "오늘 하루 열지 않기" : t === "week" ? "일주일간 열지 않기" : "없음";

  return (
    <div>
      <SectionHeader title="팝업 목록" action={
        <Btn onClick={() => onNavigate("popup-register")}>+ 팝업 등록</Btn>
      } />
      <div style={{ display: "grid", gap: "16px" }}>
        {(popups.data ?? []).length === 0 && (
          <div style={{ background: C.white, borderRadius: "12px", padding: "40px", textAlign: "center", color: C.muted, border: `1px solid ${C.border}` }}>
            등록된 팝업이 없습니다.
          </div>
        )}
        {(popups.data ?? []).map((p: any, idx: number) => (
          <div key={p.id} style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "20px", display: "grid", gridTemplateColumns: "40px 160px 1fr auto", gap: "16px", alignItems: "start" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: C.muted }}>{idx + 1}</div>
              <div style={{ fontSize: "10px", color: C.muted, marginTop: "4px" }}>유형<br />이미지</div>
              <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>클릭수 {p.clickCount}</div>
            </div>
            <div>
              {p.imageUrl
                ? <img src={p.imageUrl} alt={p.title} style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />
                : <div style={{ width: "150px", height: "100px", background: C.border, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: C.muted }}>이미지 없음</div>
              }
            </div>
            <div style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <StatusBadge status={p.isActive ? "active" : "inactive"} />
              </div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>팝업 종류</span>{popupTypeLabel(p.popupType)}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>제목</span>{p.title}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>하단 버튼</span>{bottomTextLabel(p.bottomText)}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>노출 위치</span>{p.displayPosition === "main" ? "메인화면" : "전체 페이지"}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>노출 기간</span>
                {p.startAt || p.endAt
                  ? `${p.startAt ? fmtDateTime(p.startAt) : "~"} ~ ${p.endAt ? fmtDateTime(p.endAt) : "~"}`
                  : "기간 제한 없음"}
              </div>
              {p.linkUrl && <div><span style={{ color: C.muted, marginRight: "8px" }}>링크</span><a href={p.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }}>{p.linkUrl}</a></div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Btn size="sm" variant="outline" onClick={() => setEditPopup(p)}>팝업수정</Btn>
              <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(p.id)}>팝업삭제</Btn>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        open={deleteConfirm !== null}
        title="팝업 삭제"
        message="이 팝업을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm !== null) deletePopup.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deletePopup.isPending}
        danger
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [, navigate] = useLocation();
  const me = trpc.auth.me.useQuery();
  const [activePage, setActivePage] = useState("dashboard");

  if (me.isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "14px", color: C.muted }}>로딩 중...</div>;
  }

  if (!me.data || me.data.role !== "admin") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" }}>
        <div style={{ fontSize: "48px" }}>🔒</div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: "14px", color: C.muted }}>관리자 계정으로 로그인해 주세요.</div>
        <Btn onClick={() => navigate("/login")}>로그인 페이지로</Btn>
      </div>
    );
  }

  const renderContent = () => {
    if (activePage === "dashboard") return <DashboardSection />;
    if (activePage.startsWith("order-") || activePage === "order") return <OrderSection subPage={activePage} />;
    if (activePage.startsWith("product-") || activePage === "product") return <ProductSection subPage={activePage} />;
    if (activePage.startsWith("customer-") || activePage === "customer") return <CustomerSection subPage={activePage} />;
    if (activePage.startsWith("board-") || activePage === "board") return <BoardSection subPage={activePage} />;
    if (activePage.startsWith("stats-") || activePage === "stats") return <StatsSection subPage={activePage} />;
    if (activePage.startsWith("popup-") || activePage === "popup") return <PopupSection subPage={activePage} onNavigate={setActivePage} />;
    return <DashboardSection />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Sidebar active={activePage} onSelect={setActivePage} />
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        {renderContent()}
      </main>
    </div>
  );
}
