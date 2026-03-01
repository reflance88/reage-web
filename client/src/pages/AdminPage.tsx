import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

type Tab = "verifications" | "users" | "orders";

const COLORS = {
  bg: "#F7F5F2",
  white: "#FFFFFF",
  primary: "#6B0F1A",
  gold: "#C9A96E",
  border: "#E8E6E3",
  text: "#1A1412",
  muted: "#6B6B6B",
  pending: "#B45309",
  pendingBg: "#FEF3C7",
  approved: "#166534",
  approvedBg: "#DCFCE7",
  rejected: "#991B1B",
  rejectedBg: "#FEE2E2",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: COLORS.pendingBg, color: COLORS.pending, label: "심사 중" },
    approved: { bg: COLORS.approvedBg, color: COLORS.approved, label: "승인" },
    rejected: { bg: COLORS.rejectedBg, color: COLORS.rejected, label: "반려" },
    paid: { bg: COLORS.approvedBg, color: COLORS.approved, label: "결제완료" },
    created: { bg: "#EFF6FF", color: "#1D4ED8", label: "결제대기" },
    failed: { bg: COLORS.rejectedBg, color: COLORS.rejected, label: "실패" },
    cancelled: { bg: "#F3F4F6", color: "#374151", label: "취소" },
    none: { bg: "#F3F4F6", color: "#374151", label: "미제출" },
  };
  const s = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: "999px",
      background: s.bg, color: s.color, fontSize: "12px", fontWeight: 600
    }}>{s.label}</span>
  );
}

