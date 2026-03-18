import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import OrderDetailModal from "@/components/OrderDetailModal";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";

type OrderSearchType = "orderId" | "name" | "email" | "productName";
type OrderViewType = "order" | "item";
type OrderStatus = "created" | "paid" | "failed" | "cancelled";
type OrderNavigation = (page: string, opts?: { statusFilter?: string }) => void;

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
    pending: { bg: "#FEF3C7", color: "#B45309", label: "대기" },
    approved: { bg: "#DCFCE7", color: "#166534", label: "승인" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "반려" },
    received: { bg: "#EFF6FF", color: "#1D4ED8", label: "접수" },
    contacted: { bg: "#FEF3C7", color: "#B45309", label: "연락완료" },
    closed: { bg: "#DCFCE7", color: "#166534", label: "종료" },
    trial: { bg: "#EDE9FE", color: "#5B21B6", label: "체험예약" },
    introduction: { bg: "#FEF3C7", color: "#B45309", label: "도입상담" },
    education: { bg: "#DCFCE7", color: "#166534", label: "교육문의" },
    paid: { bg: "#DCFCE7", color: "#166534", label: "결제완료" },
    created: { bg: "#EFF6FF", color: "#1D4ED8", label: "생성됨" },
    failed: { bg: "#FEE2E2", color: "#991B1B", label: "실패" },
    cancelled: { bg: "#F3F4F6", color: "#374151", label: "취소" },
    none: { bg: "#F3F4F6", color: "#374151", label: "미제출" },
    professional: { bg: "#EDE9FE", color: "#5B21B6", label: "전문가" },
    consumer: { bg: "#F3F4F6", color: "#374151", label: "일반" },
    user: { bg: "#F3F4F6", color: "#374151", label: "일반" },
    admin: { bg: "#EDE9FE", color: "#5B21B6", label: "관리자" },
    active: { bg: "#DCFCE7", color: "#166534", label: "사용함" },
    inactive: { bg: "#F3F4F6", color: "#374151", label: "사용안함" },
    published: { bg: "#DCFCE7", color: "#166534", label: "게시됨" },
    draft: { bg: "#FEF3C7", color: "#B45309", label: "임시저장" },
  };
  const resolved = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        background: resolved.bg,
        color: resolved.color,
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {resolved.label}
    </span>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

function Table({
  headers,
  rows,
  sortCol,
  sortDir,
  onSort,
}: {
  headers: string[];
  rows: ReactNode[][];
  sortCol?: string;
  sortDir?: "asc" | "desc";
  onSort?: (col: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9F8F7" }}>
            {headers.map((header, index) => {
              const isSortable = onSort && header !== "관리" && header !== "";
              const isActive = sortCol === header;
              return (
                <th
                  key={index}
                  onClick={isSortable ? () => onSort(header) : undefined}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: isActive ? C.primary : C.muted,
                    borderBottom: `1px solid ${C.border}`,
                    whiteSpace: "nowrap",
                    cursor: isSortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {header}
                  {isActive ? (sortDir === "asc" ? " ↑" : " ↓") : isSortable ? " ⇅" : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: "40px", textAlign: "center", color: C.muted }}>
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: `1px solid ${C.border}` }}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ padding: "10px 14px", color: C.text }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? "검색..."}
      style={{
        padding: "8px 14px",
        borderRadius: "8px",
        border: `1.5px solid ${C.border}`,
        fontSize: "13px",
        width: "260px",
        outline: "none",
      }}
    />
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{
        padding: "8px 14px",
        borderRadius: "8px",
        border: `1.5px solid ${C.border}`,
        fontSize: "13px",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? C.primary
      : variant === "danger"
        ? "#991B1B"
        : variant === "success"
          ? "#166534"
          : variant === "secondary"
            ? C.gold
            : "#fff";
  const color = variant === "outline" ? C.text : "#fff";
  const border = variant === "outline" ? `1.5px solid ${C.border}` : "none";
  const pad = size === "sm" ? "5px 12px" : "8px 18px";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        borderRadius: "8px",
        border,
        background: bg,
        color,
        fontSize: size === "sm" ? "12px" : "13px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function ShippingBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending_payment: { bg: "#FEF3C7", color: "#B45309", label: "입금전" },
    ready: { bg: "#DBEAFE", color: "#1D4ED8", label: "배송준비" },
    hold: { bg: "#FEE2E2", color: "#991B1B", label: "배송보류" },
    shipping: { bg: "#D1FAE5", color: "#065F46", label: "배송중" },
    delivered: { bg: "#DCFCE7", color: "#166534", label: "배송완료" },
    none: { bg: "#F3F4F6", color: "#374151", label: "해당없음" },
  };
  const resolved = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        background: resolved.bg,
        color: resolved.color,
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {resolved.label}
    </span>
  );
}

function CsBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    requested: { bg: "#FEF3C7", color: "#B45309", label: "신청" },
    processing: { bg: "#DBEAFE", color: "#1D4ED8", label: "처리중" },
    completed: { bg: "#DCFCE7", color: "#166534", label: "완료" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "거부/철회" },
    ready: { bg: "#D1FAE5", color: "#065F46", label: "준비" },
    hold: { bg: "#F3F4F6", color: "#374151", label: "보류" },
    pending: { bg: "#FEF3C7", color: "#B45309", label: "환불전" },
  };
  const resolved = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        background: resolved.bg,
        color: resolved.color,
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {resolved.label}
    </span>
  );
}

