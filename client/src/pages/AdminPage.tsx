import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data, isLoading, refetch } = trpc.admin.dashboard.useQuery();

  const cards = [
    { label: "대기 중인 인증 요청", value: data?.pendingVerifications ?? 0, color: "#B45309", bg: "#FEF3C7" },
    { label: "전체 회원 수", value: (data?.totalUsers ?? 0) + "명", color: "#1D4ED8", bg: "#EFF6FF" },
    { label: "오늘 결제 완료", value: (data?.todayOrders ?? 0) + "건", color: "#166534", bg: "#DCFCE7" },
    { label: "누적 결제 금액", value: krw(data?.totalPaidAmount ?? 0), color: "#5B21B6", bg: "#EDE9FE" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text }}>대시보드</h2>
        <button onClick={() => refetch()} style={{ padding: "6px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.muted, fontSize: "13px", cursor: "pointer" }}>새로고침</button>
      </div>
      {isLoading ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>로딩 중...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {cards.map((c) => (
            <div key={c.label} style={{ background: c.bg, borderRadius: "16px", padding: "24px", border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: "13px", color: c.color, fontWeight: 600, marginBottom: "8px" }}>{c.label}</p>
              <p style={{ fontSize: "28px", fontWeight: 800, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Verification Tab ──────────────────────────────────────────────────────────
function VerificationsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedVerif, setSelectedVerif] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.searchVerifications.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    page: 1, limit: 50,
  });

  const approveMut = trpc.admin.approveVerificationV2.useMutation({
    onSuccess: () => { toast.success("승인 완료"); setSelectedVerif(null); setConfirmAction(null); utils.admin.searchVerifications.invalidate(); utils.admin.dashboard.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMut = trpc.admin.rejectVerificationV2.useMutation({
    onSuccess: () => { toast.success("반려 처리 완료"); setSelectedVerif(null); setConfirmAction(null); setRejectReason(""); utils.admin.searchVerifications.invalidate(); utils.admin.dashboard.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleConfirm = () => {
    if (!selectedVerif) return;
    if (confirmAction === "approve") approveMut.mutate({ id: selectedVerif.v.id, userId: selectedVerif.v.userId });
    else if (confirmAction === "reject") {
      if (!rejectReason.trim()) { toast.error("반려 사유를 입력해주세요."); return; }
      rejectMut.mutate({ id: selectedVerif.v.id, userId: selectedVerif.v.userId, reason: rejectReason });
    }
  };

  const items = data?.items ?? [];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text, marginRight: "auto" }}>사업자 인증 관리</h2>
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: "6px 16px", borderRadius: "999px", border: `1.5px solid ${statusFilter === s ? C.primary : C.border}`,
            background: statusFilter === s ? C.primary : "#fff", color: statusFilter === s ? "#fff" : C.text,
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}>
            {s === "pending" ? "대기" : s === "approved" ? "승인" : s === "rejected" ? "반려" : "전체"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
          placeholder="이름 / 이메일 / 사업자번호 / 상호명"
          style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "280px", outline: "none" }}
        />
        <button onClick={() => setSearch(searchInput)} style={{ padding: "8px 16px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", fontSize: "13px", cursor: "pointer" }}>검색</button>
        {search && <button onClick={() => { setSearch(""); setSearchInput(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "transparent", color: C.muted, fontSize: "13px", cursor: "pointer" }}>초기화</button>}
      </div>

      {isLoading ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>로딩 중...</p>
      ) : items.length === 0 ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>해당 조건의 인증 요청이 없습니다.</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F9F7F5" }}>
                {["신청일", "이름", "이메일", "사업자번호", "상호명", "상태", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row: any) => (
                <tr key={row.v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", color: C.muted }}>{fmtDate(row.v.createdAt)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{row.userName ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: C.muted }}>{row.userEmail ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>{row.v.businessNumber}</td>
                  <td style={{ padding: "10px 14px" }}>{row.v.businessName}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={row.v.status} /></td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => setSelectedVerif(row)} style={{ padding: "5px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>상세</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedVerif && !confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "520px", boxShadow: "0 8px 40px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: C.text }}>인증 상세</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "13px" }}>
              {[
                ["이름", selectedVerif.userName ?? "—"],
                ["이메일", selectedVerif.userEmail ?? "—"],
                ["사업자번호", selectedVerif.v.businessNumber],
                ["상호명", selectedVerif.v.businessName],
                ["신청일", fmtDate(selectedVerif.v.createdAt)],
                ["현재 상태", null],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <p style={{ color: C.muted, marginBottom: "2px" }}>{label}</p>
                  {val === null ? <StatusBadge status={selectedVerif.v.status} /> : <p style={{ fontWeight: 600, color: C.text }}>{val}</p>}
                </div>
              ))}
            </div>
            {selectedVerif.v.certificateFileUrl && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ color: C.muted, fontSize: "13px", marginBottom: "6px" }}>사업자등록증</p>
                {/\.(jpg|jpeg|png|gif|webp)$/i.test(selectedVerif.v.certificateFileUrl) ? (
                  <img src={selectedVerif.v.certificateFileUrl} alt="사업자등록증" style={{ maxHeight: "200px", borderRadius: "8px", border: `1px solid ${C.border}`, objectFit: "contain" }} />
                ) : (
                  <a href={selectedVerif.v.certificateFileUrl} target="_blank" rel="noreferrer" style={{ color: C.primary, fontSize: "13px", fontWeight: 600 }}>📄 파일 열기 / 다운로드</a>
                )}
              </div>
            )}
            {selectedVerif.v.adminNote && (
              <div style={{ background: "#FEE2E2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                <p style={{ color: "#991B1B", fontSize: "13px" }}>반려 사유: {selectedVerif.v.adminNote}</p>
              </div>
            )}
            {selectedVerif.v.status === "pending" && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ color: C.muted, fontSize: "13px", marginBottom: "6px" }}>반려 사유 (반려 시 필수)</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력하세요..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", resize: "none", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setSelectedVerif(null)} style={{ padding: "10px 20px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>닫기</button>
              {selectedVerif.v.status === "pending" && (
                <>
                  <button onClick={() => setConfirmAction("reject")} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#FEE2E2", color: "#991B1B", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>반려</button>
                  <button onClick={() => setConfirmAction("approve")} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#166534", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>승인</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction === "approve" ? "승인 확인" : "반려 확인"}
        message={confirmAction === "approve"
          ? "이 사업자 인증을 승인하시겠습니까? 승인 후 해당 회원은 즉시 전문가 가격이 적용됩니다."
          : `반려 사유 "${rejectReason}" — 정말 반려 처리하시겠습니까?`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={approveMut.isPending || rejectMut.isPending}
        danger={confirmAction === "reject"}
      />
    </div>
  );
}

// ─── Product Tab ───────────────────────────────────────────────────────────────
function ProductsTab() {
  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.admin.allProducts.useQuery();
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ priceConsumer: "", pricePro: "", isProOnly: false, visible: true });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const updateMut = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { toast.success("가격 저장 완료"); setEditTarget(null); setConfirmOpen(false); utils.admin.allProducts.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (p: any) => {
    setEditTarget(p);
    setForm({ priceConsumer: String(p.priceConsumer), pricePro: String(p.pricePro), isProOnly: !!p.isProOnly, visible: p.visible !== false });
  };

  const handleSave = () => {
    const pc = Number(form.priceConsumer), pp = Number(form.pricePro);
    if (isNaN(pc) || pc < 0 || isNaN(pp) || pp < 0) { toast.error("가격은 0 이상의 숫자여야 합니다."); return; }
    setConfirmOpen(true);
  };

  const priceWarning = form.priceConsumer && form.pricePro && Number(form.pricePro) >= Number(form.priceConsumer);

  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text, marginBottom: "20px" }}>제품 관리</h2>
      {isLoading ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>로딩 중...</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F9F7F5" }}>
                {["제품명", "Slug", "일반가", "전문가가", "전문가 전용", "노출", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p: any) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{p.name}</td>
                  <td style={{ padding: "10px 14px", color: C.muted, fontFamily: "monospace", fontSize: "12px" }}>{p.slug}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{krw(p.priceConsumer)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#5B21B6" }}>{krw(p.pricePro)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: p.isProOnly ? "#5B21B6" : C.muted }}>{p.isProOnly ? "전용" : "—"}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: p.visible !== false ? "#166534" : "#991B1B" }}>{p.visible !== false ? "노출" : "숨김"}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => openEdit(p)} style={{ padding: "5px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>수정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && !confirmOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "20px", color: C.text }}>제품 편집 — {editTarget.name}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "13px", color: C.muted, display: "block", marginBottom: "4px" }}>일반가 (원)</label>
                <input type="number" min={0} value={form.priceConsumer} onChange={(e) => setForm((f) => ({ ...f, priceConsumer: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: C.muted, display: "block", marginBottom: "4px" }}>전문가가 (원)</label>
                <input type="number" min={0} value={form.pricePro} onChange={(e) => setForm((f) => ({ ...f, pricePro: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                {priceWarning && <p style={{ fontSize: "12px", color: "#B45309", marginTop: "4px" }}>⚠️ 전문가가가 일반가 이상입니다. 확인해주세요.</p>}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>전문가 전용 상품</label>
                <button onClick={() => setForm((f) => ({ ...f, isProOnly: !f.isProOnly }))}
                  style={{ width: "48px", height: "26px", borderRadius: "999px", border: "none", background: form.isProOnly ? C.primary : "#D1D5DB", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                  <span style={{ position: "absolute", top: "3px", left: form.isProOnly ? "24px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>홈페이지 노출</label>
                <button onClick={() => setForm((f) => ({ ...f, visible: !f.visible }))}
                  style={{ width: "48px", height: "26px", borderRadius: "999px", border: "none", background: form.visible ? C.primary : "#D1D5DB", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                  <span style={{ position: "absolute", top: "3px", left: form.visible ? "24px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
              <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>취소</button>
              <button onClick={handleSave} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: C.primary, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>저장</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="가격 변경 확인"
        message={`${editTarget?.name}의 일반가를 ${krw(form.priceConsumer)}, 전문가가를 ${krw(form.pricePro)}으로 변경하시겠습니까?`}
        onConfirm={() => updateMut.mutate({ id: editTarget.id, priceConsumer: form.priceConsumer, pricePro: form.pricePro, isProOnly: form.isProOnly, visible: form.visible })}
        onCancel={() => setConfirmOpen(false)}
        loading={updateMut.isPending}
      />
    </div>
  );
}

// ─── Order Tab ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<"paid" | "created" | "failed" | "cancelled" | "all">("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = trpc.admin.searchOrders.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    page: 1, limit: 50,
  });
  const { data: orderDetail } = trpc.admin.orderDetail.useQuery(
    { orderId: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );

  const items = data?.items ?? [];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text, marginRight: "auto" }}>주문 조회</h2>
        {(["all", "paid", "created", "failed", "cancelled"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: "6px 16px", borderRadius: "999px", border: `1.5px solid ${statusFilter === s ? C.primary : C.border}`,
            background: statusFilter === s ? C.primary : "#fff", color: statusFilter === s ? "#fff" : C.text,
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
          }}>
            {s === "all" ? "전체" : s === "paid" ? "결제완료" : s === "created" ? "생성됨" : s === "failed" ? "실패" : "취소"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
          placeholder="주문번호 / 이메일 검색"
          style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "260px", outline: "none" }}
        />
        <button onClick={() => setSearch(searchInput)} style={{ padding: "8px 16px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", fontSize: "13px", cursor: "pointer" }}>검색</button>
        {search && <button onClick={() => { setSearch(""); setSearchInput(""); }} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "transparent", color: C.muted, fontSize: "13px", cursor: "pointer" }}>초기화</button>}
      </div>

      {isLoading ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>로딩 중...</p>
      ) : items.length === 0 ? (
        <p style={{ color: C.muted, textAlign: "center", padding: "40px 0" }}>해당 조건의 주문이 없습니다.</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#F9F7F5" }}>
                {["주문일", "주문번호", "이메일", "상태", "금액", "결제일", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row: any) => (
                <tr key={row.o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px", color: C.muted }}>{fmtDate(row.o.createdAt)}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "11px", color: C.muted }}>{row.o.orderId}</td>
                  <td style={{ padding: "10px 14px", color: C.text }}>{row.userEmail ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={row.o.status} /></td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{krw(row.o.totalAmount)}</td>
                  <td style={{ padding: "10px 14px", color: C.muted }}>{fmtDate(row.o.paidAt)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={() => setSelectedOrderId(row.o.orderId)} style={{ padding: "5px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>상세</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "560px", boxShadow: "0 8px 40px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: C.text }}>주문 상세</h3>
            {orderDetail ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px", fontSize: "13px" }}>
                  {[
                    ["주문번호", orderDetail.order.orderId],
                    ["상태", null],
                    ["결제 수단", (orderDetail.order as any).paymentProvider ?? "—"],
                    ["결제 키", orderDetail.order.paymentKey ? orderDetail.order.paymentKey.slice(0, 20) + "..." : "—"],
                    ["결제 금액", krw(orderDetail.order.totalAmount)],
                    ["결제일", fmtDate(orderDetail.order.paidAt)],
                  ].map(([label, val]) => (
                    <div key={label as string}>
                      <p style={{ color: C.muted, marginBottom: "2px" }}>{label}</p>
                      {val === null ? <StatusBadge status={orderDetail.order.status} /> : <p style={{ fontWeight: 600, color: C.text, fontFamily: label === "주문번호" || label === "결제 키" ? "monospace" : undefined, fontSize: label === "주문번호" || label === "결제 키" ? "11px" : undefined }}>{val}</p>}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "13px", color: C.muted, marginBottom: "8px", fontWeight: 600 }}>주문 상품</p>
                <div style={{ borderRadius: "8px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#F9F7F5" }}>
                        {["상품명", "수량", "단가", "소계"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: C.muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetail.items.map((item: any) => (
                        <tr key={item.id} style={{ borderTop: `1px solid ${C.border}` }}>
                          <td style={{ padding: "8px 12px", color: C.text }}>{item.productName}</td>
                          <td style={{ padding: "8px 12px", color: C.muted }}>{item.quantity}</td>
                          <td style={{ padding: "8px 12px", color: C.muted }}>{krw(item.unitPrice)}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: C.text }}>{krw(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>로딩 중...</p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button onClick={() => setSelectedOrderId(null)} style={{ padding: "10px 24px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [page, setPage] = useState(1);
  const { data, refetch } = trpc.admin.users.useQuery({ page, limit: 20 });
  const updateRoleMut = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("역할 변경 완료"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h2 style={{ fontSize: "20px", fontWeight: 700, color: C.text, marginBottom: "20px" }}>회원 관리</h2>
      <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F9F7F5" }}>
              {["ID", "이름", "이메일", "회원 등급", "인증 상태", "가입일", "시스템 역할"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.users ?? []).map((u: any) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 14px", color: C.muted }}>{u.id}</td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: C.text }}>{u.name ?? "—"}</td>
                <td style={{ padding: "10px 14px", color: C.muted }}>{u.email ?? "—"}</td>
                <td style={{ padding: "10px 14px" }}><StatusBadge status={u.memberRole ?? "consumer"} /></td>
                <td style={{ padding: "10px 14px" }}><StatusBadge status={u.proVerificationStatus ?? "none"} /></td>
                <td style={{ padding: "10px 14px", color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(u.createdAt)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <select
                    value={u.role}
                    onChange={(e) => updateRoleMut.mutate({ userId: u.id, role: e.target.value as "user" | "admin" })}
                    style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${C.border}`, fontSize: "12px", cursor: "pointer", background: "#fff" }}
                  >
                    <option value="user">일반</option>
                    <option value="admin">관리자</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: C.text, fontSize: "13px" }}>이전</button>
        <span style={{ padding: "6px 12px", fontSize: "13px", color: C.muted }}>{page} 페이지</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={(data?.users.length ?? 0) < 20} style={{ padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", color: C.text, fontSize: "13px" }}>다음</button>
      </div>
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
type Tab = "dashboard" | "verifications" | "products" | "orders" | "users";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ width: "32px", height: "32px", border: `2px solid ${C.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: "16px" }}>
        <p style={{ fontSize: "18px", fontWeight: 700, color: C.text }}>접근 권한이 없습니다.</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>메인으로</button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "대시보드" },
    { id: "verifications", label: "사업자 인증" },
    { id: "products", label: "제품 관리" },
    { id: "orders", label: "주문 조회" },
    { id: "users", label: "회원 관리" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <header style={{ background: C.sidebar, padding: "0 24px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px", letterSpacing: ".08em" }}>REAGE</span>
          <span style={{ background: C.primary, color: "#fff", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px" }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: C.sidebarText, fontSize: "13px" }}>{user.name ?? user.email}</span>
          <button onClick={() => navigate("/")} style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: C.sidebarText, fontSize: "12px", cursor: "pointer" }}>사이트로</button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: "200px", background: C.sidebar, padding: "16px 8px", flexShrink: 0 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "8px", border: "none",
                  background: activeTab === t.id ? C.primary : "transparent",
                  color: activeTab === t.id ? "#fff" : C.sidebarText,
                  fontSize: "13px", fontWeight: activeTab === t.id ? 700 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "28px 32px", overflowAuto: "auto" } as any}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", border: `1px solid ${C.border}`, minHeight: "400px" }}>
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "verifications" && <VerificationsTab />}
            {activeTab === "products" && <ProductsTab />}
            {activeTab === "orders" && <OrdersTab />}
            {activeTab === "users" && <UsersTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
