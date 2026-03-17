import { HttpError } from "./http.ts";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

function getTossSecretKey() {
  const value = Deno.env.get("TOSS_SECRET_KEY");
  if (!value) {
    throw new HttpError(500, "TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  }
  return value;
}

function getBasicAuthHeader() {
  const credentials = btoa(`${getTossSecretKey()}:`);
  return `Basic ${credentials}`;
}

export async function confirmTossPayment(paymentKey: string, orderId: string, amount: number) {
  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string; method?: string; totalAmount?: number };
  if (!response.ok) {
    throw new HttpError(400, payload.message ?? "토스페이먼츠 결제 승인 실패");
  }

  return payload;
}

export async function cancelTossPayment(paymentKey: string, cancelReason: string) {
  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelReason }),
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new HttpError(400, payload.message ?? "토스페이먼츠 결제 취소 실패");
  }

  return payload;
}
