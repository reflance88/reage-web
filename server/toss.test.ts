import { describe, expect, it } from "vitest";

describe("TossPayments API Key Validation", () => {
  it("should have TOSS_SECRET_KEY set in environment", () => {
    const key = process.env.TOSS_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    // 테스트 시크릿 키는 test_gsk_ 로 시작해야 함
    expect(key).toMatch(/^test_gsk_/);
  });

  it("should have VITE_TOSS_CLIENT_KEY set in environment", () => {
    const key = process.env.VITE_TOSS_CLIENT_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    // 테스트 클라이언트 키는 test_gck_ 로 시작해야 함
    expect(key).toMatch(/^test_gck_/);
  });

  it("should successfully call TossPayments API with the secret key", async () => {
    const key = process.env.TOSS_SECRET_KEY!;
    const credentials = Buffer.from(`${key}:`).toString("base64");

    // 토스페이먼츠 결제 조회 API로 키 유효성 확인 (존재하지 않는 orderId는 404 반환 - 인증 성공 의미)
    const res = await fetch("https://api.tosspayments.com/v1/payments/orders/test-validation-check", {
      headers: { Authorization: `Basic ${credentials}` },
    });

    // 401 = 인증 실패 (잘못된 키), 404 = 인증 성공 (주문 없음), 둘 다 아니면 예외
    expect(res.status).not.toBe(401);
    expect([404, 200]).toContain(res.status);
  });
});
