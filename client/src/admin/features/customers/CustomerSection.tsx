import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR");
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
    professional: { bg: "#EDE9FE", color: "#5B21B6", label: "전문가" },
    consumer: { bg: "#F3F4F6", color: "#374151", label: "일반" },
    membership: { bg: "#EDE9FE", color: "#5B21B6", label: "멤버십" },
    user: { bg: "#F3F4F6", color: "#374151", label: "일반" },
    admin: { bg: "#EDE9FE", color: "#5B21B6", label: "관리자" },
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

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
        <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px", color: C.text }}>{title}</h3>
        <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px", lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: danger ? "#991B1B" : C.primary, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
      <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: color ?? C.text }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>{sub}</div>}
    </div>
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

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9F8F7" }}>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: C.muted,
                  borderBottom: `1px solid ${C.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
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
      style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "260px", outline: "none" }}
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
      style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", background: "#fff", cursor: "pointer" }}
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
      style={{ padding: pad, borderRadius: "8px", border, background: bg, color, fontSize: size === "sm" ? "12px" : "13px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );
}

function ExportButton({ statusFilter, typeFilter }: { statusFilter: string; typeFilter: string }) {
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();

  const typeLabel: Record<string, string> = {
    trial: "체험예약",
    introduction: "도입상담",
    education: "교육문의",
  };
  const statusLabel: Record<string, string> = {
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
      const XLSX = await import("xlsx");

      const rows = (result?.items ?? []).map((item: any) => ({
        접수번호: item.id,
        문의유형: typeLabel[item.inquiry_type] ?? item.inquiry_type,
        이름: item.name ?? "",
        연락처: item.phone ?? "",
        이메일: item.email ?? "",
        상호명: item.shop_name ?? "",
        지역: item.region ?? "",
        선호날짜: item.preferred_date ?? "",
        교육프로그램: item.education_program ?? "",
        문의내용: item.message ?? "",
        개인정보동의: item.privacy_agreed ? "동의" : "미동의",
        상태: statusLabel[item.status] ?? item.status,
        관리자메모: item.admin_memo ?? "",
        접수일시: item.created_at ? new Date(item.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 16 },
        { wch: 24 },
        { wch: 16 },
        { wch: 12 },
        { wch: 14 },
        { wch: 18 },
        { wch: 40 },
        { wch: 12 },
        { wch: 10 },
        { wch: 30 },
        { wch: 22 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "문의목록");
      const now = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `REAGE_문의목록_${now}.xlsx`);
      toast.success(`${rows.length}건 엑셀 파일 다운로드 완료`);
    } catch (error: any) {
      toast.error("엑셀 내보내기 실패: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap", padding: "5px 14px", fontSize: "13px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.white, cursor: exporting ? "not-allowed" : "pointer", color: C.text, opacity: exporting ? 0.6 : 1 }}
    >
      {exporting ? "내보내는 중..." : "📥 엑셀 내보내기"}
    </button>
  );
}

function InquirySection() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
    onError: (error) => toast.error("상태 변경 실패: " + error.message),
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
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "전체 상태" },
            { value: "received", label: "접수" },
            { value: "contacted", label: "연락완료" },
            { value: "closed", label: "종료" },
          ]}
        />
        <FilterSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setPage(1);
          }}
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
            <Btn size="sm" variant="outline" onClick={() => openDetail(item)}>
              상세
            </Btn>,
          ])}
        />
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "16px" }}>
          <Btn size="sm" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            ← 이전
          </Btn>
          <span style={{ fontSize: "13px", padding: "6px 12px", color: C.muted }}>
            {page} / {totalPages}
          </span>
          <Btn size="sm" variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
            다음 →
          </Btn>
        </div>
      )}

      {detailOpen && selectedInquiry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "600px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 800 }}>문의 상세</h3>
              <button onClick={() => setDetailOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px", fontSize: "13px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>문의 유형</span>
                <StatusBadge status={selectedInquiry.inquiry_type} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>이름</span>
                <span style={{ fontWeight: 600 }}>{selectedInquiry.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>연락처</span>
                <span>{selectedInquiry.phone}</span>
              </div>
              {selectedInquiry.email && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>이메일</span>
                  <span>{selectedInquiry.email}</span>
                </div>
              )}
              {selectedInquiry.shop_name && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>상호명</span>
                  <span>{selectedInquiry.shop_name}</span>
                </div>
              )}
              {selectedInquiry.region && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>지역</span>
                  <span>{selectedInquiry.region}</span>
                </div>
              )}
              {selectedInquiry.preferred_date && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>선호 날짜</span>
                  <span>{selectedInquiry.preferred_date}</span>
                </div>
              )}
              {selectedInquiry.education_program && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>교육 코스</span>
                  <span>{selectedInquiry.education_program}</span>
                </div>
              )}
              {selectedInquiry.message && (
                <div>
                  <div style={{ color: C.muted, marginBottom: "6px" }}>문의 내용</div>
                  <div style={{ background: C.bg, borderRadius: "8px", padding: "12px", fontSize: "13px", lineHeight: 1.7 }}>{selectedInquiry.message}</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>접수일</span>
                <span>{fmtDate(selectedInquiry.created_at)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.muted }}>상태</span>
                <FilterSelect
                  value={selectedInquiry.status}
                  onChange={(value) => {
                    updateStatus.mutate({ id: String(selectedInquiry.id), status: value as any, admin_memo: adminMemo });
                    setSelectedInquiry({ ...selectedInquiry, status: value });
                  }}
                  options={[
                    { value: "received", label: "접수" },
                    { value: "contacted", label: "연락완료" },
                    { value: "closed", label: "종료" },
                  ]}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: C.text }}>관리자 메모</div>
              <textarea
                value={adminMemo}
                onChange={(event) => setAdminMemo(event.target.value)}
                placeholder="내부 메모 입력..."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setDetailOpen(false)}>
                닫기
              </Btn>
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
    onSuccess: () => {
      toast.success("멤버십 등급이 변경되었습니다.");
      users.refetch();
      setModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const allUsers = users.data?.users ?? [];
  const filtered = allUsers.filter((user: any) => {
    const matchSearch = !search || user.name?.includes(search) || user.email?.includes(search);
    const matchGrade = gradeFilter === "all" || (user.memberRole ?? "consumer") === gradeFilter;
    return matchSearch && matchGrade;
  });

  const openModal = (user: any) => {
    setSelectedUser(user);
    setNewGrade(user.memberRole ?? "consumer");
    const found = MEMBERSHIP_GRADES.find((grade) => grade.value === (user.memberRole ?? "consumer"));
    setDiscountRate(found?.discount ?? 0);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    setMembership.mutate({ userId: selectedUser.id, membershipGrade: newGrade as "consumer" | "professional" | "membership", discountRate });
  };

  const gradeLabel = (grade: string | null) => MEMBERSHIP_GRADES.find((entry) => entry.value === (grade ?? "consumer"))?.label ?? "일반";
  const gradeColor = (grade: string | null) => {
    if (grade === "membership") return "#7c3aed";
    if (grade === "professional") return "#0369a1";
    return C.muted;
  };

  return (
    <div>
      <SectionHeader title="멤버십 등급 관리" />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        {MEMBERSHIP_GRADES.map((grade) => (
          <div key={grade.value} style={{ flex: 1, minWidth: "140px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: gradeColor(grade.value), marginBottom: "4px" }}>{grade.label}</div>
            <div style={{ fontSize: "12px", color: C.muted }}>
              할인율: <strong>{grade.discount}%</strong>
            </div>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>
              {grade.value === "professional" && "사업자 인증 완료 회원"}
              {grade.value === "membership" && "최고 등급 · 전문가보다 추가 할인"}
              {grade.value === "consumer" && "기본 등급"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <SearchBar value={search} onChange={setSearch} placeholder="이름 또는 이메일 검색" />
        <FilterSelect
          value={gradeFilter}
          onChange={setGradeFilter}
          options={[{ value: "all", label: "전체 등급" }, ...MEMBERSHIP_GRADES.map((grade) => ({ value: grade.value, label: grade.label }))]}
        />
      </div>

      {users.isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
      ) : (
        <Table
          headers={["이름", "이메일", "현재 등급", "할인율", "가입일", "관리"]}
          rows={filtered.map((user: any) => [
            <span style={{ fontWeight: 600 }}>{user.name ?? "—"}</span>,
            <span style={{ fontSize: "12px", color: C.muted }}>{user.email ?? "—"}</span>,
            <span style={{ fontWeight: 700, color: gradeColor(user.memberRole) }}>{gradeLabel(user.memberRole)}</span>,
            <span>{MEMBERSHIP_GRADES.find((grade) => grade.value === (user.memberRole ?? "consumer"))?.discount ?? 0}%</span>,
            <span style={{ fontSize: "12px", color: C.muted }}>{fmtDate(user.createdAt)}</span>,
            <Btn size="sm" variant="outline" onClick={() => openModal(user)}>
              등급 변경
            </Btn>,
          ])}
        />
      )}

      {modalOpen && selectedUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.white, borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>멤버십 등급 변경</h3>
            <p style={{ fontSize: "13px", color: C.muted, marginBottom: "24px" }}>
              {selectedUser.name} ({selectedUser.email})
            </p>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "6px" }}>등급 선택</label>
              <select
                value={newGrade}
                onChange={(event) => {
                  setNewGrade(event.target.value);
                  const found = MEMBERSHIP_GRADES.find((grade) => grade.value === event.target.value);
                  setDiscountRate(found?.discount ?? 0);
                }}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px" }}
              >
                {MEMBERSHIP_GRADES.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label} ({grade.discount}% 할인)
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "6px" }}>할인율 (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={discountRate}
                onChange={(event) => setDiscountRate(Number(event.target.value))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <Btn variant="outline" onClick={() => setModalOpen(false)}>
                취소
              </Btn>
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

export function CustomerSection({ subPage }: { subPage: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVer, setSelectedVer] = useState<any>(null);
  const [verDetailOpen, setVerDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: "approve" | "reject"; id: number; userId: string }>(null);
  const [rejectReason, setRejectReason] = useState("");

  const users = trpc.admin.users.useQuery({ page: 1, limit: 50 });
  const verifications = trpc.admin.searchVerifications.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    page: 1,
    limit: 50,
  });
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("역할이 변경되었습니다.");
      users.refetch();
    },
  });
  const approveVer = trpc.admin.approveVerification.useMutation({
    onSuccess: () => {
      toast.success("인증이 승인되었습니다.");
      verifications.refetch();
      setConfirmAction(null);
    },
  });
  const rejectVer = trpc.admin.rejectVerification.useMutation({
    onSuccess: () => {
      toast.success("인증이 반려되었습니다.");
      verifications.refetch();
      setConfirmAction(null);
    },
  });

  const title =
    subPage === "customer-dashboard"
      ? "고객 대시보드"
      : subPage === "customer-search"
        ? "회원 조회"
        : subPage === "customer-manage"
          ? "회원 관리"
          : subPage === "customer-inquiry"
            ? "문의 관리"
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
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "전체" },
              { value: "pending", label: "대기" },
              { value: "approved", label: "승인" },
              { value: "rejected", label: "반려" },
            ]}
          />
        </div>
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["회원", "상호명", "사업자번호", "상태", "신청일", "관리"]}
            rows={(verifications.data?.items ?? []).map((item: any) => [
              <div>
                <div style={{ fontWeight: 600 }}>{item.userName ?? "—"}</div>
                <div style={{ fontSize: "11px", color: C.muted }}>{item.userEmail ?? "—"}</div>
              </div>,
              item.v.businessName,
              item.v.businessNumber,
              <StatusBadge status={item.v.status} />,
              fmtDate(item.v.submittedAt),
              <div style={{ display: "flex", gap: "6px" }}>
                <Btn size="sm" variant="outline" onClick={() => { setSelectedVer(item); setVerDetailOpen(true); }}>
                  상세
                </Btn>
                {item.v.status === "pending" && (
                  <>
                    <Btn size="sm" variant="success" onClick={() => setConfirmAction({ type: "approve", id: item.v.id, userId: item.v.userId })}>
                      승인
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setConfirmAction({ type: "reject", id: item.v.id, userId: item.v.userId });
                        setRejectReason("");
                      }}
                    >
                      반려
                    </Btn>
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
                <button onClick={() => setVerDetailOpen(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
              <div style={{ display: "grid", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>회원</span>
                  <span>
                    {selectedVer.userName} ({selectedVer.userEmail})
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>상호명</span>
                  <span>{selectedVer.v.businessName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>사업자번호</span>
                  <span>{selectedVer.v.businessNumber}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>연락처</span>
                  <span>{selectedVer.v.contactPhone ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>상태</span>
                  <StatusBadge status={selectedVer.v.status} />
                </div>
                {selectedVer.v.rejectReason && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.muted }}>반려 사유</span>
                    <span style={{ color: "#991B1B" }}>{selectedVer.v.rejectReason}</span>
                  </div>
                )}
                {selectedVer.v.fileUrl && (
                  <div>
                    <span style={{ color: C.muted, display: "block", marginBottom: "8px" }}>첨부 서류</span>
                    <a href={selectedVer.v.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary, fontWeight: 600 }}>
                      📄 서류 보기
                    </a>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Btn size="sm" variant="outline" onClick={() => setVerDetailOpen(false)}>
                  닫기
                </Btn>
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
            .filter((user: any) => {
              if (!search) return true;
              return user.name?.includes(search) || user.email?.includes(search);
            })
            .map((user: any) => [
              user.name ?? "—",
              user.email ?? "—",
              <StatusBadge status={user.role} />,
              <StatusBadge status={user.memberRole} />,
              <StatusBadge status={user.proVerificationStatus} />,
              fmtDate(user.createdAt),
              ...(subPage === "customer-manage"
                ? [
                    <FilterSelect
                      value={user.role}
                      onChange={(value) => updateRole.mutate({ userId: user.id, role: value as "user" | "admin" })}
                      options={[
                        { value: "user", label: "일반" },
                        { value: "admin", label: "관리자" },
                      ]}
                    />,
                  ]
                : []),
            ])}
        />
      </div>
    </div>
  );
}