function ShippingDetailModal({
  order,
  onClose,
  onSave,
}: {
  order: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
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
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gap: "12px", fontSize: "13px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted }}>주문번호</span>
            <span style={{ fontFamily: "monospace" }}>{order.orderId}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted }}>주문명</span>
            <span>{order.orderName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.muted }}>결제금액</span>
            <span style={{ fontWeight: 700 }}>{krw(order.finalAmount ?? order.totalAmount)}</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted }}>
            배송 상태
            <select
              value={form.shippingStatus}
              onChange={(event) => setForm((prev) => ({ ...prev, shippingStatus: event.target.value }))}
              style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }}
            >
              <option value="pending_payment">입금전</option>
              <option value="ready">배송준비중</option>
              <option value="hold">배송보류</option>
              <option value="shipping">배송중</option>
              <option value="delivered">배송완료</option>
            </select>
          </label>
          {["courierName:운송사", "trackingNumber:송장번호", "recipientName:수령인이름", "recipientPhone:수령인연락처", "shippingAddress:배송주소", "shippingMemo:배송메모", "adminMemo:관리자메모"].map((entry) => {
            const [key, label] = entry.split(":");
            return (
              <label key={key} style={{ fontSize: "12px", fontWeight: 600, color: C.muted }}>
                {label}
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  style={{ display: "block", width: "100%", marginTop: "4px", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", boxSizing: "border-box" }}
                />
              </label>
            );
          })}
        </div>
        <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Btn size="sm" onClick={() => onSave(form)}>
            저장
          </Btn>
          <Btn size="sm" variant="outline" onClick={onClose}>
            닫기
          </Btn>
        </div>
      </div>
    </div>
  );
}

