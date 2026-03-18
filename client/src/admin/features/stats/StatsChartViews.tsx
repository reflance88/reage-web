import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
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

const DOW_LABELS = ["", "일", "월", "화", "수", "목", "금", "토"];

export function StatsDashboardCharts({
  dashDays,
  onChangeDays,
  orderStats,
  totalPageViews,
}: {
  dashDays: number;
  onChangeDays: (days: number) => void;
  orderStats: any[];
  totalPageViews: number;
}) {
  const dashPeriods = [
    { label: "최근 3개월", value: 90 },
    { label: "최근 6개월", value: 180 },
    { label: "최근 1년", value: 365 },
    { label: "전체", value: 730 },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: "20px", fontWeight: 800, color: C.text }}>통계 대시보드</div>
        <div style={{ display: "flex", gap: 6 }}>
          {dashPeriods.map((period) => (
            <button
              key={period.value}
              onClick={() => onChangeDays(period.value)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                borderRadius: 20,
                border: `1px solid ${dashDays === period.value ? C.primary : C.border}`,
                background: dashDays === period.value ? C.primary : C.white,
                color: dashDays === period.value ? "#fff" : C.text,
                cursor: "pointer",
                fontWeight: dashDays === period.value ? 700 : 400,
              }}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={orderStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(value) => (value / 10000).toFixed(0) + "만"} />
              <Tooltip formatter={(value: number) => krw(value)} />
              <Area type="monotone" dataKey="revenue" stroke={C.gold} fill={C.gold} fillOpacity={0.15} name="매출" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>방문자 현황</div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: C.primary }}>{totalPageViews}</div>
          <div style={{ fontSize: "12px", color: C.muted }}>선택 기간 총 방문</div>
        </div>
      </div>
    </div>
  );
}

