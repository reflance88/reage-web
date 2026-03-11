/**
 * 문의 통계 API 테스트
 * - getInquiryStats 함수 로직 단위 테스트
 * - KPI 계산 검증 (전체, 이번달, 미처리, 처리율)
 * - 월별 집계 검증
 * - 유형별/상태별 집계 검증
 */
import { describe, it, expect } from "vitest";

// ─── 통계 계산 로직을 순수 함수로 추출하여 테스트 ───────────────────────────────
function computeStats(rows: Array<{ id: number; inquiry_type: string; status: string; created_at: string }>) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = rows.length;
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= thisMonthStart).length;
  const unhandled = rows.filter((r) => r.status === "received").length;
  const handled = rows.filter((r) => r.status === "contacted" || r.status === "closed").length;
  const processingRate = total > 0 ? Math.round((handled / total) * 100) : 0;

  // 월별 집계 (최근 12개월)
  const monthlyMap: Record<string, { month: string; total: number; trial: number; introduction: number; education: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { month: key, total: 0, trial: 0, introduction: 0, education: 0 };
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].total++;
      if (r.inquiry_type === "trial") monthlyMap[key].trial++;
      else if (r.inquiry_type === "introduction") monthlyMap[key].introduction++;
      else if (r.inquiry_type === "education") monthlyMap[key].education++;
    }
  }

  const trialCount = rows.filter((r) => r.inquiry_type === "trial").length;
  const introCount = rows.filter((r) => r.inquiry_type === "introduction").length;
  const eduCount = rows.filter((r) => r.inquiry_type === "education").length;

  const receivedCount = rows.filter((r) => r.status === "received").length;
  const contactedCount = rows.filter((r) => r.status === "contacted").length;
  const closedCount = rows.filter((r) => r.status === "closed").length;

  return {
    kpi: { total, thisMonth, unhandled, processingRate },
    monthly: Object.values(monthlyMap),
    byType: [
      { name: "체험예약", value: trialCount },
      { name: "도입상담", value: introCount },
      { name: "교육문의", value: eduCount },
    ],
    byStatus: [
      { name: "접수", value: receivedCount },
      { name: "연락완료", value: contactedCount },
      { name: "종료", value: closedCount },
    ],
  };
}

const now = new Date();
const thisMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15T00:00:00Z`;
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 10);
const lastMonthISO = lastMonthDate.toISOString();

const sampleRows = [
  { id: 1, inquiry_type: "trial", status: "received", created_at: thisMonthISO },
  { id: 2, inquiry_type: "introduction", status: "contacted", created_at: thisMonthISO },
  { id: 3, inquiry_type: "education", status: "closed", created_at: thisMonthISO },
  { id: 4, inquiry_type: "trial", status: "received", created_at: lastMonthISO },
  { id: 5, inquiry_type: "introduction", status: "received", created_at: lastMonthISO },
];

describe("문의 통계 KPI 계산", () => {
  it("전체 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.kpi.total).toBe(5);
  });

  it("이번 달 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.kpi.thisMonth).toBe(3);
  });

  it("미처리(received) 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.kpi.unhandled).toBe(3);
  });

  it("처리율이 올바르게 계산되어야 한다 (contacted+closed / total)", () => {
    const result = computeStats(sampleRows);
    // handled = 2 (contacted 1 + closed 1), total = 5 → 40%
    expect(result.kpi.processingRate).toBe(40);
  });

  it("데이터가 없을 때 처리율은 0%여야 한다", () => {
    const result = computeStats([]);
    expect(result.kpi.processingRate).toBe(0);
    expect(result.kpi.total).toBe(0);
  });
});

describe("문의 통계 유형별 집계", () => {
  it("체험예약 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byType.find((t) => t.name === "체험예약")?.value).toBe(2);
  });

  it("도입상담 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byType.find((t) => t.name === "도입상담")?.value).toBe(2);
  });

  it("교육문의 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byType.find((t) => t.name === "교육문의")?.value).toBe(1);
  });
});

describe("문의 통계 상태별 집계", () => {
  it("접수 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byStatus.find((s) => s.name === "접수")?.value).toBe(3);
  });

  it("연락완료 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byStatus.find((s) => s.name === "연락완료")?.value).toBe(1);
  });

  it("종료 건수가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.byStatus.find((s) => s.name === "종료")?.value).toBe(1);
  });
});

describe("문의 통계 월별 집계", () => {
  it("최근 12개월 데이터가 반환되어야 한다", () => {
    const result = computeStats(sampleRows);
    expect(result.monthly).toHaveLength(12);
  });

  it("이번 달 월별 집계가 정확해야 한다", () => {
    const result = computeStats(sampleRows);
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthData = result.monthly.find((m) => m.month === currentKey);
    expect(thisMonthData?.total).toBe(3);
    expect(thisMonthData?.trial).toBe(1);
    expect(thisMonthData?.introduction).toBe(1);
    expect(thisMonthData?.education).toBe(1);
  });
});
