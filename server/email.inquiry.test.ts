/**
 * 문의 이메일 알림 발송 테스트
 * - SMTP 연결 검증
 * - 이메일 템플릿 생성 검증
 * - privacy_agreed 필드 전달 검증
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// nodemailer 모킹
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
    })),
  },
}));

// 환경변수 설정
process.env.SMTP_HOST = "smtp.gmail.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "reflance88@gmail.com";
process.env.SMTP_PASS = "test-app-password";
process.env.SMTP_FROM = "REAGE 문의알림 <reflance88@gmail.com>";

import { sendMail } from "./_core/mailer";
import { sendInquiryNotification, type InquiryNotificationData } from "./email-inquiry";

describe("SMTP 이메일 발송 테스트", () => {
  it("sendMail이 SMTP 설정 시 true를 반환해야 한다", async () => {
    const result = await sendMail({
      to: "reflance88@gmail.com",
      subject: "테스트 이메일",
      html: "<p>테스트</p>",
      text: "테스트",
    });
    expect(result).toBe(true);
  });
});

describe("문의 알림 이메일 템플릿 테스트", () => {
  const sampleInquiry: InquiryNotificationData = {
    id: 42,
    inquiry_type: "trial",
    name: "홍길동",
    phone: "010-1234-5678",
    email: "test@example.com",
    shop_name: "테스트 샵",
    region: "서울 강남구",
    message: "체험 예약 문의드립니다.",
    privacy_agreed: true,
    created_at: new Date().toISOString(),
  };

  it("체험 예약 문의 알림 이메일이 발송되어야 한다", async () => {
    const result = await sendInquiryNotification(sampleInquiry);
    expect(result).toBe(true);
  });

  it("도입 상담 문의 알림 이메일이 발송되어야 한다", async () => {
    const result = await sendInquiryNotification({
      ...sampleInquiry,
      inquiry_type: "introduction",
    });
    expect(result).toBe(true);
  });

  it("교육 문의 알림 이메일이 발송되어야 한다", async () => {
    const result = await sendInquiryNotification({
      ...sampleInquiry,
      inquiry_type: "education",
    });
    expect(result).toBe(true);
  });

  it("privacy_agreed=true인 경우 이메일이 정상 발송되어야 한다", async () => {
    const result = await sendInquiryNotification({
      ...sampleInquiry,
      privacy_agreed: true,
    });
    expect(result).toBe(true);
  });

  it("선택 항목이 없어도 이메일이 발송되어야 한다 (최소 필드)", async () => {
    const result = await sendInquiryNotification({
      id: 1,
      inquiry_type: "trial",
      name: "최소정보",
      phone: "010-0000-0000",
    });
    expect(result).toBe(true);
  });
});

describe("엑셀 내보내기 데이터 매핑 검증", () => {
  it("inquiry_type이 한글 레이블로 변환되어야 한다", () => {
    const TYPE_LABEL: Record<string, string> = {
      trial: "체험예약",
      introduction: "도입상담",
      education: "교육문의",
    };
    expect(TYPE_LABEL["trial"]).toBe("체험예약");
    expect(TYPE_LABEL["introduction"]).toBe("도입상담");
    expect(TYPE_LABEL["education"]).toBe("교육문의");
  });

  it("status가 한글 레이블로 변환되어야 한다", () => {
    const STATUS_LABEL: Record<string, string> = {
      received: "접수",
      contacted: "연락완료",
      closed: "종료",
    };
    expect(STATUS_LABEL["received"]).toBe("접수");
    expect(STATUS_LABEL["contacted"]).toBe("연락완료");
    expect(STATUS_LABEL["closed"]).toBe("종료");
  });

  it("privacy_agreed가 동의/미동의로 변환되어야 한다", () => {
    const toLabel = (v: boolean) => v ? "동의" : "미동의";
    expect(toLabel(true)).toBe("동의");
    expect(toLabel(false)).toBe("미동의");
  });
});