export function InquiryStatsCharts({
  periodMonths,
  onChangePeriodMonths,
  onRefresh,
  kpi,
  monthly,
  byType,
  byStatus,
  funnel,
  byRegion,
  conversionStats,
}: {
  periodMonths?: number;
  onChangePeriodMonths: (months: number | undefined) => void;
  onRefresh: () => void;
  kpi: { total: number; thisMonth: number; unhandled: number; processingRate: number };
  monthly: any[];
  byType: any[];
  byStatus: any[];
  funnel: any[];
  byRegion: any[];
  conversionStats: any;
}) {
  const periods: { label: string; value: number | undefined }[] = [
    { label: "전체", value: undefined },
    { label: "최근 3개월", value: 3 },
    { label: "최근 6개월", value: 6 },
    { label: "최근 1년", value: 12 },
  ];
  const card = (label: string, value: string | number, sub?: string, accent?: string) => (
    <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: accent ?? C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
  const fmtMonth = (month: string) => {
    const [, mm] = month.split("-");
    return `${parseInt(mm, 10)}월`;
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: "20px", fontWeight: 800, color: C.text }}>문의 통계</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {periods.map((period) => (
            <button
              key={String(period.value)}
              onClick={() => onChangePeriodMonths(period.value)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                borderRadius: 20,
                border: `1px solid ${periodMonths === period.value ? C.primary : C.border}`,
                background: periodMonths === period.value ? C.primary : C.white,
                color: periodMonths === period.value ? "#fff" : C.text,
                cursor: "pointer",
                fontWeight: periodMonths === period.value ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {period.label}
            </button>
          ))}
          <button onClick={onRefresh} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 20, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", color: C.muted }}>
            🔄
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {card("전체 문의", kpi.total, "누적 접수 건수")}
        {card("이번 달 문의", kpi.thisMonth, "이번 달 접수", C.primary)}
        {card("미처리 문의", kpi.unhandled, "접수 상태 대기 중", "#D97706")}
        {card("처리율", `${kpi.processingRate}%`, "연락완료 + 종료 기준", "#059669")}
      </div>

      <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>월별 문의 건수</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(label) => `${label}`} formatter={(value: number, name: string) => [`${value}건`, name === "trial" ? "체험예약" : name === "introduction" ? "도입상담" : "교육문의"]} />
            <Legend formatter={(value) => (value === "trial" ? "체험예약" : value === "introduction" ? "도입상담" : "교육문의")} />
            <Bar dataKey="trial" stackId="a" fill="#6B0F1A" radius={[0, 0, 0, 0]} />
            <Bar dataKey="introduction" stackId="a" fill="#C9A96E" />
            <Bar dataKey="education" stackId="a" fill="#4B5563" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>유형별 비율</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                  {byType.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}건`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {byType.map((item: any) => (
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

        <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>상태별 처리현황</div>
          {byStatus.map((item: any) => {
            const pct = kpi.total > 0 ? Math.round((item.value / kpi.total) * 100) : 0;
            return (
              <div key={item.name} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontSize: 13, color: C.text }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {item.value}건 <span style={{ color: C.muted, fontWeight: 400 }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.muted }}>전체 처리율</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{kpi.processingRate}%</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>고객 전환 퍼널</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>동일 고객(phone/email 기준)의 단계별 전환 추적</div>
          {funnel.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32 }}>데이터 없음</div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {funnel.map((item: { stage: string; value: number; uniqueCustomers: number; fill: string }, index: number) => {
                const maxValue = funnel[0]?.uniqueCustomers || funnel[0]?.value || 1;
                const uniqueValue = item.uniqueCustomers ?? item.value;
                const pct = Math.round((uniqueValue / maxValue) * 100);
                let realConvRate: number | null = null;
                if (conversionStats) {
                  if (index === 1) realConvRate = conversionStats.trialToIntroRate;
                  else if (index === 2) realConvRate = conversionStats.introToEduRate;
                }
                return (
                  <div key={item.stage} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.fill }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.stage}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {realConvRate !== null && (
                          <span style={{ fontSize: 11, color: realConvRate >= 30 ? "#059669" : realConvRate >= 10 ? "#D97706" : C.muted, background: realConvRate >= 30 ? "#ECFDF5" : realConvRate >= 10 ? "#FFFBEB" : "#F3F4F6", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                            전환 {realConvRate}%
                          </span>
                        )}
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.value}건</div>
                          {item.uniqueCustomers !== undefined && item.uniqueCustomers !== item.value && (
                            <div style={{ fontSize: 11, color: C.muted }}>고객 {item.uniqueCustomers}명</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 28, background: C.border, borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: item.fill, borderRadius: 6, transition: "width 0.6s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                        {pct > 15 && <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{pct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {conversionStats && (
                <div style={{ marginTop: 16, padding: "12px 14px", background: "#F9F8F7", borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>전환 요약</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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

        <div style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>지역별 문의 분포</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>상위 15개 지역</div>
          {byRegion.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 32 }}>데이터 없음</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRegion} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(value: number) => [`${value}건`, "지역"]} />
                <Bar dataKey="value" fill={C.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export function SalesCharts({ salesData }: { salesData: any[] }) {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="periodKey" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => (value / 10000).toFixed(0) + "만"} />
            <Tooltip formatter={(value: number) => krw(value)} />
            <Area type="monotone" dataKey="revenue" stroke={C.primary} fill={C.primary} fillOpacity={0.15} name="매출" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>주문 건수</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={salesData}>
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
        <Table headers={["기간", "주문 건수", "매출"]} rows={salesData.map((row: any) => [row.periodKey, row.orderCount + "건", krw(row.revenue)])} />
      </div>
    </div>
  );
}

export function CustomerCharts({
  byMemberRole,
  byDayOfWeek,
  byHour,
}: {
  byMemberRole: any[];
  byDayOfWeek: any[];
  byHour: any[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>회원 등급별 분석</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={byMemberRole.map((row: any) => ({ name: row.role === "professional" ? "전문가" : "일반", value: row.count }))} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
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
          <BarChart data={byDayOfWeek.map((row: any) => ({ day: DOW_LABELS[row.dow] ?? row.dow, count: row.count }))}>
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
          <BarChart data={byHour.map((row: any) => ({ hour: row.hour + "시", count: row.count }))}>
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
  );
}

export function TrafficCharts({
  total,
  byDevice,
  aggregatedByDay,
  topPages,
}: {
  total: number;
  byDevice: any[];
  aggregatedByDay: any[];
  topPages: any[];
}) {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
          <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>총 방문자</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: C.text }}>{total}</div>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
          <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>PC 방문</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: C.text }}>{byDevice.find((row: any) => row.device === "pc")?.count ?? 0}</div>
        </div>
        <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
          <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>모바일 방문</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: C.text }}>{byDevice.find((row: any) => row.device === "mobile")?.count ?? 0}</div>
        </div>
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
          rows={topPages.map((row: any, index: number) => [
            <span style={{ fontWeight: 700, color: index < 3 ? C.primary : C.text }}>#{index + 1}</span>,
            <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{row.path}</span>,
            row.count,
          ])}
        />
      </div>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>사이트 체류시간</div>
        <p style={{ color: C.muted, fontSize: "13px" }}>체류시간 데이터가 쌓이면 표시됩니다. (페이지뷰 트래킹 스크립트 연동 필요)</p>
      </div>
    </div>
  );
}
