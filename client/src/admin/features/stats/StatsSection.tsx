import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { Suspense, lazy, useState, type ReactNode } from "react";

const StatsDashboardCharts = lazy(() =>
  import("./StatsChartViews").then((module) => ({ default: module.StatsDashboardCharts })),
);
const InquiryStatsCharts = lazy(() =>
  import("./StatsChartViews").then((module) => ({ default: module.InquiryStatsCharts })),
);
const SalesCharts = lazy(() =>
  import("./StatsChartViews").then((module) => ({ default: module.SalesCharts })),
);
const CustomerCharts = lazy(() =>
  import("./StatsChartViews").then((module) => ({ default: module.CustomerCharts })),
);
const TrafficCharts = lazy(() =>
  import("./StatsChartViews").then((module) => ({ default: module.TrafficCharts })),
);

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
              <th key={index} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
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
    <select value={value} onChange={(event) => onChange(event.target.value)} style={{ padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", background: "#fff", cursor: "pointer" }}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ChartLoading({ minHeight = 320 }: { minHeight?: number }) {
  return (
    <div style={{ minHeight: `${minHeight}px`, background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: "13px" }}>
      차트를 불러오는 중...
    </div>
  );
}

function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
}

function InquiryStatsSection() {
  const [periodMonths, setPeriodMonths] = useState<number | undefined>(undefined);
  const stats = trpc.sbContact.stats.useQuery({ months: periodMonths });

  if (stats.isLoading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.muted }}>데이터를 불러오는 중...</div>;
  }

  if (stats.error) {
    return <div style={{ padding: 32, color: "#dc2626", textAlign: "center" }}>통계 데이터를 불러오지 못했습니다.</div>;
  }

  const data = stats.data;
  const kpi = data?.kpi ?? { total: 0, thisMonth: 0, unhandled: 0, processingRate: 0 };
  const monthly = data?.monthly ?? [];
  const byType = data?.byType ?? [];
  const byStatus = data?.byStatus ?? [];
  const funnel = (data as any)?.funnel ?? [];
  const byRegion = (data as any)?.byRegion ?? [];
  const conversionStats = (data as any)?.conversionStats ?? null;

  return (
    <Suspense fallback={<ChartLoading minHeight={960} />}>
      <InquiryStatsCharts
        periodMonths={periodMonths}
        onChangePeriodMonths={setPeriodMonths}
        onRefresh={() => stats.refetch()}
        kpi={kpi}
        monthly={monthly}
        byType={byType}
        byStatus={byStatus}
        funnel={funnel}
        byRegion={byRegion}
        conversionStats={conversionStats}
      />
    </Suspense>
  );
}

export function StatsSection({ subPage }: { subPage: string }) {
  const [salesPeriod, setSalesPeriod] = useState<"day" | "week" | "month">("day");
  const [salesDays, setSalesDays] = useState(30);
  const [deviceFilter, setDeviceFilter] = useState<"all" | "pc" | "mobile">("all");
  const [dashDays, setDashDays] = useState(30);

  const salesStats = trpc.admin.salesStats.useQuery({ period: salesPeriod, days: salesDays });
  const productStats = trpc.admin.productSalesStats.useQuery();
  const customerStats = trpc.admin.customerStats.useQuery();
  const pageViewStats = trpc.admin.pageViewStats.useQuery({ days: dashDays });
  const orderStats = trpc.admin.dashboardCharts.useQuery({ days: dashDays });

  if (subPage === "stats-dashboard") {
    return (
      <Suspense fallback={<ChartLoading minHeight={320} />}>
        <StatsDashboardCharts dashDays={dashDays} onChangeDays={setDashDays} orderStats={orderStats.data?.orderStats ?? []} totalPageViews={pageViewStats.data?.total ?? 0} />
      </Suspense>
    );
  }

  if (subPage === "stats-inquiry") {
    return <InquiryStatsSection />;
  }

  if (subPage === "stats-sales") {
    return (
      <div>
        <SectionHeader
          title="매출 분석"
          action={
            <div style={{ display: "flex", gap: "8px" }}>
              <FilterSelect value={salesPeriod} onChange={(value) => setSalesPeriod(value as "day" | "week" | "month")} options={[{ value: "day", label: "일별" }, { value: "week", label: "주별" }, { value: "month", label: "월별" }]} />
              <FilterSelect value={String(salesDays)} onChange={(value) => setSalesDays(Number(value))} options={[{ value: "30", label: "최근 30일" }, { value: "60", label: "최근 60일" }, { value: "90", label: "최근 90일" }]} />
            </div>
          }
        />
        <Suspense fallback={<ChartLoading minHeight={720} />}>
          <SalesCharts salesData={salesStats.data ?? []} />
        </Suspense>
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
              rows={(productStats.data?.topSelling ?? []).map((row: any, index: number) => [
                <span style={{ fontWeight: 700, color: index < 3 ? C.primary : C.text }}>#{index + 1}</span>,
                row.productName,
                row.totalQty + "개",
                krw(row.totalRevenue),
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
        <Suspense fallback={<ChartLoading minHeight={520} />}>
          <CustomerCharts byMemberRole={customerStats.data?.byMemberRole ?? []} byDayOfWeek={customerStats.data?.byDayOfWeek ?? []} byHour={customerStats.data?.byHour ?? []} />
        </Suspense>
      </div>
    );
  }

  const filteredByDay = (pageViewStats.data?.byDay ?? []).filter((row: any) => (deviceFilter === "all" ? true : row.device === deviceFilter));
  const aggregatedByDay = filteredByDay.reduce((acc: any[], row: any) => {
    const existing = acc.find((item) => item.day === row.day);
    if (existing) existing.count += row.count;
    else acc.push({ day: row.day, count: row.count });
    return acc;
  }, []);

  return (
    <div>
      <SectionHeader title="접속 통계" action={<FilterSelect value={deviceFilter} onChange={(value) => setDeviceFilter(value as "all" | "pc" | "mobile")} options={[{ value: "all", label: "전체" }, { value: "pc", label: "PC" }, { value: "mobile", label: "모바일" }]} />} />
      <Suspense fallback={<ChartLoading minHeight={640} />}>
        <TrafficCharts total={pageViewStats.data?.total ?? 0} byDevice={pageViewStats.data?.byDevice ?? []} aggregatedByDay={aggregatedByDay} topPages={pageViewStats.data?.topPages ?? []} />
      </Suspense>
    </div>
  );
}