// ─── 사업자 인증 심사 탭 ─────────────────────────────────────────────────────
function VerificationsTab() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const [rejectModal, setRejectModal] = useState<{ id: number; userId: number } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: verifications, refetch } = trpc.admin.verifications.useQuery({ status: filter });
  const approveMut = trpc.admin.approveVerification.useMutation({
    onSuccess: () => { toast.success("승인 완료"); refetch(); },
    onError: (e: { message?: string }) => toast.error(e.message),
  });
  const rejectMut = trpc.admin.rejectVerification.useMutation({
    onSuccess: () => { toast.success("반려 완료"); setRejectModal(null); setRejectReason(""); refetch(); },
    onError: (e: { message?: string }) => toast.error(e.message),
  });

  const filterBtns: { label: string; value: typeof filter }[] = [
    { label: "전체", value: undefined },
    { label: "심사 중", value: "pending" },
    { label: "승인", value: "approved" },
    { label: "반려", value: "rejected" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {filterBtns.map(btn => (
          <button key={String(btn.value)} onClick={() => setFilter(btn.value)} style={{
            padding: "6px 16px", borderRadius: "999px", border: `1.5px solid ${filter === btn.value ? COLORS.primary : COLORS.border}`,
            background: filter === btn.value ? COLORS.primary : "#fff",
            color: filter === btn.value ? "#fff" : COLORS.text,
            fontSize: "13px", fontWeight: 600, cursor: "pointer"
          }}>{btn.label}</button>
        ))}
      </div>

      {!verifications?.length ? (
        <p style={{ color: COLORS.muted, textAlign: "center", padding: "40px 0" }}>해당 항목이 없습니다.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {verifications.map(v => (
            <div key={v.id} style={{
              background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "12px",
              padding: "20px 24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px", color: COLORS.text }}>{v.businessName}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <p style={{ fontSize: "13px", color: COLORS.muted, marginBottom: "4px" }}>
                    사업자번호: <strong style={{ color: COLORS.text }}>{v.businessNumber}</strong>
                    {v.contactPhone && <> &nbsp;|&nbsp; 연락처: <strong style={{ color: COLORS.text }}>{v.contactPhone}</strong></>}
                  </p>
                  <p style={{ fontSize: "12px", color: COLORS.muted }}>
                    회원 ID: {v.userId} &nbsp;|&nbsp; 제출일: {new Date(v.submittedAt).toLocaleDateString("ko-KR")}
                    {v.reviewedAt && <> &nbsp;|&nbsp; 심사일: {new Date(v.reviewedAt).toLocaleDateString("ko-KR")}</>}
                  </p>
                  {v.rejectReason && (
                    <p style={{ fontSize: "12px", color: COLORS.rejected, marginTop: "4px" }}>반려 사유: {v.rejectReason}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {v.fileUrl && (
                    <a href={v.fileUrl} target="_blank" rel="noreferrer" style={{
                      padding: "6px 14px", borderRadius: "8px", border: `1.5px solid ${COLORS.gold}`,
                      color: COLORS.gold, fontSize: "12px", fontWeight: 600, textDecoration: "none"
                    }}>서류 보기</a>
                  )}
                  {v.status === "pending" && (
                    <>
                      <button onClick={() => approveMut.mutate({ id: v.id, userId: v.userId })} style={{
                        padding: "6px 16px", borderRadius: "8px", border: "none",
                        background: COLORS.approvedBg, color: COLORS.approved,
                        fontSize: "13px", fontWeight: 700, cursor: "pointer"
                      }}>승인</button>
                      <button onClick={() => setRejectModal({ id: v.id, userId: v.userId })} style={{
                        padding: "6px 16px", borderRadius: "8px", border: "none",
                        background: COLORS.rejectedBg, color: COLORS.rejected,
                        fontSize: "13px", fontWeight: 700, cursor: "pointer"
                      }}>반려</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 반려 사유 모달 */}
      {rejectModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "440px",
            boxShadow: "0 8px 40px rgba(0,0,0,.2)"
          }}>
            <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "16px", color: COLORS.text }}>반려 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요."
              rows={4}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
                fontSize: "14px", resize: "none", outline: "none", boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} style={{
                flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
                background: "#fff", color: COLORS.text, fontSize: "14px", fontWeight: 600, cursor: "pointer"
              }}>취소</button>
              <button onClick={() => {
                if (!rejectReason.trim()) { toast.error("반려 사유를 입력해주세요."); return; }
                rejectMut.mutate({ id: rejectModal.id, userId: rejectModal.userId, reason: rejectReason });
              }} style={{
                flex: 1, padding: "12px", borderRadius: "8px", border: "none",
                background: COLORS.rejected, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer"
              }}>반려 처리</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 회원 관리 탭 ─────────────────────────────────────────────────────────────
function UsersTab() {
  const [page, setPage] = useState(1);
  const { data, refetch } = trpc.admin.users.useQuery({ page, limit: 20 });
  const updateRoleMut = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { toast.success("역할 변경 완료"); refetch(); },
    onError: (e: { message?: string }) => toast.error(e.message),
  });

  const memberRoleLabel = (r: string) => r === "professional" ? "전문가" : "일반";
  const roleLabel = (r: string) => r === "admin" ? "관리자" : "일반";

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F9F7F5", borderBottom: `2px solid ${COLORS.border}` }}>
              {["ID", "이름", "이메일", "로그인", "회원등급", "인증상태", "역할", "가입일", "관리"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.muted, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "10px 12px", color: COLORS.muted }}>{u.id}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: COLORS.text }}>{u.name ?? "-"}</td>
                <td style={{ padding: "10px 12px", color: COLORS.muted }}>{u.email ?? "-"}</td>
                <td style={{ padding: "10px 12px", color: COLORS.muted }}>{u.loginMethod ?? "-"}</td>
                <td style={{ padding: "10px 12px" }}><StatusBadge status={u.memberRole} /></td>
                <td style={{ padding: "10px 12px" }}><StatusBadge status={u.proVerificationStatus} /></td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    display: "inline-block", padding: "2px 10px", borderRadius: "999px",
                    background: u.role === "admin" ? "#EDE9FE" : "#F3F4F6",
                    color: u.role === "admin" ? "#5B21B6" : "#374151",
                    fontSize: "12px", fontWeight: 600
                  }}>{roleLabel(u.role)}</span>
                </td>
                <td style={{ padding: "10px 12px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                  {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <select
                    value={u.role}
                    onChange={e => updateRoleMut.mutate({ userId: u.id, role: e.target.value as "user" | "admin" })}
                    style={{
                      padding: "4px 8px", borderRadius: "6px", border: `1px solid ${COLORS.border}`,
                      fontSize: "12px", cursor: "pointer", background: "#fff"
                    }}
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
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
          padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
          background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: COLORS.text, fontSize: "13px"
        }}>이전</button>
        <span style={{ padding: "6px 12px", fontSize: "13px", color: COLORS.muted }}>{page} 페이지</span>
        <button onClick={() => setPage(p => p + 1)} disabled={(data?.users.length ?? 0) < 20} style={{
          padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
          background: "#fff", cursor: "pointer", color: COLORS.text, fontSize: "13px"
        }}>다음</button>
      </div>
    </div>
  );
}