function OrderDashboard({ onNavigate }: { onNavigate?: OrderNavigation }) {
  const [orderDays, setOrderDays] = useState(30);
  const dashboard = trpc.admin.dashboard.useQuery();
  trpc.admin.dashboardCharts.useQuery({ days: orderDays });
  const summary = dashboard.data;

  const periods = [
    { label: "최근 3개월", value: 90 },
    { label: "최근 6개월", value: 180 },
    { label: "최근 1년", value: 365 },
    { label: "전체", value: 730 },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <SectionHeader title="주문 대시보드" />
        <div style={{ display: "flex", gap: 6 }}>
          {periods.map((period) => (
            <button
              key={period.value}
              onClick={() => setOrderDays(period.value)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                borderRadius: 20,
                border: `1px solid ${orderDays === period.value ? C.primary : C.border}`,
                background: orderDays === period.value ? C.primary : C.white,
                color: orderDays === period.value ? "#fff" : C.text,
                cursor: "pointer",
                fontWeight: orderDays === period.value ? 700 : 400,
              }}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

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
              <td style={{ padding: "12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>
                {krw(summary?.todayRevenue ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>{summary?.todayOrders ?? 0}건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right", color: C.primary, fontWeight: 700 }}>
                {krw(summary?.monthRevenue ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>{summary?.monthOrders ?? 0}건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                <Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-all", { statusFilter: "all" })}>
                  주문조회
                </Btn>
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#F0FFF4" }}>
              <td style={{ padding: "12px", fontWeight: 600, borderLeft: `3px solid ${C.green}` }}>총 실 결제 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>
                {krw(summary?.todayNetRevenue ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>{summary?.todayOrders ?? 0}건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right", color: C.primary, fontWeight: 700 }}>
                {krw(summary?.monthNetRevenue ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>{summary?.monthOrders ?? 0}건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                <Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-all", { statusFilter: "paid" })}>
                  결제조회
                </Btn>
              </td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px", color: C.muted }}>총 환불 금액</td>
              <td style={{ padding: "12px", textAlign: "right", color: "#991B1B", fontWeight: 700 }}>
                {krw(summary?.todayRefundAmount ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>0건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right", color: "#991B1B", fontWeight: 700 }}>
                {krw(summary?.monthRefundAmount ?? 0)}
                <br />
                <span style={{ fontSize: "11px", color: C.muted }}>0건</span>
              </td>
              <td style={{ padding: "12px", textAlign: "right" }}>
                <Btn size="sm" variant="outline" onClick={() => onNavigate?.("order-refund", {})}>
                  환불조회
                </Btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>오늘의 할 일</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
          {[
            { label: "입금전", value: summary?.pendingOrders ?? 0, color: C.orange },
            { label: "배송준비중", value: summary?.readyToShip ?? 0, color: C.blue },
            { label: "배송대기", value: 0, color: C.muted },
            { label: "배송중", value: summary?.shippingOrders ?? 0, color: C.green },
            { label: "취소신청", value: summary?.cancelRequested ?? 0, color: C.primary },
            { label: "교환신청", value: summary?.exchangeRequested ?? 0, color: C.primary },
            { label: "반품신청", value: summary?.returnRequested ?? 0, color: C.primary },
            { label: "환불전", value: summary?.refundPending ?? 0, color: C.primary },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: "center", padding: "12px", background: C.bg, borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: C.muted, marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: item.value > 0 ? item.color : C.muted }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>오늘 처리한 일</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>
          {[
            { label: "배송완료", value: summary?.deliveredOrders ?? 0 },
            { label: "취소완료", value: summary?.cancelCompleted ?? 0 },
            { label: "교환완료", value: summary?.exchangeCompleted ?? 0 },
            { label: "반품완료", value: summary?.returnCompleted ?? 0 },
            { label: "환불완료", value: summary?.refundCompleted ?? 0 },
          ].map((item) => (
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
  const createTemplate = trpc.adminExt.createExcelTemplate.useMutation({
    onSuccess: () => {
      utils.adminExt.getExcelTemplates.invalidate();
      toast.success("양식이 저장되었습니다.");
    },
  });
  const updateTemplate = trpc.adminExt.updateExcelTemplate.useMutation({
    onSuccess: () => {
      utils.adminExt.getExcelTemplates.invalidate();
      toast.success("양식이 수정되었습니다.");
    },
  });
  const deleteTemplate = trpc.adminExt.deleteExcelTemplate.useMutation({
    onSuccess: () => {
      utils.adminExt.getExcelTemplates.invalidate();
      toast.success("양식이 삭제되었습니다.");
      setSelectedId(null);
    },
  });

  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [availableCols, setAvailableCols] = useState(ALL_AVAILABLE_COLS.map((col) => col.key));
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [availSearch, setAvailSearch] = useState("");
  const [selSearch, setSelSearch] = useState("");
  const [activeAvail, setActiveAvail] = useState<string | null>(null);
  const [activeSel, setActiveSel] = useState<string | null>(null);

  const templates = templatesQuery.data ?? [];

  const loadTemplate = (id: number | "new") => {
    setSelectedId(id);
    if (id === "new") {
      setTemplateName("");
      setSelectedCols([]);
      setAvailableCols(ALL_AVAILABLE_COLS.map((col) => col.key));
      return;
    }

    const template = templates.find((item: any) => item.id === id);
    if (!template) return;

    setTemplateName(template.name);
    const cols: { key: string }[] = JSON.parse(template.columns || "[]");
    const colKeys = cols.map((col) => col.key);
    setSelectedCols(colKeys);
    setAvailableCols(ALL_AVAILABLE_COLS.map((col) => col.key).filter((key) => !colKeys.includes(key)));
  };

  const moveToSelected = (key: string) => {
    setAvailableCols((prev) => prev.filter((item) => item !== key));
    setSelectedCols((prev) => [...prev, key]);
  };

  const moveToAvailable = (key: string) => {
    setSelectedCols((prev) => prev.filter((item) => item !== key));
    setAvailableCols((prev) => [...prev, key]);
  };

  const moveAllToSelected = () => {
    setSelectedCols((prev) => [...prev, ...availableCols]);
    setAvailableCols([]);
  };

  const moveAllToAvailable = () => {
    setAvailableCols((prev) => [...prev, ...selectedCols]);
    setSelectedCols([]);
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelectedCols((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setSelectedCols((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error("양식 이름을 입력해주세요.");
      return;
    }
    if (selectedCols.length === 0) {
      toast.error("최소 1개 이상의 항목을 선택해주세요.");
      return;
    }

    const columns = selectedCols.map((key) => {
      const found = ALL_AVAILABLE_COLS.find((col) => col.key === key);
      return { key, label: found?.label ?? key };
    });
    const columnsJson = JSON.stringify(columns);

    if (selectedId === "new") {
      createTemplate.mutate({ name: templateName, columns: columnsJson });
      return;
    }
    if (typeof selectedId === "number") {
      updateTemplate.mutate({ id: selectedId, name: templateName, columns: columnsJson });
    }
  };

  const handleReset = () => {
    if (selectedId === "new") {
      setTemplateName("");
      setSelectedCols([]);
      setAvailableCols(ALL_AVAILABLE_COLS.map((col) => col.key));
      return;
    }
    if (typeof selectedId === "number") {
      loadTemplate(selectedId);
    }
  };

  const boxStyle: CSSProperties = {
    border: `1px solid ${C.border}`,
    borderRadius: "6px",
    height: "220px",
    overflowY: "auto",
    background: "#FAFAFA",
  };
  const itemStyle = (active: boolean): CSSProperties => ({
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "13px",
    background: active ? "#EFF6FF" : "transparent",
    color: active ? C.primary : C.text,
    borderBottom: `1px solid ${C.border}`,
  });

  const filteredAvail = ALL_AVAILABLE_COLS.filter((col) => availableCols.includes(col.key) && col.label.includes(availSearch));
  const filteredSel = selectedCols
    .map((key) => ALL_AVAILABLE_COLS.find((col) => col.key === key))
    .filter(Boolean)
    .filter((col) => col!.label.includes(selSearch));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "min(900px, 96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.text }}>주문관리 다운로드 양식관리</h2>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, minWidth: "40px" }}>선택</label>
            <select
              value={selectedId ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "") return;
                if (value === "new") loadTemplate("new");
                else loadTemplate(Number(value));
              }}
              style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", fontSize: "13px", minWidth: "200px" }}
            >
              <option value="">-- 양식을 선택하세요 --</option>
              {templates.map((template: any) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
              <option value="new">새로운 양식 추가</option>
            </select>
            {selectedId !== null && (
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder={selectedId === "new" ? "새 양식 이름 입력" : "양식 이름"}
                style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 12px", fontSize: "13px", flex: 1 }}
              />
            )}
          </div>

          {selectedId !== null && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>항목 설정</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>다운로드 가능한 항목</div>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    <input value={availSearch} onChange={(event) => setAvailSearch(event.target.value)} placeholder="검색" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }} />
                  </div>
                  <div style={boxStyle}>
                    {filteredAvail.map((col) => (
                      <div key={col.key} style={itemStyle(activeAvail === col.key)} onClick={() => setActiveAvail(col.key)} onDoubleClick={() => moveToSelected(col.key)}>
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingTop: "48px" }}>
                  <button onClick={() => activeAvail && moveToSelected(activeAvail)} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", background: "#fff" }}>{">"}</button>
                  <button onClick={() => activeSel && moveToAvailable(activeSel)} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", background: "#fff" }}>{"<"}</button>
                  <button onClick={moveAllToSelected} style={{ padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", background: "#fff" }}>전체<br />추가</button>
                  <button onClick={moveAllToAvailable} style={{ padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "11px", cursor: "pointer", background: "#fff" }}>공란<br />추가</button>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: C.muted, marginBottom: "4px" }}>다운로드 설정한 항목</div>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                    <input value={selSearch} onChange={(event) => setSelSearch(event.target.value)} placeholder="검색" style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <button onClick={() => { if (activeSel) moveUp(selectedCols.indexOf(activeSel)); }} style={{ padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "10px", cursor: "pointer", background: "#fff" }}>▲</button>
                      <button onClick={() => { if (activeSel) moveDown(selectedCols.indexOf(activeSel)); }} style={{ padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: "3px", fontSize: "10px", cursor: "pointer", background: "#fff" }}>▼</button>
                    </div>
                  </div>
                  <div style={boxStyle}>
                    {filteredSel.map((col) => (
                      <div key={col!.key} style={itemStyle(activeSel === col!.key)} onClick={() => setActiveSel(col!.key)} onDoubleClick={() => moveToAvailable(col!.key)}>
                        {col!.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {selectedId !== null && selectedId !== "new" && (
            <button
              onClick={() => {
                if (window.confirm("이 양식을 삭제하시겠습니까?")) {
                  deleteTemplate.mutate({ id: selectedId as number });
                }
              }}
              style={{ padding: "8px 16px", border: "1.5px solid #FCA5A5", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontSize: "13px", cursor: "pointer" }}
            >
              삭제
            </button>
          )}
          {selectedId !== null && (
            <>
              <button onClick={handleSave} style={{ padding: "8px 20px", background: C.primary, color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                저장
              </button>
              <button onClick={handleReset} style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>
                초기화
              </button>
            </>
          )}
          <button onClick={onClose} style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>
            닫기
          </button>
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
  defaultStatus?: OrderStatus;
  defaultSearch?: string;
  defaultSearchType?: OrderSearchType;
  defaultViewType?: OrderViewType;
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
    const templateId = selectedTemplateId !== "" ? Number(selectedTemplateId) : undefined;
    const selectedTemplate = templateId ? templates.find((template: any) => template.id === templateId) : undefined;
    const columns = selectedTemplate ? JSON.parse(selectedTemplate.columns) : undefined;

    try {
      const result = await exportMutation.mutateAsync({
        templateId,
        status: defaultStatus,
        search: defaultSearch || undefined,
        searchType: defaultSearchType,
        viewType: defaultViewType ?? "order",
        dateFrom: defaultDateFrom ? new Date(defaultDateFrom) : undefined,
        dateTo: defaultDateTo ? new Date(defaultDateTo) : undefined,
        stripHtml,
        padZero,
        columns,
      });

      const byteChars = atob(result.base64);
      const byteNums = new Array(byteChars.length).fill(0).map((_, index) => byteChars.charCodeAt(index));
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);

      setDownloadHistory((prev) => [
        { filename: result.filename, time: new Date().toLocaleString("ko-KR"), templateName: selectedTemplate?.name ?? "기본양식" },
        ...prev.slice(0, 9),
      ]);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch (error: any) {
      toast.error(error.message ?? "엑셀 다운로드에 실패했습니다.");
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
            <div style={{ background: "#F9FAFB", borderRadius: "8px", padding: "16px", marginBottom: "20px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", color: C.text }}>엑셀파일 요청</div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ fontSize: "13px", minWidth: "60px", color: C.muted }}>양식선택</label>
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value === "" ? "" : Number(event.target.value))}
                  style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", flex: 1 }}
                >
                  <option value="">기본양식(주문번호기준)</option>
                  {templates.map((template: any) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowTemplateManager(true)}
                  style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  다운로드 양식관리 &gt;
                </button>
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", minWidth: "60px", color: C.muted }}>데이터 옵션</label>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={stripHtml} onChange={(event) => setStripHtml(event.target.checked)} />
                  상품명 HTML 태그 삭제
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={padZero} onChange={(event) => setPadZero(event.target.checked)} />
                  0으로 시작하는 숫자 보호처리
                </label>
              </div>

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
                    {downloadHistory.map((history, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 12px" }}>{history.filename}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: C.muted }}>{history.templateName}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: C.muted }}>{history.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 20px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer" }}>
              닫기
            </button>
          </div>
        </div>
      </div>
      {showTemplateManager && <ExcelTemplateManagerModal onClose={() => setShowTemplateManager(false)} />}
    </>
  );
}

export function OrderSection({
  subPage,
  onNavigate,
  initialStatusFilter,
}: {
  subPage: string;
  onNavigate?: OrderNavigation;
  initialStatusFilter?: string;
}) {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<OrderSearchType>("orderId");
  const [viewType, setViewType] = useState<OrderViewType>("order");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? "all");
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
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (initialStatusFilter !== undefined) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

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
    { enabled: isShippingPage },
  );
  const updateShipping = trpc.admin.updateShipping.useMutation({
    onSuccess: () => {
      toast.success("배송 정보가 저장되었습니다.");
      shippingOrders.refetch();
      setShippingModalOpen(false);
    },
  });

  const isCsPage = ["order-cancel-pre", "order-cancel", "order-exchange", "order-return", "order-refund", "order-card-cancel", "order-admin-refund"].includes(subPage);
  const cancellations = trpc.admin.cancellations.useQuery(
    { cancelType: subPage === "order-cancel-pre" ? "pre_payment" : subPage === "order-cancel" ? "post_payment" : undefined, page: 1, limit: 50 },
    { enabled: ["order-cancel-pre", "order-cancel"].includes(subPage) },
  );
  const exchanges = trpc.admin.exchanges.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-exchange" });
  const returns = trpc.admin.returns.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-return" });
  const refunds = trpc.admin.refunds.useQuery({ page: 1, limit: 50 }, { enabled: ["order-refund", "order-admin-refund"].includes(subPage) });
  const cardCancellations = trpc.admin.cardCancellations.useQuery({ page: 1, limit: 50 }, { enabled: subPage === "order-card-cancel" });

  const updateCancellation = trpc.admin.updateCancellation.useMutation({
    onSuccess: () => {
      toast.success("업데이트 완료");
      cancellations.refetch();
    },
  });
  const updateExchange = trpc.admin.updateExchange.useMutation({
    onSuccess: () => {
      toast.success("업데이트 완료");
      exchanges.refetch();
    },
  });
  const updateReturn = trpc.admin.updateReturn.useMutation({
    onSuccess: () => {
      toast.success("업데이트 완료");
      returns.refetch();
    },
  });
  const updateRefund = trpc.admin.updateRefund.useMutation({
    onSuccess: () => {
      toast.success("업데이트 완료");
      refunds.refetch();
    },
  });

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
    { enabled: !isShippingPage && !isCsPage },
  );
  const totalCount = orders.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success("주문 상태가 변경되었습니다.");
      orders.refetch();
    },
  });
  const cancelOrder = trpc.order.cancel.useMutation({
    onSuccess: () => {
      toast.success("결제가 취소되었습니다.");
      orders.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSearch = () => {
    setPage(1);
    orders.refetch();
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortCol(col);
    setSortDir("asc");
  };

  if (subPage === "order-dashboard") {
    return <OrderDashboard onNavigate={onNavigate} />;
  }

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
            rows={rows.map((order: any) => [
              <div>
                <div style={{ fontSize: "11px", color: C.muted }}>{fmtDateTime(order.createdAt)}</div>
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order.orderId}</div>
              </div>,
              <span style={{ fontWeight: 600 }}>{order.orderName ?? "—"}</span>,
              <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{order.trackingNumber ?? "—"}</span>,
              <span>{order.courierName ?? "—"}</span>,
              <span>{order.orderName ?? "—"}</span>,
              krw(order.finalAmount ?? order.totalAmount),
              <ShippingBadge status={order.shippingStatus ?? "none"} />,
              <Btn size="sm" variant="outline" onClick={() => { setSelectedOrder(order); setShippingModalOpen(true); }}>
                송장입력
              </Btn>,
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

  if (["order-cancel-pre", "order-cancel"].includes(subPage)) {
    const title = subPage === "order-cancel-pre" ? "입금전 취소 관리" : "취소 관리";
    const rows = cancellations.data?.rows ?? [];
    return (
      <div>
        <SectionHeader title={title} />
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["전체", "취소신청", "취소처리중", "취소완료", "접수거부/철회"].map((label, index) => {
            const values = ["all", "requested", "processing", "completed", "rejected"];
            return (
              <button
                key={label}
                onClick={() => setCsTab(values[index])}
                style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === values[index] ? C.primary : C.border}`, background: csTab === values[index] ? C.primary : "#fff", color: csTab === values[index] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["취소신청일", "주문번호/취소번호", "주문자", "상품명/옵션", "취소금액", "결제수단", "주문상태", "취소처리", "메모"]}
            rows={rows
              .filter((row: any) => csTab === "all" || row.orderCancellations?.status === csTab)
              .map((row: any) => {
                const cancellation = row.orderCancellations;
                const order = row.orders;
                return [
                  fmtDate(cancellation?.createdAt),
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order?.orderId ?? "—"}</div>
                  </div>,
                  <span>{order?.orderName ?? "—"}</span>,
                  <span>{order?.orderName ?? "—"}</span>,
                  krw(cancellation?.cancelAmount),
                  <span>{order?.paymentMethod ?? "—"}</span>,
                  <CsBadge status={cancellation?.status ?? "requested"} />,
                  <div style={{ display: "flex", gap: "4px" }}>
                    {cancellation?.status === "requested" && (
                      <Btn size="sm" onClick={() => updateCancellation.mutate({ id: cancellation.id, status: "processing" })}>
                        취소처리
                      </Btn>
                    )}
                    {cancellation?.status === "processing" && (
                      <Btn size="sm" onClick={() => updateCancellation.mutate({ id: cancellation.id, status: "completed" })}>
                        취소완료
                      </Btn>
                    )}
                  </div>,
                  <span style={{ fontSize: "11px", color: C.muted }}>{cancellation?.adminNote ?? "—"}</span>,
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
          {["전체", "교환신청", "교환처리중", "교환완료", "접수거부/철회"].map((label, index) => {
            const values = ["all", "requested", "processing", "completed", "rejected"];
            return (
              <button
                key={label}
                onClick={() => setCsTab(values[index])}
                style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === values[index] ? C.primary : C.border}`, background: csTab === values[index] ? C.primary : "#fff", color: csTab === values[index] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["교환신청일", "주문번호/교환번호", "주문자", "상품명/옵션", "주문상태", "교환처리", "메모"]}
            rows={rows
              .filter((row: any) => csTab === "all" || row.orderExchanges?.status === csTab)
              .map((row: any) => {
                const exchange = row.orderExchanges;
                const order = row.orders;
                return [
                  fmtDate(exchange?.createdAt),
                  <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order?.orderId ?? "—"}</div>,
                  <span>{order?.orderName ?? "—"}</span>,
                  <span>{order?.orderName ?? "—"}</span>,
                  <CsBadge status={exchange?.status ?? "requested"} />,
                  <div style={{ display: "flex", gap: "4px" }}>
                    {exchange?.status === "requested" && (
                      <Btn size="sm" onClick={() => updateExchange.mutate({ id: exchange.id, status: "processing" })}>
                        교환처리
                      </Btn>
                    )}
                    {exchange?.status === "processing" && (
                      <Btn size="sm" onClick={() => updateExchange.mutate({ id: exchange.id, status: "completed" })}>
                        교환완료
                      </Btn>
                    )}
                  </div>,
                  <span style={{ fontSize: "11px", color: C.muted }}>{exchange?.adminMemo ?? "—"}</span>,
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
          {["전체", "반품신청", "반품처리중", "반품완료", "접수거부/철회"].map((label, index) => {
            const values = ["all", "requested", "processing", "completed", "rejected"];
            return (
              <button
                key={label}
                onClick={() => setCsTab(values[index])}
                style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === values[index] ? C.primary : C.border}`, background: csTab === values[index] ? C.primary : "#fff", color: csTab === values[index] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["반품신청일", "주문번호/취소번호", "주문자", "상품명/옵션", "운송정보", "주문상태", "반품처리", "메모"]}
            rows={rows
              .filter((row: any) => csTab === "all" || row.orderReturns?.status === csTab)
              .map((row: any) => {
                const returned = row.orderReturns;
                const order = row.orders;
                return [
                  fmtDate(returned?.createdAt),
                  <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order?.orderId ?? "—"}</div>,
                  <span>{order?.orderName ?? "—"}</span>,
                  <span>{order?.orderName ?? "—"}</span>,
                  <span style={{ fontSize: "11px" }}>{returned?.returnCourierName ? `${returned.returnCourierName} ${returned.returnTrackingNumber ?? ""}` : "—"}</span>,
                  <CsBadge status={returned?.status ?? "requested"} />,
                  <div style={{ display: "flex", gap: "4px" }}>
                    {returned?.status === "requested" && (
                      <Btn size="sm" onClick={() => updateReturn.mutate({ id: returned.id, status: "processing" })}>
                        반품처리
                      </Btn>
                    )}
                    {returned?.status === "processing" && (
                      <Btn size="sm" onClick={() => updateReturn.mutate({ id: returned.id, status: "completed" })}>
                        반품완료
                      </Btn>
                    )}
                  </div>,
                  <span style={{ fontSize: "11px", color: C.muted }}>{returned?.adminMemo ?? "—"}</span>,
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
          {["전체", "환불전", "환불완료", "환불보류", "환불철회"].map((label, index) => {
            const values = ["all", "pending", "completed", "hold", "rejected"];
            return (
              <button
                key={label}
                onClick={() => setCsTab(values[index])}
                style={{ padding: "6px 14px", borderRadius: "6px", border: `1.5px solid ${csTab === values[index] ? C.primary : C.border}`, background: csTab === values[index] ? C.primary : "#fff", color: csTab === values[index] ? "#fff" : C.text, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["주문일", "환불접수일", "주문번호/환불번호", "주문자", "총수량", "총환불액", "사용한적립금/예치금", "결제수단", "환불수단", "처리상태", "환불처리", "메모"]}
            rows={rows
              .filter((row: any) => csTab === "all" || row.orderRefunds?.status === csTab)
              .map((row: any) => {
                const refund = row.orderRefunds;
                const order = row.orders;
                return [
                  fmtDate(order?.createdAt),
                  fmtDate(refund?.createdAt),
                  <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order?.orderId ?? "—"}</div>,
                  <span>{order?.orderName ?? "—"}</span>,
                  "—",
                  krw(refund?.refundAmount),
                  "0/0",
                  <span>{order?.paymentMethod ?? "—"}</span>,
                  <span>{refund?.refundMethod ?? "—"}</span>,
                  <CsBadge status={refund?.status ?? "pending"} />,
                  <div style={{ display: "flex", gap: "4px" }}>
                    {refund?.status === "pending" && (
                      <Btn size="sm" onClick={() => updateRefund.mutate({ id: refund.id, status: "completed", completedAt: new Date() })}>
                        환불완료
                      </Btn>
                    )}
                  </div>,
                  <span style={{ fontSize: "11px", color: C.muted }}>{refund?.adminNote ?? "—"}</span>,
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
            rows={rows.map((row: any) => {
              const cancellation = row.cardCancellations;
              const order = row.orders;
              return [
                fmtDate(cancellation?.cancelledAt),
                <div style={{ fontFamily: "monospace", fontSize: "11px" }}>{order?.orderId ?? "—"}</div>,
                <span>{order?.orderName ?? "—"}</span>,
                <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{cancellation?.tid ?? "—"}</span>,
                krw(cancellation?.cancelAmount),
                <span>{cancellation?.cancelType === "full" ? "전체취소" : "부분취소"}</span>,
                <span>{cancellation?.cancelledBy ?? "—"}</span>,
                <span style={{ fontSize: "11px", color: C.muted }}>{cancellation?.adminMemo ?? "—"}</span>,
              ];
            })}
          />
          {rows.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>검색된 카드취소 내역이 없습니다.</div>}
        </div>
      </div>
    );
  }

  const title = subPage === "order-all" ? "전체 주문 조회" : subPage === "order-unpaid" ? "입금전 관리" : "주문 관리";

  return (
    <div>
      <SectionHeader title={title} />

      {subPage === "order-all" && (
        <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderBottom: `2px solid ${C.border}` }}>
          {(["order", "item"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setViewType(tab)}
              style={{
                padding: "8px 20px",
                border: "none",
                borderBottom: viewType === tab ? `2px solid ${C.primary}` : "2px solid transparent",
                background: "transparent",
                color: viewType === tab ? C.primary : C.muted,
                fontWeight: viewType === tab ? 700 : 400,
                fontSize: "14px",
                cursor: "pointer",
                marginBottom: "-2px",
              }}
            >
              {tab === "order" ? "주문번호별" : "품목주문별"}
            </button>
          ))}
        </div>
      )}

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: C.muted, minWidth: "32px" }}>기간</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: C.text }} />
          <span style={{ color: C.muted }}>~</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: C.text }} />
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#F9FAFB", fontSize: "12px", cursor: "pointer", color: C.muted }}>
            전체기간
          </button>
          {["today", "week", "month"].map((period) => (
            <button
              key={period}
              onClick={() => {
                const now = new Date();
                const from = new Date();
                if (period === "week") from.setDate(now.getDate() - 7);
                else if (period === "month") from.setMonth(now.getMonth() - 1);
                setDateFrom(from.toISOString().slice(0, 10));
                setDateTo(now.toISOString().slice(0, 10));
              }}
              style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "#F9FAFB", fontSize: "12px", cursor: "pointer", color: C.text }}
            >
              {period === "today" ? "오늘" : period === "week" ? "1주일" : "1개월"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select value={searchType} onChange={(event) => setSearchType(event.target.value as OrderSearchType)} style={{ border: `1px solid ${C.border}`, borderRadius: "6px", padding: "7px 10px", fontSize: "13px", color: C.text, background: "#fff" }}>
            <option value="orderId">주문번호</option>
            <option value="name">주문자명</option>
            <option value="email">이메일</option>
            {viewType === "item" && <option value="productName">상품명</option>}
          </select>
          <SearchBar value={search} onChange={setSearch} placeholder="검색어를 입력하세요" />
          {subPage === "order-all" && (
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "전체 상태" },
                { value: "created", label: "입금전" },
                { value: "paid", label: "결제완료" },
                { value: "failed", label: "실패" },
                { value: "cancelled", label: "취소" },
              ]}
            />
          )}
          {subPage === "order-all" && (
            <button onClick={handleSearch} style={{ padding: "7px 16px", borderRadius: "6px", border: "none", background: C.primary, color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              검색
            </button>
          )}
          {subPage === "order-all" && (
            <button onClick={() => setShowExcelModal(true)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", padding: "6px 14px", border: `1.5px solid ${C.border}`, borderRadius: "6px", background: "#fff", fontSize: "13px", cursor: "pointer", color: C.text, fontWeight: 600 }}>
              📅 엑셀 다운로드
            </button>
          )}
        </div>
      </div>

      {(subPage === "order-all" || subPage === "order-unpaid") && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "13px", color: C.muted }}>페이지당 표시</span>
          {([20, 50, 100] as const).map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size);
                setPage(1);
              }}
              style={{ padding: "4px 12px", borderRadius: "6px", border: `1.5px solid ${pageSize === size ? C.primary : C.border}`, background: pageSize === size ? C.primary : "#fff", color: pageSize === size ? "#fff" : C.text, fontSize: "13px", cursor: "pointer", fontWeight: pageSize === size ? 700 : 400 }}
            >
              {size}개
            </button>
          ))}
          <span style={{ fontSize: "12px", color: C.muted, marginLeft: "8px" }}>총 {totalCount.toLocaleString()}건</span>
        </div>
      )}

      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={subPage === "order-all" ? ["주문일", "주문번호", "회원", "주문명", "총 상품 구매금액", "총 실결제금액", "결제수단", "결제상태", "배송상태", "관리"] : ["주문번호", "회원", "주문명", "금액", "결제상태", "배송상태", "결제일", "관리"]}
          sortCol={subPage === "order-all" ? sortCol : undefined}
          sortDir={subPage === "order-all" ? sortDir : undefined}
          onSort={subPage === "order-all" ? (col) => { toggleSort(col); setPage(1); } : undefined}
          rows={(orders.data?.items ?? []).map((item: any) => {
            const order = item.o;
            const paymentMethodLabel =
              order.paymentMethod === "card"
                ? "카드"
                : order.paymentMethod === "bank_transfer" || order.paymentMethod === "virtualAccount"
                  ? "무통장입금"
                  : order.paymentMethod === "tosspay"
                    ? "토스페이"
                    : order.paymentMethod === "kakaopay"
                      ? "카카오페이"
                      : order.paymentMethod ?? "—";

            if (subPage === "order-all") {
              return [
                <div style={{ fontSize: "11px", color: C.muted }}>{fmtDate(order.createdAt)}</div>,
                <button style={{ fontFamily: "monospace", fontSize: "11px", color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }} onClick={() => setDetailOrderId(order.orderId)}>
                  {order.orderId}
                </button>,
                <div>
                  <div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div>
                  <div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div>
                </div>,
                order.orderName ?? "—",
                <span style={{ fontWeight: 600 }}>{krw(order.totalAmount)}</span>,
                <span style={{ fontWeight: 600, color: C.primary }}>{krw(order.finalAmount ?? order.totalAmount)}</span>,
                <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "4px", background: "#F3F4F6" }}>{paymentMethodLabel}</span>,
                <StatusBadge status={order.status} />,
                <ShippingBadge status={order.shippingStatus ?? "none"} />,
                <div style={{ display: "flex", gap: "4px" }}>
                  <Btn size="sm" variant="outline" onClick={() => setDetailOrderId(order.orderId)}>
                    상세
                  </Btn>
                  {order.status !== "cancelled" && (
                    <Btn size="sm" variant="danger" onClick={() => setCancelConfirm(order.orderId)}>
                      취소
                    </Btn>
                  )}
                </div>,
              ];
            }

            return [
              <button style={{ fontFamily: "monospace", fontSize: "11px", color: C.blue, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }} onClick={() => setDetailOrderId(order.orderId)}>
                {order.orderId}
              </button>,
              <div>
                <div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div>
              </div>,
              order.orderName ?? "—",
              krw(order.finalAmount ?? order.totalAmount),
              <StatusBadge status={order.status} />,
              <ShippingBadge status={order.shippingStatus ?? "none"} />,
              fmtDate(order.paidAt),
              <div style={{ display: "flex", gap: "4px" }}>
                <Btn size="sm" variant="outline" onClick={() => setDetailOrderId(order.orderId)}>
                  상세
                </Btn>
                {subPage === "order-unpaid" && order.status === "created" && (
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      if (window.confirm(`주문번호 ${order.orderId}의 입금을 확인하시겠습니까?\n입금 확인 시 결제완료 상태로 변경됩니다.`)) {
                        updateStatus.mutate({ orderId: order.orderId, status: "paid" });
                      }
                    }}
                  >
                    입금확인
                  </Btn>
                )}
                {order.status !== "cancelled" && (
                  <Btn size="sm" variant="danger" onClick={() => setCancelConfirm(order.orderId)}>
                    취소
                  </Btn>
                )}
              </div>,
            ];
          })}
        />
      </div>

      {(subPage === "order-all" || subPage === "order-unpaid") && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === 1 ? "#F9FAFB" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? C.muted : C.text, fontSize: "13px" }}>«</button>
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === 1 ? "#F9FAFB" : "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? C.muted : C.text, fontSize: "13px" }}>‹</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
            const start = Math.max(1, Math.min(page - 3, totalPages - 6));
            const current = start + index;
            return current <= totalPages ? (
              <button key={current} onClick={() => setPage(current)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1.5px solid ${page === current ? C.primary : C.border}`, background: page === current ? C.primary : "#fff", color: page === current ? "#fff" : C.text, fontSize: "13px", cursor: "pointer", fontWeight: page === current ? 700 : 400 }}>
                {current}
              </button>
            ) : null;
          })}
          <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === totalPages ? "#F9FAFB" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? C.muted : C.text, fontSize: "13px" }}>›</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: "6px 10px", borderRadius: "6px", border: `1px solid ${C.border}`, background: page === totalPages ? "#F9FAFB" : "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? C.muted : C.text, fontSize: "13px" }}>»</button>
        </div>
      )}

      {detailOrderId && <OrderDetailModal orderId={detailOrderId} onClose={() => setDetailOrderId(null)} />}
      {cancelConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px 24px", maxWidth: "360px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px", color: "#1a1a1a" }}>결제 취소 확인</h3>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
              주문번호 <strong>{cancelConfirm}</strong>의 결제를 취소하시겠습니까?
              <br />
              결제완료 주문은 토스페이먼츠 취소 API를 통해 환불 처리됩니다.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setCancelConfirm(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1.5px solid #E5E7EB", background: "#fff", cursor: "pointer", fontSize: "14px" }}>아니오</button>
              <button
                onClick={() => {
                  cancelOrder.mutate({ orderId: cancelConfirm, cancelReason: "관리자 취소" });
                  setCancelConfirm(null);
                }}
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
          defaultStatus={statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined}
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
