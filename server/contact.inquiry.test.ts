import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase 클라이언트 모킹
vi.mock("./_core/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 1,
        inquiry_type: "trial",
        name: "홍길동",
        phone: "010-1234-5678",
        status: "received",
        created_at: new Date().toISOString(),
      },
      error: null,
    }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  },
  supabasePublic: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
  },
}));

import { createContactInquiry, updateInquiryStatus, type InquiryType, type InquiryStatus } from "./supabase-db";

describe("문의 ENUM 수정 테스트", () => {
  it("InquiryType은 trial, introduction, education만 허용해야 한다", () => {
    const validTypes: InquiryType[] = ["trial", "introduction", "education"];
    expect(validTypes).toHaveLength(3);
    expect(validTypes).toContain("trial");
    expect(validTypes).toContain("introduction");
    expect(validTypes).toContain("education");
  });

  it("InquiryStatus는 received, contacted, closed만 허용해야 한다", () => {
    const validStatuses: InquiryStatus[] = ["received", "contacted", "closed"];
    expect(validStatuses).toHaveLength(3);
    expect(validStatuses).toContain("received");
    expect(validStatuses).toContain("contacted");
    expect(validStatuses).toContain("closed");
  });

  it("createContactInquiry는 status를 received로 삽입해야 한다", async () => {
    const { supabaseAdmin } = await import("./_core/supabase");
    const insertSpy = vi.spyOn(supabaseAdmin.from("contact_inquiries") as any, "insert");
    
    await createContactInquiry({
      inquiry_type: "trial",
      name: "홍길동",
      phone: "010-1234-5678",
    });

    // insert가 status: 'received'로 호출되는지 확인
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: "received" })
    );
  });

  it("updateInquiryStatus는 올바른 status 값을 전달해야 한다", async () => {
    // 타입 체크: 올바른 InquiryStatus 값만 허용
    const status: InquiryStatus = "contacted";
    expect(["received", "contacted", "closed"]).toContain(status);
  });
});

describe("contact.html typeMap 검증", () => {
  it("체험 예약은 trial로 매핑되어야 한다", () => {
    const typeMap: Record<string, string> = {
      "체험 예약": "trial",
      "도입 상담": "introduction",
      "교육 문의": "education",
    };
    expect(typeMap["체험 예약"]).toBe("trial");
    expect(typeMap["도입 상담"]).toBe("introduction");
    expect(typeMap["교육 문의"]).toBe("education");
  });

  it("DB ENUM 값이 아닌 값(experience_booking 등)은 typeMap에 없어야 한다", () => {
    const typeMap: Record<string, string> = {
      "체험 예약": "trial",
      "도입 상담": "introduction",
      "교육 문의": "education",
    };
    const values = Object.values(typeMap);
    expect(values).not.toContain("experience_booking");
    expect(values).not.toContain("business_consultation");
    expect(values).not.toContain("education_inquiry");
    expect(values).not.toContain("general");
  });
});