// ─── 주문 관리 탭 ─────────────────────────────────────────────────────────────
function OrdersTab() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, refetch } = trpc.admin.orders.useQuery({ page, limit: 20 });
  const { data: itemsData } = trpc.admin.orderItems.useQuery(
    { orderDbId: expandedId! },
    { enabled: expandedId !== null }
  );
  const updateStatusMut = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => { toast.success("상태 변경 완료"); refetch(); },
    onError: (e: { message?: string }) => toast.error(e.message),
  });

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F9F7F5", borderBottom: `2px solid ${COLORS.border}` }}>
              {["주문번호", "회원ID", "주문명", "금액", "상태", "결제일", "관리"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: COLORS.muted, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.orders.map(o => (
              <>
                <tr key={o.id} style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}
                  onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                  <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "11px", color: COLORS.muted }}>{o.orderId}</td>
                  <td style={{ padding: "10px 12px", color: COLORS.muted }}>{o.userId}</td>
                  <td style={{ padding: "10px 12px", color: COLORS.text, fontWeight: 600 }}>{o.orderName ?? "-"}</td>
                  <td style={{ padding: "10px 12px", color: COLORS.text, fontWeight: 700 }}>
                    {Number(o.totalAmount).toLocaleString()}원
                  </td>
                  <td style={{ padding: "10px 12px" }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: "10px 12px", color: COLORS.muted, whiteSpace: "nowrap" }}>
                    {o.paidAt ? new Date(o.paidAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <select
                      value={o.status}
                      onChange={e => {
                        e.stopPropagation();
                        updateStatusMut.mutate({ orderId: o.orderId, status: e.target.value as "created" | "paid" | "failed" | "cancelled" });
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding: "4px 8px", borderRadius: "6px", border: `1px solid ${COLORS.border}`,
                        fontSize: "12px", cursor: "pointer", background: "#fff"
                      }}
                    >
                      <option value="created">결제대기</option>
                      <option value="paid">결제완료</option>
                      <option value="failed">실패</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </td>
                </tr>
                {expandedId === o.id && itemsData && (
                  <tr key={`items-${o.id}`}>
                    <td colSpan={7} style={{ padding: "0 12px 12px 12px", background: "#F9F7F5" }}>
                      <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["상품명", "수량", "단가", "소계"].map(h => (
                              <th key={h} style={{ padding: "6px 8px", textAlign: "left", color: COLORS.muted, fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {itemsData.map(item => (
                            <tr key={item.id}>
                              <td style={{ padding: "6px 8px", color: COLORS.text }}>{item.productName}</td>
                              <td style={{ padding: "6px 8px", color: COLORS.muted }}>{item.quantity}</td>
                              <td style={{ padding: "6px 8px", color: COLORS.muted }}>{Number(item.unitPrice).toLocaleString()}원</td>
                              <td style={{ padding: "6px 8px", fontWeight: 700, color: COLORS.text }}>{Number(item.subtotal).toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
          padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
          background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: COLORS.text, fontSize: "13px"
        }}>이전</button>
        <span style={{ padding: "6px 12px", fontSize: "13px", color: COLORS.muted }}>{page} 페이지</span>
        <button onClick={() => setPage(p => p + 1)} disabled={(data?.orders.length ?? 0) < 20} style={{
          padding: "6px 16px", borderRadius: "8px", border: `1.5px solid ${COLORS.border}`,
          background: "#fff", cursor: "pointer", color: COLORS.text, fontSize: "13px"
        }}>다음</button>
      </div>
    </div>
  );
}

// ─── 메인 관리자 페이지 ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("verifications");

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
        <div style={{ width: "32px", height: "32px", border: `2px solid ${COLORS.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg, fontFamily: "'Noto Sans KR', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: COLORS.text, marginBottom: "12px" }}>접근 권한이 없습니다.</p>
          <a href="/index-main.html" style={{ color: COLORS.primary, textDecoration: "none", fontSize: "14px" }}>홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: "verifications", label: "사업자 인증 심사", desc: "인증 서류 검토 및 승인/반려" },
    { id: "users", label: "회원 관리", desc: "전체 회원 조회 및 역할 변경" },
    { id: "orders", label: "주문 관리", desc: "전체 주문 조회 및 상태 변경" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: COLORS.primary, padding: "0 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="/index-main.html" style={{ color: "rgba(255,255,255,.7)", textDecoration: "none", fontSize: "13px" }}>← 홈으로</a>
            <span style={{ color: "rgba(255,255,255,.3)" }}>|</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "16px", letterSpacing: ".08em" }}>REAGE 관리자</span>
          </div>
          <span style={{ color: "rgba(255,255,255,.7)", fontSize: "13px" }}>{user.name ?? user.email}</span>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* 탭 */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "12px 24px", borderRadius: "12px",
              border: `2px solid ${tab === t.id ? COLORS.primary : COLORS.border}`,
              background: tab === t.id ? COLORS.primary : "#fff",
              color: tab === t.id ? "#fff" : COLORS.text,
              cursor: "pointer", textAlign: "left", transition: "all .2s"
            }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>{t.label}</div>
              <div style={{ fontSize: "11px", opacity: .75 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", border: `1px solid ${COLORS.border}` }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: COLORS.text, marginBottom: "20px" }}>
            {tabs.find(t => t.id === tab)?.label}
          </h2>
          {tab === "verifications" && <VerificationsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "orders" && <OrdersTab />}
        </div>
      </div>
    </div>
  );
}
