import { trpc } from "@/lib/trpc";
import RichTextEditor from "@/components/RichTextEditor";
import DropzoneUploader from "@/components/DropzoneUploader";
import PromotionSection from "./PromotionSection";
import ProductDetailPage from "./ProductDetailPage";
import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
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
    received: { bg: "#EFF6FF", color: "#1D4ED8", label: "접수" },
    contacted:{ bg: "#FEF3C7", color: "#B45309", label: "연락완료" },
    closed:   { bg: "#DCFCE7", color: "#166534", label: "종료" },
    trial:    { bg: "#EDE9FE", color: "#5B21B6", label: "체험예약" },
    introduction: { bg: "#FEF3C7", color: "#B45309", label: "도입상담" },
    education:{ bg: "#DCFCE7", color: "#166534", label: "교육문의" },
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
      { id: "customer-inquiry", label: "문의 관리" },
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
    id: "promotion", label: "프로모션",
    children: [
      { id: "promotion-dashboard", label: "프로모션 대시보드" },
      { id: "promotion-coupon-create", label: "쿠폰 만들기" },
      { id: "promotion-coupon-list", label: "쿠폰 발급/조회" },
      { id: "promotion-discount-create", label: "할인코드 등록" },
      { id: "promotion-discount-list", label: "할인코드 조회" },
      { id: "promotion-remind", label: "리마인드 Me" },
    ],
  },
  {
    id: "stats", label: "통계",
    children: [
      { id: "stats-dashboard", label: "통계 대시보드" },
      { id: "stats-inquiry", label: "문의 통계" },
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
  {
    id: "design", label: "디자인",
    children: [
      { id: "design-dashboard", label: "디자인 대시보드" },
      { id: "design-library", label: "디자인 보관함" },
      { id: "design-add", label: "디자인 추가" },
      { id: "design-files", label: "파일업로더" },
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
                      item.id === "popup" ? "🎯" :
                      item.id === "design" ? "🎨" : ""
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
function Table({ headers, rows, sortCol, sortDir, onSort }: {
  headers: string[];
  rows: React.ReactNode[][];
  sortCol?: string;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9F8F7" }}>
            {headers.map((h, i) => {
              const isSortable = onSort && h !== "관리" && h !== "";
              const isActive = sortCol === h;
              return (
                <th
                  key={i}
                  onClick={isSortable ? () => onSort(h) : undefined}
                  style={{
                    padding: "10px 14px", textAlign: "left", fontWeight: 700,
                    color: isActive ? C.primary : C.muted,
                    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                    cursor: isSortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {h}{isActive ? (sortDir === "asc" ? " ↑" : " ↓") : (isSortable ? " ⇅" : "")}
                </th>
              );
            })}
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
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>결제금액</span><span style={{ fontWeight: 700 }}>{krw(order.finalAmount ?? order.totalAmount)}</span></div>
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
function OrderDashboard({ onNavigate }: { onNavigate?: (id: string, opts?: { statusFilter?: string }) => void }) {
  const [orderDays, setOrderDays] = useState(30);
  const dashboard = trpc.admin.dashboard.useQuery();
  const chartsOrder = trpc.admin.dashboardCharts.useQuery({ days: orderDays });
  const d = dashboard.data;
  const ORDER_PERIODS = [
    { label: '최근 3개월', value: 90 },
    { label: '최근 6개월', value: 180 },
    { label: '최근 1년', value: 365 },
    { label: '전체', value: 730 },
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title="주문 대시보드" />
        <div style={{ display: 'flex', gap: 6 }}>
          {ORDER_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setOrderDays(p.value)}
              style={{
                padding: '6px 14px', fontSize: 12, borderRadius: 20,
                border: `1px solid ${orderDays === p.value ? C.primary : C.border}`,
                background: orderDays === p.value ? C.primary : C.white,
                color: orderDays === p.value ? '#fff' : C.text,
                cursor: 'pointer', fontWeight: orderDays === p.value ? 700 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {/* 실시간 매출 현황 */}
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: C.text }}>실시간 매출 현황</div>
          <div style={{ fontSize: "11px", color: C.muted }}>최종 업데이트: {new Date().toLocaleString("ko-KR")}</div>
        </div>
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
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#F0F7FF" }}>
              <td style={{ padding: "12px", fontWeight: 600, borderLeft: `3px solid ${C.blue}` }}>총 주문 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>{krw(d?.todayRevenue ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.todayOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right", color: C.primary, fontWeight: 700 }}>{krw(d?.monthRevenue ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.monthOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right" }}><Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-all", { statusFilter: "all" })}>주문조회</Btn></td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#F0FFF4" }}>
              <td style={{ padding: "12px", fontWeight: 600, borderLeft: `3px solid ${C.green}` }}>총 실 결제 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>{krw(d?.todayNetRevenue ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.todayOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right", color: C.primary, fontWeight: 700 }}>{krw(d?.monthNetRevenue ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>{d?.monthOrders ?? 0}건</span></td>
              <td style={{ padding: "12px", textAlign: "right" }}><Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-all", { statusFilter: "paid" })}>결제조회</Btn></td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px", color: C.muted }}>총 환불 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#991B1B", fontWeight: 700 }}>{krw(d?.todayRefundAmount ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>0건</span></td>
              <td style={{ padding: "12px", textAlign: "right", color: "#991B1B", fontWeight: 700 }}>{krw(d?.monthRefundAmount ?? 0)}<br /><span style={{ fontSize: "11px", color: C.muted }}>0건</span></td>
              <td style={{ padding: "12px", textAlign: "right" }}><Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-refund", {})}>환불조회</Btn></td>
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

// ─── Ord// ─── Order Section ────────────────────────────────────────────
function OrderSection({ subPage, onNavigate, initialStatusFilter }: { subPage: string; onNavigate?: (id: string, opts?: { statusFilter?: string }) => void; initialStatusFilter?: string }) {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<"orderId" | "name" | "email" | "productName">("orderId");
  const [viewType, setViewType] = useState<"order" | "item">("order");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? "all");

  // initialStatusFilter가 바뀌면 필터 초기화
  useEffect(() => {
    if (initialStatusFilter !== undefined) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [csTab, setCsTab] = useState("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [sortCol, setSortCol] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

   // ─── General order pages ──────────────────────────────────────────────────
  const effectiveStatus = subPage === "order-unpaid" ? "created" : statusFilter !== "all" ? statusFilter : undefined;
  const orders = trpc.admin.searchOrders.useQuery(
    {
      search: search || undefined,
      searchType: searchType || undefined,
      viewType,
      status: effectiveStatus as any,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit: pageSize,
      sortCol: subPage === "order-all" ? sortCol : undefined,
      sortDir: subPage === "order-all" ? sortDir : undefined,
    },
    { enabled: !isShippingPage && !isCsPage }
  );
  const totalCount = orders.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => { toast.success("주문 상태가 변경되었습니다."); orders.refetch(); },
  });
  const cancelOrder = trpc.order.cancel.useMutation({
    onSuccess: () => { toast.success("결제가 취소되었습니다."); orders.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null); // orderId

  // reset page when filters change
  const handleSearch = () => { setPage(1); orders.refetch(); };
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ─── Order Dashboard ─────────────────────────────────────────────────────────
  if (subPage === "order-dashboard") {
    return <OrderDashboard onNavigate={onNavigate as any} />;
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
              krw(o.finalAmount ?? o.totalAmount),
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

  // ─── General order list ──────────────────────────────────────────────────
  const title = subPage === "order-all" ? "전체 주문 조회"
    : subPage === "order-unpaid" ? "입금전 관리" : "주문 관리";

  return (
    <div>
      <SectionHeader title={title} />

      {/* 주문번호별 / 품목주문별 탭 - order-all에서만 표시 */}
      {subPage === "order-all" && (
        <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: `2px solid ${C.border}` }}>
          {(["order", "item"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setViewType(t)}
              style={{
                padding: "8px 20px",
                border: "none",
                borderBottom: viewType === t ? `2px solid ${C.primary}` : "2px solid transparent",
                background: "transparent",
                color: viewType === t ? C.primary : C.muted,
                fontWeight: viewType === t ? 700 : 400,
                fontSize: "14px",
                cursor: "pointer",
                marginBottom: "-2px",
              }}
            >
              {t === "order" ? "주문번호별" : "품목주문별"}
            </button>
          ))}
        </div>
      )}

      {/* 검색 필터 영역 */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
        {/* 기간 필터 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: C.muted, minWidth: "32px" }}>기간</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: C.text }}
          />
          <span style={{ color: C.muted }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: C.text }}
          />
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#F9FAFB", fontSize: "12px", cursor: "pointer", color: C.muted }}
          >전체기간</button>
          {["today", "week", "month"].map((p) => (
            <button
              key={p}
              onClick={() => {
                const now = new Date();
                const from = new Date();
                if (p === "today") { /* from = now */ }
                else if (p === "week") from.setDate(now.getDate() - 7);
                else if (p === "month") from.setMonth(now.getMonth() - 1);
                setDateFrom(from.toISOString().slice(0, 10));
                setDateTo(now.toISOString().slice(0, 10));
              }}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#F9FAFB", fontSize: "12px", cursor: "pointer", color: C.text }}
            >
              {p === "today" ? "오늘" : p === "week" ? "1주일" : "1개월"}
            </button>
          ))}
        </div>

        {/* 검색어 + 검색 타입 + 상태 필터 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 10px", fontSize: "13px", color: C.text, background: "#fff" }}
          >
            <option value="orderId">주문번호</option>
            <option value="name">주문자명</option>
            <option value="email">이메일</option>
            {viewType === "item" && <option value="productName">상품명</option>}
          </select>
          <SearchBar value={search} onChange={setSearch} placeholder="검색어를 입력하세요" />
          {subPage === "order-all" && (
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={[
              { value: "all", label: "전체 상태" },
              { value: "created", label: "입금전" },
              { value: "paid", label: "결제완료" },
              { value: "failed", label: "실패" },
              { value: "cancelled", label: "취소" },
            ]} />
          )}
          {subPage === "order-all" && (
            <button
              onClick={() => setShowExcelModal(true)}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", padding: "6px 14px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer", color: C.text, fontWeight: 600 }}
            >
              📅 엑셀 다운로드
            </button>
          )}
        </div>
      </div>
      {/* 표시 개수 선택 */}
      {(subPage === "order-all" || subPage === "order-unpaid") && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", color: C.muted }}>페이지당 표시</span>
          {([20, 50, 100] as const).map((n) => (
            <button
              key={n}
              onClick={() => { setPageSize(n); setPage(1); }}
              style={{ padding: "4px 12px", borderRadius: "6px", border: `1.5px solid ${pageSize === n ? C.primary : C.border}`, background: pageSize === n ? C.primary : "#fff", color: pageSize === n ? "#fff" : C.text, fontSize: "13px", cursor: "pointer", fontWeight: pageSize === n ? 700 : 400 }}
            >{n}개</button>
          ))}
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>총 {totalCount.toLocaleString()}건</span>
        </div>
      )}

      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={subPage === "order-all"
            ? ["주문일", "주문번호", "회원", "주문명", "총 상품 구매금액", "총 실결제금액", "결제수단", "결제상태", "배송상태", "관리"]
            : ["주문번호", "회원", "주문명", "금액", "결제상태", "배송상태", "결제일", "관리"]}
          sortCol={subPage === "order-all" ? sortCol : undefined}
          sortDir={subPage === "order-all" ? sortDir : undefined}
          onSort={subPage === "order-all" ? (col) => { toggleSort(col); setPage(1); } : undefined}
          rows={(orders.data?.items ?? []).map((item: any) => {
            const o = item.o;
            const paymentMethodLabel = o.paymentMethod === "card" ? "카드" : o.paymentMethod === "bank_transfer" || o.paymentMethod === "virtualAccount" ? "무통장입금" : o.paymentMethod === "tosspay" ? "토스페이" : o.paymentMethod === "kakaopay" ? "카카오페이" : o.paymentMethod ?? "—";
            if (subPage === "order-all") {
              return [
                <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(o.createdAt)}</div>,
                <button style={{ fontFamily: "monospace", fontSize: "11px", color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }} onClick={() => setDetailOrderId(o.orderId)}>{o.orderId}</button>,
                <div><div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div><div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div></div>,
                o.orderName ?? "—",
                <span style={{ fontWeight: 600 }}>{krw(o.totalAmount)}</span>,
                <span style={{ fontWeight: 600, color: C.primary }}>{krw(o.finalAmount ?? o.totalAmount)}</span>,
                <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "4px", background: "#F3F4F6" }}>{paymentMethodLabel}</span>,
                <StatusBadge status={o.status} />,
                <ShippingBadge status={o.shippingStatus ?? "none"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  <Btn size="sm" variant="outline" onClick={() => setDetailOrderId(o.orderId)}>상세</Btn>
                  {o.status !== "cancelled" && (
                    <Btn size="sm" variant="danger" onClick={() => setCancelConfirm(o.orderId)}>취소</Btn>
                  )}
                </div>,
              ];
            }
            return [
              <button style={{ fontFamily: "monospace", fontSize: "11px", color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }} onClick={() => setDetailOrderId(o.orderId)}>{o.orderId}</button>,
              <div><div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div><div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div></div>,
              o.orderName ?? "—",
              krw(o.finalAmount ?? o.totalAmount),
              <StatusBadge status={o.status} />,
              <ShippingBadge status={o.shippingStatus ?? "none"} />,
              fmtDate(o.paidAt),
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn size="sm" variant="outline" onClick={() => setDetailOrderId(o.orderId)}>상세</Btn>
                {subPage === "order-unpaid" && o.status === "created" && (
                  <Btn size="sm" variant="primary" onClick={() => {
                    if (window.confirm(`주문번호 ${o.orderId}의 입금을 확인하시겠습니까?\n입금 확인 시 결제완료 상태로 변경됩니다.`)) {
                      updateStatus.mutate({ orderId: o.orderId, status: "paid" });
                    }
                  }}>입금확인</Btn>
                )}
                {o.status !== "cancelled" && (
                  <Btn size="sm" variant="danger" onClick={() => setCancelConfirm(o.orderId)}>취소</Btn>
                )}
              </div>,
            ];
          })}
        />
      </div>
      {/* 페이지네이션 */}
      {(subPage === "order-all" || subPage === "order-unpaid") && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === 1 ? "#F9FAFB" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? C.muted : C.text, fontSize: "13px" }}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === 1 ? "#F9FAFB" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? C.muted : C.text, fontSize: "13px" }}>‹</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const p = start + i;
            return p <= totalPages ? (
              <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1.5px solid ${page === p ? C.primary : C.border}`, background: page === p ? C.primary : "#fff", color: page === p ? "#fff" : C.text, fontSize: "13px", cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>{p}</button>
            ) : null;
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === totalPages ? "#F9FAFB" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? C.muted : C.text, fontSize: "13px" }}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === totalPages ? "#F9FAFB" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? C.muted : C.text, fontSize: "13px" }}>»</button>
        </div>
      )}

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
      {showExcelModal && (
        <ExcelDownloadModal
          onClose={() => setShowExcelModal(false)}
          defaultStatus={statusFilter !== "all" ? statusFilter as any : undefined}
          defaultSearch={search}
          defaultSearchType={searchType}
          defaultViewType={viewType}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PRODUCT
// ═══════════════════════════════════════════════════════════════════════════════
function ProductSection({ subPage }: { subPage: string }) {
  const productsQuery = trpc.admin.allProducts.useQuery();
  const utils = trpc.useUtils();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 체크박스 일괄 노출 상태 변경
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const bulkUpdateVisible = trpc.admin.updateProduct.useMutation;
  const bulkVisibleMutation = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { utils.admin.allProducts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleBulkVisible = async (visible: boolean, pagedItems: any[]) => {
    if (selectedIds.length === 0) { toast.error('상품을 선택해주세요.'); return; }
    await Promise.all(selectedIds.map(id => bulkVisibleMutation.mutateAsync({ id, visible })));
    toast.success(`${selectedIds.length}개 상품을 ${visible ? '노출' : '미노출'}로 변경했습니다.`);
    setSelectedIds([]);
    utils.admin.allProducts.invalidate();
  };

  // 신규 상품 등록 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", slug: "", priceConsumer: "", pricePro: "",
    productCode: "", description: "", stock: "999",
    visible: true, isNew: false,
  });
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createProductMutation = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success("상품이 등록되었습니다.");
      utils.admin.allProducts.invalidate();
      setShowCreateModal(false);
      setCreateForm({ name: "", slug: "", priceConsumer: "", pricePro: "", productCode: "", description: "", stock: "999", visible: true, isNew: false });
      setCreateImageFile(null);
      setCreateImagePreview(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadImageMutation = trpc.admin.uploadProductImage.useMutation();

  const deleteProductMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => { toast.success("상품이 삭제되었습니다."); utils.admin.allProducts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.slug || !createForm.priceConsumer) {
      toast.error("상품명, 슬러그, 소비자가는 필수입니다.");
      return;
    }
    setIsCreating(true);
    try {
      let imageUrl: string | undefined;
      if (createImageFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(createImageFile);
        });
        const uploaded = await uploadImageMutation.mutateAsync({
          filename: createImageFile.name,
          contentType: createImageFile.type,
          base64Data: base64,
        });
        imageUrl = uploaded.url;
      }
      await createProductMutation.mutateAsync({
        name: createForm.name,
        slug: createForm.slug,
        priceConsumer: createForm.priceConsumer,
        pricePro: createForm.pricePro || createForm.priceConsumer,
        productCode: createForm.productCode || undefined,
        description: createForm.description || undefined,
        stock: parseInt(createForm.stock) || 999,
        visible: createForm.visible,
        isNew: createForm.isNew,
        imageUrl,
        thumbnailUrl: imageUrl,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success("URL이 복사되었습니다.");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const allProducts = productsQuery.data ?? [];
  const filtered = allProducts.filter((p: any) => {
    const matchSearch = !searchText || p.name?.toLowerCase().includes(searchText.toLowerCase()) || p.productCode?.toLowerCase().includes(searchText.toLowerCase());
    const matchVisible = filterVisible === "all" || (filterVisible === "visible" && p.visible) || (filterVisible === "hidden" && !p.visible);
    return matchSearch && matchVisible;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 상세 페이지 표시
  if (selectedProductId !== null && (subPage === "product-list" || subPage === "product-manage")) {
    return <ProductDetailPage productId={selectedProductId} onBack={() => setSelectedProductId(null)} />;
  }

  if (subPage === "product-dashboard") {
    return (
      <div>
        <SectionHeader title="상품 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="전체 상품" value={allProducts.length} />
          <SummaryCard label="노출 중" value={allProducts.filter((p: any) => p.visible).length} color={C.green} />
          <SummaryCard label="전문가 전용" value={allProducts.filter((p: any) => p.isProOnly).length} color={C.primary} />
          <SummaryCard label="재고 없음" value={allProducts.filter((p: any) => p.stock === 0).length} color={C.orange} />
        </div>
      </div>
    );
  }

  if (subPage === "product-register") {
    return (
      <div>
        <SectionHeader title="상품 등록" />
        <div style={{ background: C.white, borderRadius: "12px", padding: "32px", border: `1px solid ${C.border}`, maxWidth: "640px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>상품명 <span style={{ color: "red" }}>*</span></label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="예: REAGE S1 크림" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>슬러그 (URL 식별자) <span style={{ color: "red" }}>*</span></label>
              <input value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} placeholder="예: reage-s1-cream" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>소비자가 <span style={{ color: "red" }}>*</span></label>
              <input value={createForm.priceConsumer} onChange={e => setCreateForm(f => ({ ...f, priceConsumer: e.target.value }))} placeholder="예: 150000" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>전문가 가격</label>
              <input value={createForm.pricePro} onChange={e => setCreateForm(f => ({ ...f, pricePro: e.target.value }))} placeholder="예: 120000 (비워두면 소비자가와 동일)" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>상품코드</label>
              <input value={createForm.productCode} onChange={e => setCreateForm(f => ({ ...f, productCode: e.target.value }))} placeholder="예: P-001" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>재고</label>
              <input value={createForm.stock} onChange={e => setCreateForm(f => ({ ...f, stock: e.target.value }))} placeholder="999" type="number" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>상품 설명</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="상품 간략 설명" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>대표 이미지</label>
            <DropzoneUploader
              preview={createImagePreview}
              onFileSelect={(file) => {
                setCreateImageFile(file);
                const reader = new FileReader();
                reader.onload = (ev) => setCreateImagePreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
              onClear={() => { setCreateImageFile(null); setCreateImagePreview(null); }}
              uploading={uploadImageMutation.isPending}
              height={160}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={createForm.visible} onChange={e => setCreateForm(f => ({ ...f, visible: e.target.checked }))} />
              노출
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={createForm.isNew} onChange={e => setCreateForm(f => ({ ...f, isNew: e.target.checked }))} />
              신상품 표시
            </label>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleCreateSubmit}
              disabled={isCreating}
              style={{ padding: "10px 28px", background: C.primary, color: C.white, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: isCreating ? "wait" : "pointer", opacity: isCreating ? 0.7 : 1 }}
            >
              {isCreating ? "등록 중..." : "상품 등록"}
            </button>
          </div>
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
            headers={["상품명", "상품코드", "현재 재고", "상태"]}
            rows={allProducts.map((p: any) => [
              <button onClick={() => setSelectedProductId(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontWeight: 600, textAlign: "left" }}>{p.name}</button>,
              <span style={{ fontSize: "12px", color: C.muted, fontFamily: "monospace" }}>{p.productCode || "—"}</span>,
              <span style={{ fontWeight: 700 }}>{p.stock}</span>,
              <StatusBadge status={p.stock > 0 ? "active" : "inactive"} />,
            ])}
          />
        </div>
      </div>
    );
  }

  // 상품 목록 / 상품 관리 (카페24 스타일)
  return (
    <div>
      <SectionHeader title={subPage === "product-list" ? "상품 목록" : subPage === "product-manage" ? "상품 관리" : "분류 관리"} />

      {/* 검색/필터 바 */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="상품명 또는 상품코드 검색"
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", width: "280px", outline: "none" }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "visible", "hidden"] as const).map(v => (
            <button key={v} onClick={() => { setFilterVisible(v); setPage(1); }}
              style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${filterVisible === v ? C.primary : C.border}`, background: filterVisible === v ? C.primary : C.white, color: filterVisible === v ? C.white : C.text, fontSize: "12px", cursor: "pointer", fontWeight: filterVisible === v ? 700 : 400 }}>
              {v === "all" ? "전체" : v === "visible" ? "노출" : "미노출"}
            </button>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
            <span style={{ fontSize: "12px", color: C.muted, alignSelf: "center" }}>{selectedIds.length}개 선택</span>
            <button onClick={() => handleBulkVisible(true, paged)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${C.green}`, background: "#F0FDF4", color: C.green, fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>노출</button>
            <button onClick={() => handleBulkVisible(false, paged)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid #F59E0B`, background: "#FFFBEB", color: "#92400E", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>미노출</button>
          </div>
        )}
        <span style={{ marginLeft: "auto", fontSize: "13px", color: C.muted }}>총 {filtered.length}개</span>
      </div>

      {/* 상품 목록 테이블 */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F9F8F7", borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "36px" }}>
                <input type="checkbox" checked={paged.length > 0 && paged.every((p: any) => selectedIds.includes(p.id))} onChange={e => { setSelectedIds(e.target.checked ? paged.map((p: any) => p.id) : []); }} />
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "40px", fontWeight: 600, color: C.muted }}>No</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "80px", fontWeight: 600, color: C.muted }}>상품구분</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "100px", fontWeight: 600, color: C.muted }}>상품코드</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.muted }}>상품명</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: "100px", fontWeight: 600, color: C.muted }}>판매가</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: "100px", fontWeight: 600, color: C.muted }}>할인가</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>재고</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>노출</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "220px", fontWeight: 600, color: C.muted }}>상세페이지 URL</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {productsQuery.isLoading ? (
              <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: C.muted }}>불러오는 중...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: "40px", textAlign: "center", color: C.muted }}>상품이 없습니다.</td></tr>
            ) : paged.map((p: any, idx: number) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}`, background: selectedIds.includes(p.id) ? "#FFF7ED" : (idx % 2 === 0 ? C.white : "#FAFAF9") }}>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => handleToggleSelect(p.id)} />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center", color: C.muted }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: p.isNew ? "#EFF6FF" : "#F3F4F6", color: p.isNew ? C.blue : C.muted }}>
                    {p.isNew ? "신상품" : "기본상품"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <button
                    onClick={() => setSelectedProductId(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontSize: "12px", fontFamily: "monospace", textDecoration: "underline", padding: 0 }}
                  >
                    {p.productCode || "—"}
                  </button>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {(p.imageUrl || p.thumbnailUrl) && (
                      <img src={p.thumbnailUrl || p.imageUrl} alt={p.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px", border: `1px solid ${C.border}`, flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
                    )}
                    <button
                      onClick={() => setSelectedProductId(p.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontWeight: 600, textAlign: "left", padding: 0, fontSize: "13px" }}
                    >
                      {p.name}
                    </button>
                  </div>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{krw(p.priceConsumer)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: p.pricePro ? C.primary : C.muted }}>
                  {p.pricePro ? krw(p.pricePro) : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>{p.stock}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <StatusBadge status={p.visible ? "active" : "inactive"} />
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {p.detailPageUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: C.muted, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} title={p.detailPageUrl}>
                        {p.detailPageUrl}
                      </span>
                      <button
                        onClick={() => copyUrl(p.detailPageUrl, p.id)}
                        style={{ padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", background: copiedId === p.id ? C.green : C.white, color: copiedId === p.id ? C.white : C.text, fontSize: "11px", cursor: "pointer", flexShrink: 0, fontWeight: 600 }}
                      >
                        {copiedId === p.id ? "✓" : "복사"}
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: "11px", color: C.muted }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <button
                    onClick={() => {
                      if (window.confirm(`"상품명: ${p.name}"을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                        deleteProductMutation.mutate({ id: p.id });
                      }
                    }}
                    style={{ padding: "3px 8px", border: `1px solid #FCA5A5`, borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.white, cursor: page === 1 ? "default" : "pointer", color: page === 1 ? C.muted : C.text }}>이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)} style={{ padding: "6px 12px", border: `1px solid ${page === n ? C.primary : C.border}`, borderRadius: "6px", background: page === n ? C.primary : C.white, color: page === n ? C.white : C.text, cursor: "pointer", fontWeight: page === n ? 700 : 400 }}>{n}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.white, cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? C.muted : C.text }}>다음</button>
        </div>
      )}
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
  const [confirmAction, setConfirmAction] = useState<null | { type: "approve" | "reject"; id: number; userId: string }>(null);
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
    : subPage === "customer-inquiry" ? "문의 관리"
    : "사업자 인증";

  if (subPage === "customer-inquiry") {
    return <InquirySection />;
  }

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

