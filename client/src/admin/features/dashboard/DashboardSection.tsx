import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { Suspense, lazy, useState, type ReactNode } from "react";

const DashboardCharts = lazy(() =>
  import("./DashboardCharts").then((module) => ({ default: module.DashboardCharts })),
);

function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
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

export function DashboardSection() {
  const [days, setDays] = useState(30);
  const summaryQuery = trpc.admin.dashboard.useQuery();
  const chartsQuery = trpc.admin.dashboardCharts.useQuery({ days });
  const summary = summaryQuery.data;
  const orderStats = { data: chartsQuery.data?.orderStats };
  const signupStats = { data: chartsQuery.data?.signupStats };
  const verStats = { data: chartsQuery.data?.verificationStats };

  return (
    <div>
      <SectionHeader
        title="대시보드"
        action={
          <FilterSelect
            value={String(days)}
            onChange={(value) => setDays(Number(value))}
            options={[
              { value: "7", label: "최근 7일" },
              { value: "14", label: "최근 14일" },
              { value: "30", label: "최근 30일" },
              { value: "60", label: "최근 60일" },
              { value: "90", label: "최근 90일" },
            ]}
          />
        }
      />

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <SummaryCard label="대기 중 인증" value={summary?.pendingVerifications ?? "—"} color={C.orange} />
        <SummaryCard label="전체 회원" value={summary?.totalUsers ?? "—"} />
        <SummaryCard label="오늘 주문" value={summary?.todayOrders ?? "—"} color={C.green} />
        <SummaryCard label="누적 매출" value={summary ? krw(summary.totalPaidAmount) : "—"} color={C.primary} />
      </div>

      <Suspense
        fallback={
          <div style={{ minHeight: "460px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} style={{ minHeight: "220px", background: "#fff", borderRadius: "12px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: "13px" }}>
                차트를 불러오는 중...
              </div>
            ))}
          </div>
        }
      >
        <DashboardCharts orderStats={orderStats.data ?? []} signupStats={signupStats.data ?? []} verificationStats={verStats.data} />
      </Suspense>
    </div>
  );
}
