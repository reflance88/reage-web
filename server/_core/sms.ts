/**
 * 알리고(Aligo) SMS API 헬퍼
 * https://smartsms.aligo.in/admin/api/spec.html
 *
 * 필요 환경변수:
 *   ALIGO_API_KEY    - 알리고 인증 API Key
 *   ALIGO_USER_ID    - 알리고 사용자 ID
 *   ALIGO_SENDER     - 발신번호 (알리고에 등록된 번호)
 */

const ALIGO_API_URL = "https://apis.aligo.in/send/";

interface SendSmsOptions {
  /** 수신자 전화번호 (콤마로 복수 가능, 최대 1000명) */
  receiver: string;
  /** 문자 내용 */
  msg: string;
  /** 문자 제목 (LMS/MMS 전용, 선택) */
  title?: string;
  /** SMS | LMS | MMS (미지정 시 90byte 초과 자동 LMS 전환) */
  msgType?: "SMS" | "LMS" | "MMS";
  /** 테스트 모드 (Y: 실제 발송 없이 API 연동 테스트) */
  testMode?: boolean;
}

interface AligoResponse {
  result_code: number;
  message: string;
  msg_id?: number;
  success_cnt?: number;
  error_cnt?: number;
  msg_type?: string;
}

/**
 * 알리고 SMS 발송
 * - 환경변수 미설정 시 경고 로그만 남기고 false 반환 (서비스 중단 없음)
 * - 발송 실패 시 경고 로그만 남기고 false 반환
 */
export async function sendSms(options: SendSmsOptions): Promise<boolean> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  if (!apiKey || !userId || !sender) {
    console.warn("[SMS] 알리고 환경변수(ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER)가 설정되지 않아 문자 발송을 건너뜁니다.");
    return false;
  }

  const params = new URLSearchParams();
  params.append("key", apiKey);
  params.append("user_id", userId);
  params.append("sender", sender);
  params.append("receiver", options.receiver);
  params.append("msg", options.msg);
  if (options.title) params.append("title", options.title);
  if (options.msgType) params.append("msg_type", options.msgType);
  if (options.testMode) params.append("testmode_yn", "Y");

  try {
    const res = await fetch(ALIGO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: params.toString(),
    });

    const data: AligoResponse = await res.json();

    if (data.result_code < 0) {
      console.warn(`[SMS] 발송 실패 (code: ${data.result_code}): ${data.message}`);
      return false;
    }

    console.log(`[SMS] 발송 성공 - 수신: ${options.receiver}, 성공: ${data.success_cnt ?? 0}건`);
    return true;
  } catch (err) {
    console.warn("[SMS] 발송 중 오류:", err);
    return false;
  }
}

/**
 * 주문 완료 문자 발송 (고객용)
 */
export async function sendOrderConfirmSms(params: {
  recipientPhone: string;
  recipientName: string;
  orderId: string;
  orderName: string;
  totalAmount: number;
}): Promise<boolean> {
  const amount = Number(params.totalAmount).toLocaleString("ko-KR");
  const msg =
    `[REAGE] 주문이 완료되었습니다.\n` +
    `\n` +
    `주문번호: ${params.orderId}\n` +
    `주문상품: ${params.orderName}\n` +
    `결제금액: ${amount}원\n` +
    `\n` +
    `배송 준비가 완료되면 운송장 번호를 안내드립니다.\n` +
    `문의: 마이페이지 > 1:1 문의`;

  return sendSms({
    receiver: params.recipientPhone.replace(/-/g, ""),
    msg,
    msgType: "LMS",
    title: "[REAGE] 주문 완료 안내",
  });
}

/**
 * 신규 주문 알림 문자 발송 (관리자용)
 */
export async function sendNewOrderAlertSms(params: {
  adminPhone: string;
  orderId: string;
  orderName: string;
  totalAmount: number;
  recipientName: string;
}): Promise<boolean> {
  const amount = Number(params.totalAmount).toLocaleString("ko-KR");
  const msg =
    `[REAGE 관리자] 새 주문이 접수되었습니다.\n` +
    `\n` +
    `주문번호: ${params.orderId}\n` +
    `주문상품: ${params.orderName}\n` +
    `결제금액: ${amount}원\n` +
    `수령인: ${params.recipientName}\n` +
    `\n` +
    `관리자 페이지에서 확인해주세요.`;

  return sendSms({
    receiver: params.adminPhone.replace(/-/g, ""),
    msg,
    msgType: "LMS",
    title: "[REAGE] 신규 주문 알림",
  });
}