// ─── 엑셀 내보내기 버튼 ─────────────────────────────────────────────────────────
function ExportButton({ statusFilter, typeFilter }: { statusFilter: string; typeFilter: string }) {
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();

  const TYPE_LABEL: Record<string, string> = {
    trial: "체험예약",
    introduction: "도입상담",
    education: "교육문의",
  };
  const STATUS_LABEL: Record<string, string> = {
    received: "접수",
    contacted: "연락완료",
    closed: "종료",
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await utils.sbContact.exportAll.fetch({
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        inquiry_type: typeFilter !== "all" ? (typeFilter as any) : undefined,
      });

      const rows = (result?.items ?? []).map((item: any) => ({
        "접수번호": item.id,
        "문의유형": TYPE_LABEL[item.inquiry_type] ?? item.inquiry_type,
        "이름": item.name ?? "",
        "연락처": item.phone ?? "",
        "이메일": item.email ?? "",
        "상호명": item.shop_name ?? "",
        "지역": item.region ?? "",
        "선호날짜": item.preferred_date ?? "",
        "교육프로그램": item.education_program ?? "",
        "문의내용": item.message ?? "",
        "개인정보동의": item.privacy_agreed ? "동의" : "미동의",
        "상태": STATUS_LABEL[item.status] ?? item.status,
        "관리자메모": item.admin_memo ?? "",
        "접수일시": item.created_at ? new Date(item.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      // 열 너비 자동 설정
      ws["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 24 },
        { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 40 },
        { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 22 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "문의목록");
      const now = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `REAGE_문의목록_${now}.xlsx`);
      toast.success(`${rows.length}건 엑셀 파일 다운로드 완료`);
    } catch (e: any) {
      toast.error("엑셀 내보내기 실패: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
        padding: "5px 14px", fontSize: "13px", borderRadius: "8px",
        border: `1px solid ${C.border}`, background: C.white, cursor: exporting ? "not-allowed" : "pointer",
        color: C.text, opacity: exporting ? 0.6 : 1,
      }}
    >
      {exporting ? "내보내는 중..." : "📥 엑셀 내보내기"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: INQUIRY (Supabase contact_inquiries)
// ═══════════════════════════════════════════════════════════════════════════════
function InquirySection() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [adminMemo, setAdminMemo] = useState("");

  const inquiries = trpc.sbContact.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    inquiry_type: typeFilter !== "all" ? (typeFilter as any) : undefined,
    page,
    limit: 20,
  });

  const updateStatus = trpc.sbContact.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("문의 상태가 변경되었습니다.");
      inquiries.refetch();
      setDetailOpen(false);
    },
    onError: (e) => toast.error("상태 변경 실패: " + e.message),
  });

  const openDetail = (item: any) => {
    setSelectedInquiry(item);
    setAdminMemo(item.admin_memo ?? "");
    setDetailOpen(true);
  };

  const total = inquiries.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <SectionHeader title="문의 관리" />
      {/* 필터 바 */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <FilterSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { value: "all", label: "전체 상태" },
            { value: "received", label: "접수" },
            { value: "contacted", label: "연락완료" },
            { value: "closed", label: "종료" },
          ]}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "all", label: "전체 유형" },
            { value: "trial", label: "체험예약" },
            { value: "introduction", label: "도입상담" },
            { value: "education", label: "교육문의" },
          ]}
        />
        <span style={{ fontSize: "13px", color: C.muted, marginLeft: "auto" }}>전체 {total}건</span>
        <ExportButton statusFilter={statusFilter} typeFilter={typeFilter} />
      </div>

      {/* 문의 목록 테이블 */}
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["유형", "이름", "연락처", "상호명", "지역", "상태", "접수일", "관리"]}
          rows={(inquiries.data?.items ?? []).map((item: any) => [
            <StatusBadge status={item.inquiry_type} />,
            item.name ?? "—",
            item.phone ?? "—",
            item.shop_name ?? "—",
            item.region ?? "—",
            <StatusBadge status={item.status} />,
            fmtDate(item.created_at),
            <Btn size="sm" variant="outline" onClick={() => openDetail(item)}>상세</Btn>,
          ])}
        />
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px" }}>
          <Btn size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← 이전</Btn>
          <span style={{ fontSize: "13px", padding: "6px 12px", color: C.muted }}>{page} / {totalPages}</span>
          <Btn size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음 →</Btn>
        </div>
      )}

      {/* 문의 상세 모달 */}
      {detailOpen && selectedInquiry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 800 }}>문의 상세</h3>
              <button onClick={() => setDetailOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: "12px", fontSize: "13px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>문의 유형</span><StatusBadge status={selectedInquiry.inquiry_type} /></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>이름</span><span style={{ fontWeight: 600 }}>{selectedInquiry.name}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>연락처</span><span>{selectedInquiry.phone}</span></div>
              {selectedInquiry.email && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>이메일</span><span>{selectedInquiry.email}</span></div>}
              {selectedInquiry.shop_name && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>상호명</span><span>{selectedInquiry.shop_name}</span></div>}
              {selectedInquiry.region && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>지역</span><span>{selectedInquiry.region}</span></div>}
              {selectedInquiry.preferred_date && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>선호 날짜</span><span>{selectedInquiry.preferred_date}</span></div>}
              {selectedInquiry.education_program && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>교육 코스</span><span>{selectedInquiry.education_program}</span></div>}
              {selectedInquiry.message && (
                <div>
                  <div style={{ color: C.muted, marginBottom: "6px" }}>문의 내용</div>
                  <div style={{ background: C.bg, borderRadius: "8px", padding: "12px", fontSize: "13px", lineHeight: 1.7 }}>{selectedInquiry.message}</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.muted }}>접수일</span><span>{fmtDate(selectedInquiry.created_at)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.muted }}>상태</span>
                <FilterSelect
                  value={selectedInquiry.status}
                  onChange={(v) => {
                    updateStatus.mutate({ id: String(selectedInquiry.id), status: v as any, admin_memo: adminMemo });
                    setSelectedInquiry({ ...selectedInquiry, status: v });
                  }}
                  options={[
                    { value: "received", label: "접수" },
                    { value: "contacted", label: "연락완료" },
                    { value: "closed", label: "종료" },
                  ]}
                />
              </div>
            </div>

            {/* 관리자 메모 */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: C.text }}>관리자 메모</div>
              <textarea
                value={adminMemo}
                onChange={(e) => setAdminMemo(e.target.value)}
                placeholder="내부 메모 입력..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setDetailOpen(false)}>닫기</Btn>
              <Btn
                onClick={() => updateStatus.mutate({ id: String(selectedInquiry.id), status: selectedInquiry.status as any, admin_memo: adminMemo })}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? "저장 중..." : "메모 저장"}
              </Btn>
            </div>
          </div>
        </div>
      )}
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
  const uploadImage = trpc.admin.uploadPostImage.useMutation();

  // 리치 에디터 내 이미지 업로드 핸들러
  const handleEditorImageUpload = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = ev => resolve((ev.target?.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    const result = await uploadImage.mutateAsync({
      fileBase64: base64,
      fileName: file.name,
      fileMimeType: file.type,
      postType: type,
    });
    return result.url;
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
          <DropzoneUploader
            preview={coverPreview || null}
            onFileSelect={(file) => {
              setCoverFile(file);
              const reader = new FileReader();
              reader.onload = ev => setCoverPreview(ev.target?.result as string);
              reader.readAsDataURL(file);
            }}
            onClear={() => { setCoverFile(null); setCoverPreview(""); }}
            uploading={uploading && !!coverFile}
            height={160}
          />
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>내용</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            onImageUpload={handleEditorImageUpload}
            placeholder="내용을 입력하세요..."
            minHeight={400}
          />
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const list = trpc.adminExt.certifiedInstructorList.useQuery({ page: 1, limit: 200 });
  const uploadImage = trpc.adminExt.uploadCertifiedInstructorImage.useMutation();
  const createItem = trpc.adminExt.createCertifiedInstructor.useMutation({
    onSuccess: () => { toast.success("인증강사 사진이 등록되었습니다."); list.refetch(); setNameInput(""); setDescInput(""); setPendingFile(null); setPendingPreview(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteItem = trpc.adminExt.deleteCertifiedInstructor.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); list.refetch(); setDeleteConfirm(null); },
  });
  const togglePublish = trpc.adminExt.updateCertifiedInstructor.useMutation({
    onSuccess: () => { list.refetch(); },
  });

  const handleUpload = async () => {
    if (!pendingFile) { toast.error("이미지를 먼저 선택해주세요."); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = ev => res((ev.target?.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(pendingFile);
      });
      const { url, key } = await uploadImage.mutateAsync({ fileBase64: base64, fileName: pendingFile.name, fileMimeType: pendingFile.type });
      await createItem.mutateAsync({ imageUrl: url, imageKey: key, name: nameInput || undefined, description: descInput || undefined, isPublished: true });
    } catch(err) {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
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
        <DropzoneUploader
          preview={pendingPreview}
          onFileSelect={(file) => {
            setPendingFile(file);
            const reader = new FileReader();
            reader.onload = ev => setPendingPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
          }}
          onClear={() => { setPendingFile(null); setPendingPreview(null); }}
          uploading={uploading}
          height={140}
          hint="JPG, PNG, WEBP · 최대 10MB"
        />
        {pendingFile && (
          <div style={{ marginTop: "12px" }}>
            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{ padding: "10px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? "등록 중..." : "인증강사 등록"}
            </button>
          </div>
        )}
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
    const matchGrade = gradeFilter === "all" || (u.memberRole ?? "consumer") === gradeFilter;
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
  const [selectedProductId, setSelectedProductId] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reviews = trpc.admin.reviewList.useQuery({ category: selectedCategory, page: 1, limit: 100 });
  const productsQuery = trpc.admin.allProducts.useQuery();
  const uploadImage = trpc.admin.uploadReviewImage.useMutation();
  const createReview = trpc.admin.createReview.useMutation({
    onSuccess: () => { toast.success("후기 사진이 등록되었습니다."); reviews.refetch(); setTitleInput(""); setDescInput(""); setSelectedProductId(""); },
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
        productId: selectedProductId || undefined,
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
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>연결 상품 (선택)</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", boxSizing: "border-box" as any, background: "#fff" }}
            >
              <option value="">상품 연결 안 함</option>
              {(productsQuery.data ?? []).map((product: any) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
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
                {r.productId && (
                  <div style={{ padding: "0 10px 8px", fontSize: "11px", color: C.primary, background: C.white }}>
                    {(productsQuery.data ?? []).find((product: any) => product.id === r.productId)?.name ?? "연결 상품"}
                  </div>
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
  const [deleteConfirm, setDeleteConfirm] = useState<null | { id: string; type: "gallery" | "magazine" }>(null);

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
              <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm({ id: String(p.id), type })}>삭제</Btn>
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
// SECTION: INQUIRY STATS
// ═══════════════════════════════════════════════════════════════════════════════
function InquiryStatsSection() {
  const [periodMonths, setPeriodMonths] = useState<number | undefined>(undefined);
  const stats = trpc.sbContact.stats.useQuery({ months: periodMonths });

  const PERIODS: { label: string; value: number | undefined }[] = [
    { label: '전체', value: undefined },
    { label: '최근 3개월', value: 3 },
    { label: '최근 6개월', value: 6 },
    { label: '최근 1년', value: 12 },
  ];
  const d = stats.data;

  if (stats.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.muted }}>
        데이터를 불러오는 중...
      </div>
    );
  }
  if (stats.error) {
    return (
      <div style={{ padding: 32, color: "#dc2626", textAlign: "center" }}>
        통계 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  const kpi = d?.kpi ?? { total: 0, thisMonth: 0, unhandled: 0, processingRate: 0 };
  const monthly = d?.monthly ?? [];
  const byType = d?.byType ?? [];
  const byStatus = d?.byStatus ?? [];
  const funnel = (d as any)?.funnel ?? [];
  const byRegion = (d as any)?.byRegion ?? [];
  const conversionStats = (d as any)?.conversionStats ?? null;

  // 월 레이블 포맷 (2025-03 → 3월)
  const fmtMonth = (m: string) => {
    const [, mm] = m.split("-");
    return `${parseInt(mm)}월`;
  };

  // 코어 스타일
  const card = (label: string, value: string | number, sub?: string, accent?: string) => (
    <div style={{
      background: C.white, borderRadius: 12, padding: "20px 24px",
      border: `1px solid ${C.border}`, flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: accent ?? C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SectionHeader title="문의 통계" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {PERIODS.map((p) => (
            <button
              key={String(p.value)}
              onClick={() => setPeriodMonths(p.value)}
              style={{
                padding: '6px 14px', fontSize: 12, borderRadius: 20,
                border: `1px solid ${periodMonths === p.value ? C.primary : C.border}`,
                background: periodMonths === p.value ? C.primary : C.white,
                color: periodMonths === p.value ? '#fff' : C.text,
                cursor: 'pointer', fontWeight: periodMonths === p.value ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => stats.refetch()}
            style={{
              padding: '6px 12px', fontSize: 12, borderRadius: 20,
              border: `1px solid ${C.border}`, background: C.white,
              cursor: 'pointer', color: C.muted,
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {card("전체 문의", kpi.total, "누적 접수 건수")}
        {card("이번 달 문의", kpi.thisMonth, "이번 달 접수", C.primary)}
        {card("미처리 문의", kpi.unhandled, "접수 상태 대기 중", "#D97706")}
        {card("처리율", `${kpi.processingRate}%`, "연락완료 + 종료 기준", "#059669")}
      </div>

      {/* 월별 문의 건수 차트 */}
      <div style={{
        background: C.white, borderRadius: 12, padding: "20px 24px",
        border: `1px solid ${C.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>월별 문의 건수</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(l) => `${l}`}
              formatter={(v: number, name: string) => [
                `${v}건`,
                name === "trial" ? "체험예약" : name === "introduction" ? "도입상담" : "교육문의",
              ]}
            />
            <Legend formatter={(v) => v === "trial" ? "체험예약" : v === "introduction" ? "도입상담" : "교육문의"} />
            <Bar dataKey="trial" stackId="a" fill="#6B0F1A" radius={[0, 0, 0, 0]} />
            <Bar dataKey="introduction" stackId="a" fill="#C9A96E" />
            <Bar dataKey="education" stackId="a" fill="#4B5563" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 유형별 비율 + 상태별 처리현황 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* 유형별 파이 차트 */}
        <div style={{
          background: C.white, borderRadius: 12, padding: "20px 24px",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>유형별 비율</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={byType}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {byType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}건`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {byType.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: C.text }}>{item.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value}건</div>
                  <div style={{ fontSize: 12, color: C.muted, minWidth: 36, textAlign: "right" }}>
                    {kpi.total > 0 ? `${Math.round((item.value / kpi.total) * 100)}%` : "0%"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상태별 처리현황 */}
        <div style={{
          background: C.white, borderRadius: 12, padding: "20px 24px",
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>상태별 처리현황</div>
          {byStatus.map((item) => {
            const pct = kpi.total > 0 ? Math.round((item.value / kpi.total) * 100) : 0;
            return (
              <div key={item.name} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontSize: 13, color: C.text }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.value}건 <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: item.color, borderRadius: 4,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            );
          })}
          <div style={{
            marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, color: C.muted }}>전체 처리율</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{kpi.processingRate}%</span>
          </div>
        </div>
      </div>

      {/* 퍼널 차트 + 지역별 분포 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* 퍼널 차트 - 실제 전환율 추적 */}
        <div style={{
          background: C.white, borderRadius: 12, padding: '20px 24px',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>고객 전환 퍼널</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>동일 고객(phone/email 기준)의 단계별 전환 추적</div>
          {funnel.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>데이터 없음</div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {funnel.map((item: { stage: string; value: number; uniqueCustomers: number; fill: string }, idx: number) => {
                const maxVal = funnel[0]?.uniqueCustomers || funnel[0]?.value || 1;
                const uniqueVal = item.uniqueCustomers ?? item.value;
                const pct = Math.round((uniqueVal / maxVal) * 100);
                // 실제 전환율 (conversionStats 사용)
                let realConvRate: number | null = null;
                if (conversionStats) {
                  if (idx === 1) realConvRate = conversionStats.trialToIntroRate;
                  else if (idx === 2) realConvRate = conversionStats.introToEduRate;
                }
                return (
                  <div key={item.stage} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.fill }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.stage}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {realConvRate !== null && (
                          <span style={{ fontSize: 11, color: realConvRate >= 30 ? '#059669' : realConvRate >= 10 ? '#D97706' : C.muted, background: realConvRate >= 30 ? '#ECFDF5' : realConvRate >= 10 ? '#FFFBEB' : '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                            전환 {realConvRate}%
                          </span>
                        )}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value}건</div>
                          {item.uniqueCustomers !== undefined && item.uniqueCustomers !== item.value && (
                            <div style={{ fontSize: 11, color: C.muted }}>고객 {item.uniqueCustomers}명</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 28, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: item.fill,
                        borderRadius: 6,
                        transition: 'width 0.6s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                      }}>
                        {pct > 15 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{pct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {conversionStats && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#F9F8F7', borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>전환 요약</div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: C.text }}>
                      체험→도입: <strong style={{ color: C.primary }}>{conversionStats.trialToIntroCount}명</strong> ({conversionStats.trialToIntroRate}%)
                    </div>
                    <div style={{ fontSize: 12, color: C.text }}>
                      도입→교육: <strong style={{ color: C.primary }}>{conversionStats.introToEduCount}명</strong> ({conversionStats.introToEduRate}%)
                    </div>
                    <div style={{ fontSize: 12, color: C.text }}>
                      체험→교육: <strong style={{ color: C.primary }}>{conversionStats.trialToEduCount}명</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 지역별 문의 분포 */}
        <div style={{
          background: C.white, borderRadius: 12, padding: '20px 24px',
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>지역별 문의 분포</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>상위 15개 지역</div>
          {byRegion.length === 0 ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>데이터 없음</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={byRegion}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v: number) => [`${v}건`, '지역']} />
                <Bar dataKey="value" fill={C.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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
  const [dashDays, setDashDays] = useState(30);
  const pageViewStats = trpc.admin.pageViewStats.useQuery({ days: dashDays });
  const orderStats2 = trpc.admin.dashboardCharts.useQuery({ days: dashDays });
  const DASH_PERIODS = [
    { label: '최근 3개월', value: 90 },
    { label: '최근 6개월', value: 180 },
    { label: '최근 1년', value: 365 },
    { label: '전체', value: 730 },
  ];

  const title = subPage === "stats-dashboard" ? "통계 대시보드"
    : subPage === "stats-inquiry" ? "문의 통계"
    : subPage === "stats-sales" ? "매출 분석"
    : subPage === "stats-product" ? "상품 분석"
    : subPage === "stats-customer" ? "고객 분석"
    : "접속 통계";

  if (subPage === "stats-dashboard") {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <SectionHeader title="통계 대시보드" />
          <div style={{ display: 'flex', gap: 6 }}>
            {DASH_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDashDays(p.value)}
                style={{
                  padding: '6px 14px', fontSize: 12, borderRadius: 20,
                  border: `1px solid ${dashDays === p.value ? C.primary : C.border}`,
                  background: dashDays === p.value ? C.primary : C.white,
                  color: dashDays === p.value ? '#fff' : C.text,
                  cursor: 'pointer', fontWeight: dashDays === p.value ? 700 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
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
            <div style={{ fontSize: "12px", color: C.muted }}>선택 기간 총 방문</div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === "stats-inquiry") {
    return <InquiryStatsSection />;
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
  const [orderInitialFilter, setOrderInitialFilter] = useState<string | undefined>(undefined);

  const navigateTo = (page: string, opts?: { statusFilter?: string }) => {
    if (opts?.statusFilter !== undefined) setOrderInitialFilter(opts.statusFilter);
    else setOrderInitialFilter(undefined);
    setActivePage(page);
  };

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
    if (activePage.startsWith("order-") || activePage === "order") return <OrderSection subPage={activePage} onNavigate={(p, opts) => navigateTo(p, opts)} initialStatusFilter={orderInitialFilter} />;
    if (activePage.startsWith("product-") || activePage === "product") return <ProductSection subPage={activePage} />;
    if (activePage.startsWith("customer-") || activePage === "customer") return <CustomerSection subPage={activePage} />;
    if (activePage.startsWith("board-") || activePage === "board") return <BoardSection subPage={activePage} />;
    if (activePage.startsWith("stats-") || activePage === "stats") return <StatsSection subPage={activePage} />;
    if (activePage.startsWith("popup-") || activePage === "popup") return <PopupSection subPage={activePage} onNavigate={setActivePage} />;
    if (activePage.startsWith("promotion-") || activePage === "promotion") return <PromotionSection subPage={activePage} onNavigate={setActivePage} />;
    if (activePage.startsWith("design-") || activePage === "design") return <DesignSection subPage={activePage} />;
    return <DashboardSection />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <Sidebar active={activePage} onSelect={(p) => navigateTo(p)} />
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>
        {renderContent()}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
function DesignSection({ subPage }: { subPage: string }) {
  if (subPage === "design-files") return <FileUploaderSection />;
  if (subPage === "design-library") return <DesignLibrarySection />;
  if (subPage === "design-add") return <DesignAddSection />;
  return <DesignDashboardSection />;
}

function DesignDashboardSection() {
  const files = trpc.adminExt.getDesignFiles.useQuery({});
  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const totalFiles = (files.data ?? []).length;
  const totalFolders = (folders.data ?? []).length;
  return (
    <div>
      <SectionHeader title="디자인 대시보드" />
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <SummaryCard label="전체 파일" value={totalFiles} />
        <SummaryCard label="폴더 수" value={totalFolders} />
      </div>
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>최근 업로드 파일</div>
        {(files.data ?? []).slice(0, 10).map((f: any) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            {f.mimeType?.startsWith("image/") ? (
              <img src={f.thumbnailUrl || f.fileUrl} alt={f.fileName} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${C.border}` }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = f.fileUrl; }} />
            ) : (
              <div style={{ width: "48px", height: "48px", background: "#F3F4F6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📄</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>{f.fileName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>{f.mimeType} · {Math.round((f.fileSize ?? 0) / 1024)}KB</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(f.fileUrl).then(() => toast.success("URL 복사됨"))} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "11px", cursor: "pointer" }}>URL 복사</button>
          </div>
        ))}
        {totalFiles === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "40px" }}>업로드된 파일이 없습니다.</div>}
      </div>
    </div>
  );
}

function DesignLibrarySection() {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const files = trpc.adminExt.getDesignFiles.useQuery({ folder: currentFolder });
  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const deleteFile = trpc.adminExt.deleteDesignFile.useMutation({
    onSuccess: () => { toast.success("파일이 삭제되었습니다."); files.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div>
      <SectionHeader title="디자인 보관함" />
      <div style={{ display: "flex", gap: "16px" }}>
        {/* 폴더 목록 */}
        <div style={{ width: "200px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", flexShrink: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.muted, marginBottom: "8px" }}>폴더</div>
          <button onClick={() => setCurrentFolder(undefined)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === undefined ? C.primary : "transparent", color: currentFolder === undefined ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>📁 전체 파일</button>
          {(folders.data ?? []).map((f: any) => (
            <button key={f.id} onClick={() => setCurrentFolder(f.name)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === f.name ? C.primary : "transparent", color: currentFolder === f.name ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>📂 {f.name}</button>
          ))}
        </div>
        {/* 파일 그리드 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {(files.data ?? []).map((f: any) => (
              <div key={f.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                {f.mimeType?.startsWith("image/") ? (
                  <img src={f.thumbnailUrl || f.fileUrl} alt={f.fileName} style={{ width: "100%", height: "100px", objectFit: "cover" }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = f.fileUrl; }} />
                ) : (
                  <div style={{ height: "100px", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>📄</div>
                )}
                <div style={{ padding: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.fileName}>{f.fileName}</div>
                  <div style={{ fontSize: "10px", color: C.muted }}>{Math.round((f.fileSize ?? 0) / 1024)}KB</div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                    <button onClick={() => navigator.clipboard.writeText(f.fileUrl).then(() => toast.success("URL 복사됨"))} style={{ flex: 1, padding: "3px 0", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "10px", cursor: "pointer" }}>복사</button>
                    <button onClick={() => { if (window.confirm("삭제하시겠습니까?")) deleteFile.mutate({ id: f.id }); }} style={{ padding: "3px 6px", border: "1px solid #FCA5A5", borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "10px", cursor: "pointer" }}>삭제</button>
                  </div>
                </div>
              </div>
            ))}
            {(files.data ?? []).length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, padding: "40px" }}>파일이 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignAddSection() {
  return (
    <div>
      <SectionHeader title="디자인 추가" />
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "32px", maxWidth: "600px" }}>
        <div style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>파일업로더를 통해 이미지 및 디자인 파일을 업로드한 후, 상품 상세페이지나 홈페이지 배너에 URL을 복사하여 사용하세요.</div>
        <FileUploaderSection embedded />
      </div>
    </div>
  );
}

function FileUploaderSection({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const files = trpc.adminExt.getDesignFiles.useQuery({ folder: currentFolder });
  const createFolder = trpc.adminExt.createDesignFolder.useMutation({
    onSuccess: () => { toast.success("폴더가 생성되었습니다."); folders.refetch(); setNewFolderName(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadFile = trpc.adminExt.uploadDesignFile.useMutation({
    onSuccess: () => { files.refetch(); utils.adminExt.getDesignFiles.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteFile = trpc.adminExt.deleteDesignFile.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다."); files.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: 10MB 초과`); continue; }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve((e.target?.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await uploadFile.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64, folder: currentFolder, fileSize: file.size });
      }
      toast.success("업로드 완료");
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = (files.data ?? []).filter((f: any) => !search || f.fileName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {!embedded && <SectionHeader title="파일업로더" />}
      <div style={{ display: "flex", gap: "16px" }}>
        {/* 폴더 사이드바 */}
        <div style={{ width: "200px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", flexShrink: 0, alignSelf: "flex-start" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.muted, marginBottom: "8px" }}>폴더</div>
          <button onClick={() => setCurrentFolder(undefined)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === undefined ? C.primary : "transparent", color: currentFolder === undefined ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>📁 ROOT</button>
          {(folders.data ?? []).map((f: any) => (
            <button key={f.id} onClick={() => setCurrentFolder(f.name)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === f.name ? C.primary : "transparent", color: currentFolder === f.name ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>📂 {f.name}</button>
          ))}
          <div style={{ marginTop: "12px", borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="새 폴더명" style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }} onKeyDown={e => { if (e.key === "Enter" && newFolderName.trim()) createFolder.mutate({ name: newFolderName.trim() }); }} />
            <button onClick={() => { if (newFolderName.trim()) createFolder.mutate({ name: newFolderName.trim() }); }} style={{ width: "100%", padding: "6px", border: `1px solid ${C.primary}`, borderRadius: "4px", background: C.primary, color: C.white, fontSize: "12px", cursor: "pointer" }}>+ 폴더 추가</button>
          </div>
        </div>

        {/* 메인 영역 */}
        <div style={{ flex: 1 }}>
          {/* 드래그앤드롭 영역 */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? C.primary : C.border}`, borderRadius: "8px", padding: "32px", textAlign: "center", cursor: "pointer", background: isDragging ? "#FFF7F7" : "#FAFAF9", marginBottom: "16px", transition: "all 0.2s" }}
          >
            {uploading ? (
              <div style={{ color: C.primary, fontWeight: 600 }}>업로드 중...</div>
            ) : (
              <>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Drag & Drop</div>
                <div style={{ fontSize: "13px", color: C.muted }}>여기에 이미지 파일/폴더를 끌어 놓으면 파일이 업로드됩니다.</div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>(파일용량: 한 개당 10MB이하, 이미지/HTML/CSS/JS/웹폰트 파일 업로드 가능)</div>
                <button style={{ marginTop: "12px", padding: "8px 20px", border: `1px solid ${C.primary}`, borderRadius: "6px", background: C.white, color: C.primary, fontSize: "13px", cursor: "pointer", fontWeight: 600 }} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>Add Files</button>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.html,.css,.js,.woff,.woff2,.ttf" style={{ display: "none" }} onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />

          {/* 검색 */}
          <div style={{ marginBottom: "12px" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일명을 입력하세요." style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", width: "280px", outline: "none" }} />
          </div>

          {/* 파일 목록 */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontSize: "12px", fontWeight: 700, color: C.muted }}>
              📁 {currentFolder ?? "ROOT"} — 총 {filteredFiles.length}개
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9F8F7", borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: C.muted }}>파일명</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", width: "80px", fontWeight: 600, color: C.muted }}>크기</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "120px", fontWeight: 600, color: C.muted }}>등록일</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "80px", fontWeight: 600, color: C.muted }}>주소복사</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: C.muted }}>파일이 없습니다.</td></tr>
                ) : filteredFiles.map((f: any) => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {f.mimeType?.startsWith("image/") ? (
                          <img src={f.thumbnailUrl || f.fileUrl} alt={f.fileName} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${C.border}`, flexShrink: 0 }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.src = f.fileUrl; }} />
                        ) : (
                          <span style={{ fontSize: "20px" }}>📄</span>
                        )}
                        <span style={{ fontWeight: 500 }}>{f.fileName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: C.muted }}>{Math.round((f.fileSize ?? 0) / 1024)}KB</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: C.muted, fontSize: "12px" }}>{new Date(f.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button onClick={() => navigator.clipboard.writeText(f.fileUrl).then(() => toast.success("URL이 복사되었습니다."))} style={{ padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "11px", cursor: "pointer" }}>복사</button>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <button onClick={() => { if (window.confirm("삭제하시겠습니까?")) deleteFile.mutate({ id: f.id }); }} style={{ padding: "3px 8px", border: "1px solid #FCA5A5", borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "11px", cursor: "pointer" }}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: ExcelDownloadModal
// 주문관리 다운로드 - 양식 선택, 엑셀 요청, 다운로드 이력
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_AVAILABLE_COLS = [
  { key: "orderId", label: "주문번호" },
  { key: "createdAt", label: "주문일" },
  { key: "recipientName", label: "주문자명" },
  { key: "userEmail", label: "이메일" },
  { key: "orderName", label: "주문명" },
  { key: "totalAmount", label: "총 상품 구매금액" },
  { key: "paidAmount", label: "총 실결제금액" },
  { key: "paymentMethod", label: "결제수단" },
  { key: "status", label: "결제상태" },
  { key: "shippingStatus", label: "배송상태" },
  { key: "recipientPhone", label: "수령인 연락처" },
  { key: "recipientAddress", label: "배송주소" },
  { key: "productName", label: "상품명" },
  { key: "optionName", label: "옵션명" },
  { key: "quantity", label: "수량" },
  { key: "price", label: "단가" },
];

function ExcelTemplateManagerModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const templatesQuery = trpc.adminExt.getExcelTemplates.useQuery();
  const createTpl = trpc.adminExt.createExcelTemplate.useMutation({ onSuccess: () => { utils.adminExt.getExcelTemplates.invalidate(); toast.success("양식이 저장되었습니다."); } });
  const updateTpl = trpc.adminExt.updateExcelTemplate.useMutation({ onSuccess: () => { utils.adminExt.getExcelTemplates.invalidate(); toast.success("양식이 수정되었습니다."); } });
  const deleteTpl = trpc.adminExt.deleteExcelTemplate.useMutation({ onSuccess: () => { utils.adminExt.getExcelTemplates.invalidate(); toast.success("양식이 삭제되었습니다."); setSelectedId(null); } });

  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [tplName, setTplName] = useState("");
  const [availableCols, setAvailableCols] = useState(ALL_AVAILABLE_COLS.map(c => c.key));
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [availSearch, setAvailSearch] = useState("");
  const [selSearch, setSelSearch] = useState("");

  const templates = templatesQuery.data ?? [];

  const loadTemplate = (id: number | "new") => {
    setSelectedId(id);
    if (id === "new") {
      setTplName("");
      setSelectedCols([]);
      setAvailableCols(ALL_AVAILABLE_COLS.map(c => c.key));
    } else {
      const tpl = templates.find(t => t.id === id);
      if (tpl) {
        setTplName(tpl.name);
        const cols: { key: string }[] = JSON.parse(tpl.columns || "[]");
        const colKeys = cols.map(c => c.key);
        setSelectedCols(colKeys);
        setAvailableCols(ALL_AVAILABLE_COLS.map(c => c.key).filter(k => !colKeys.includes(k)));
      }
    }
  };

  const moveToSelected = (key: string) => {
    setAvailableCols(prev => prev.filter(k => k !== key));
    setSelectedCols(prev => [...prev, key]);
  };
  const moveToAvailable = (key: string) => {
    setSelectedCols(prev => prev.filter(k => k !== key));
    setAvailableCols(prev => [...prev, key]);
  };
  const moveAllToSelected = () => {
    setSelectedCols(prev => [...prev, ...availableCols]);
    setAvailableCols([]);
  };
  const moveAllToAvailable = () => {
    setAvailableCols(prev => [...prev, ...selectedCols]);
    setSelectedCols([]);
  };
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedCols(prev => { const a = [...prev]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
  };
  const moveDown = (idx: number) => {
    setSelectedCols(prev => { if (idx >= prev.length - 1) return prev; const a = [...prev]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; });
  };

  const handleSave = () => {
    if (!tplName.trim()) { toast.error("양식 이름을 입력해주세요."); return; }
    if (selectedCols.length === 0) { toast.error("최소 1개 이상의 항목을 선택해주세요."); return; }
    const cols = selectedCols.map(key => {
      const found = ALL_AVAILABLE_COLS.find(c => c.key === key);
      return { key, label: found?.label ?? key };
    });
    const columnsJson = JSON.stringify(cols);
    if (selectedId === "new") {
      createTpl.mutate({ name: tplName, columns: columnsJson });
    } else if (typeof selectedId === "number") {
      updateTpl.mutate({ id: selectedId, name: tplName, columns: columnsJson });
    }
  };

  const handleReset = () => {
    if (selectedId === "new") {
      setTplName(""); setSelectedCols([]); setAvailableCols(ALL_AVAILABLE_COLS.map(c => c.key));
    } else if (typeof selectedId === "number") {
      loadTemplate(selectedId);
    }
  };

  const boxStyle: React.CSSProperties = { border: `1px solid ${C.border}`, borderRadius: "6px", height: "220px", overflowY: "auto", background: "#FAFAFA" };
  const itemStyle = (active: boolean): React.CSSProperties => ({ padding: "6px 10px", cursor: "pointer", fontSize: "13px", background: active ? "#EFF6FF" : "transparent", color: active ? C.primary : C.text, borderBottom: `1px solid ${C.border}` });

  const [activeAvail, setActiveAvail] = useState<string | null>(null);
  const [activeSel, setActiveSel] = useState<string | null>(null);

  const filteredAvail = ALL_AVAILABLE_COLS.filter(c => availableCols.includes(c.key) && c.label.includes(availSearch));
  const filteredSel = selectedCols.map(k => ALL_AVAILABLE_COLS.find(c => c.key === k)).filter(Boolean).filter(c => c!.label.includes(selSearch));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "min(900px, 96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.text }}>주문관리 다운로드 양식관리</h2>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {/* 선택 */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, minWidth: "40px" }}>선택</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return;
                if (v === "new") loadTemplate("new");
                else loadTemplate(Number(v));
              }}
              style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", fontSize: "13px", minWidth: "200px" }}
            >
              <option value="">-- 양식을 선택하세요 --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              <option value="new">새로운 양식 추가</option>
            </select>
            {selectedId !== null && selectedId !== "new" && (
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="양식 이름"
                style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", fontSize: "13px", flex: 1 }}
              />
            )}
            {selectedId === "new" && (
              <input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="새 양식 이름 입력"
                style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", fontSize: "13px", flex: 1 }}
              />
            )}
          </div>

          {selectedId !== null && (
            <>
              {/* 항목 설정 */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>항목 설정</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  {/* 다운로드 가능한 항목 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>다운로드 가능한 항목</div>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                      <input value={availSearch} onChange={e => setAvailSearch(e.target.value)} placeholder="검색" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }} />
                    </div>
                    <div style={boxStyle}>
                      {filteredAvail.map(c => (
                        <div key={c.key} style={itemStyle(activeAvail === c.key)} onClick={() => setActiveAvail(c.key)} onDoubleClick={() => moveToSelected(c.key)}>
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 이동 버튼 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "48px" }}>
                    <button onClick={() => activeAvail && moveToSelected(activeAvail)} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", background: "#fff" }}>{">"}</button>
                    <button onClick={() => activeSel && moveToAvailable(activeSel)} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", background: "#fff" }}>{"<"}</button>
                    <button onClick={moveAllToSelected} style={{ padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", background: "#fff" }}>전체<br/>추가</button>
                    <button onClick={moveAllToAvailable} style={{ padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", background: "#fff" }}>공란<br/>추가</button>
                  </div>

                  {/* 다운로드 설정한 항목 */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>다운로드 설정한 항목</div>
                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                      <input value={selSearch} onChange={e => setSelSearch(e.target.value)} placeholder="검색" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <button onClick={() => { const idx = filteredSel.findIndex(c => c?.key === activeSel); if (idx > 0) moveUp(selectedCols.indexOf(activeSel!)); }} style={{ padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "10px", cursor: "pointer", background: "#fff" }}>▲</button>
                        <button onClick={() => { const idx = filteredSel.findIndex(c => c?.key === activeSel); if (idx >= 0) moveDown(selectedCols.indexOf(activeSel!)); }} style={{ padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "10px", cursor: "pointer", background: "#fff" }}>▼</button>
                      </div>
                    </div>
                    <div style={boxStyle}>
                      {filteredSel.map(c => (
                        <div key={c!.key} style={itemStyle(activeSel === c!.key)} onClick={() => setActiveSel(c!.key)} onDoubleClick={() => moveToAvailable(c!.key)}>
                          {c!.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {selectedId !== null && selectedId !== "new" && (
            <button onClick={() => { if (window.confirm("이 양식을 삭제하시겠습니까?")) deleteTpl.mutate({ id: selectedId as number }); }} style={{ padding: "8px 16px", border: "1.5px solid #FCA5A5", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontSize: "13px", cursor: "pointer" }}>삭제</button>
          )}
          {selectedId !== null && (
            <>
              <button onClick={handleSave} style={{ padding: "8px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>저장</button>
              <button onClick={handleReset} style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>초기화</button>
            </>
          )}
          <button onClick={onClose} style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function ExcelDownloadModal({
  onClose,
  defaultStatus,
  defaultSearch,
  defaultSearchType,
  defaultViewType,
  defaultDateFrom,
  defaultDateTo,
}: {
  onClose: () => void;
  defaultStatus?: "created" | "paid" | "failed" | "cancelled";
  defaultSearch?: string;
  defaultSearchType?: "orderId" | "name" | "email" | "productName";
  defaultViewType?: "order" | "item";
  defaultDateFrom?: string;
  defaultDateTo?: string;
}) {
  const templatesQuery = trpc.adminExt.getExcelTemplates.useQuery();
  const exportMutation = trpc.adminExt.exportOrders.useMutation();

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [stripHtml, setStripHtml] = useState(true);
  const [padZero, setPadZero] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<{ filename: string; time: string; templateName: string }[]>([]);

  const templates = templatesQuery.data ?? [];

  const handleExcelRequest = async () => {
    const tplId = selectedTemplateId !== "" ? Number(selectedTemplateId) : undefined;
    const selectedTpl = tplId ? templates.find(t => t.id === tplId) : undefined;
    const cols = selectedTpl ? JSON.parse(selectedTpl.columns) : undefined;

    try {
      const result = await exportMutation.mutateAsync({
        templateId: tplId,
        status: defaultStatus,
        search: defaultSearch || undefined,
        searchType: defaultSearchType,
        viewType: defaultViewType ?? "order",
        dateFrom: defaultDateFrom ? new Date(defaultDateFrom) : undefined,
        dateTo: defaultDateTo ? new Date(defaultDateTo) : undefined,
        stripHtml,
        padZero,
        columns: cols,
      });

      // base64 → blob → download
      const byteChars = atob(result.base64);
      const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadHistory(prev => [
        { filename: result.filename, time: new Date().toLocaleString("ko-KR"), templateName: selectedTpl?.name ?? "기본양식" },
        ...prev.slice(0, 9),
      ]);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch (e: any) {
      toast.error(e.message ?? "엑셀 다운로드에 실패했습니다.");
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: "12px", width: "min(700px, 96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.text }}>주문관리 다운로드</h2>
          </div>
          <div style={{ padding: "20px 24px" }}>
            {/* 엑셀파일 요청 */}
            <div style={{ background: "#F9FAFB", borderRadius: "8px", padding: "16px", marginBottom: "20px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: C.text }}>엑셀파일 요청</div>

              {/* 양식 선택 */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ fontSize: "13px", minWidth: "60px", color: C.muted }}>양식선택</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", flex: 1 }}
                >
                  <option value="">기본양식(주문번호기준)</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => setShowTemplateManager(true)}
                  style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  다운로드 양식관리 &gt;
                </button>
              </div>

              {/* 데이터 옵션 */}
              <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", minWidth: "60px", color: C.muted }}>데이터 옵션</label>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={stripHtml} onChange={e => setStripHtml(e.target.checked)} />
                  상품명 HTML 태그 삭제
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={padZero} onChange={e => setPadZero(e.target.checked)} />
                  0으로 시작하는 숫자 보호처리
                </label>
              </div>

              {/* 현재 필터 요약 */}
              <div style={{ fontSize: "12px", color: C.muted, marginBottom: "12px", padding: "8px 12px", background: "#EFF6FF", borderRadius: "6px" }}>
                조회 조건: {defaultStatus ? { created: "입금전", paid: "결제완료", failed: "실패", cancelled: "취소" }[defaultStatus] : "전체 상태"}
                {defaultSearch ? ` | 검색어: ${defaultSearch}` : ""}
                {defaultDateFrom ? ` | 기간: ${defaultDateFrom} ~ ${defaultDateTo || "현재"}` : ""}
                {` | 유형: ${defaultViewType === "item" ? "품목주문별" : "주문번호별"}`}
              </div>

              <button
                onClick={handleExcelRequest}
                disabled={exportMutation.isPending}
                style={{ width: "100%", padding: "10px", background: "#1D4ED8", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
              >
                {exportMutation.isPending ? "생성 중..." : "엑셀파일요청"}
              </button>
            </div>

            {/* 다운로드 리스트 */}
            {downloadHistory.length > 0 && (
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: C.text }}>다운로드 리스트</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#F3F4F6" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.border}` }}>파일명</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.border}` }}>양식</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.border}` }}>요청일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 12px" }}>{h.filename}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: C.muted }}>{h.templateName}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: C.muted }}>{h.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 20px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>닫기</button>
          </div>
        </div>
      </div>
      {showTemplateManager && <ExcelTemplateManagerModal onClose={() => setShowTemplateManager(false)} />}
    </>
  );
}
