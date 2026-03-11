/**
 * 카카오 알림톡 발송 헬퍼 (알리고 API 기반)
 *
 * 필요 환경변수:
 *   ALIGO_API_KEY          - 알리고 API 키
 *   ALIGO_USER_ID          - 알리고 사용자 ID
 *   ALIGO_KAKAO_SENDER_KEY - 알리고 카카오 발신 프로필 키 (채널 연동 후 발급)
 *   ALIGO_SENDER           - 발신번호
 *   ADMIN_PHONE            - 관리자 수신 전화번호
 *
 * 알림톡 심사 완료 전에는 발송이 되지 않습니다.
 * 환경변수 미설정 시 콘솔 경고만 출력하고 에러를 던지지 않습니다.
 */

const ALIGO_BASE_URL = "https://kakaoapi.aligo.in";

interface AlimtalkButton {
  name: string;
  linkType: "WL"; // Web Link
  linkTypeName: "웹링크";
  linkMo: string; // 모바일 URL
  linkPc?: string; // PC URL (선택)
}

interface SendAlimtalkParams {
  templateCode: string;
  receiverPhone: string;
  receiverName: string;
  message: string;
  buttons?: AlimtalkButton[];
  failover?: boolean; // 알림톡 실패 시 SMS 대체 발송 여부
}

async function sendAlimtalk(params: SendAlimtalkParams): Promise<boolean> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const senderKey = process.env.ALIGO_KAKAO_SENDER_KEY;
  const sender = process.env.ALIGO_SENDER;

  if (!apiKey || !userId || !senderKey || !sender) {
    console.warn(
      "[Kakao Alimtalk] 환경변수 미설정 - 알림톡 발송 건너뜀:",
      params.templateCode,
      "→",
      params.receiverPhone
    );
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("apikey", apiKey);
    formData.append("userid", userId);
    formData.append("senderkey", senderKey);
    formData.append("tpl_code", params.templateCode);
    formData.append("sender", sender);
    formData.append("receiver_1", params.receiverPhone);
    formData.append("recvname_1", params.receiverName);
    formData.append("subject_1", params.templateCode);
    formData.append("message_1", params.message);

    if (params.buttons && params.buttons.length > 0) {
      formData.append("button_1", JSON.stringify({ button: params.buttons }));
    }

    // 알림톡 실패 시 LMS 대체 발송
    if (params.failover !== false) {
      formData.append("failover", "Y");
      formData.append("fsubject_1", "[REAGE] 알림");
      formData.append("fmessage_1", params.message);
    }

    const response = await fetch(`${ALIGO_BASE_URL}/akv10/alimtalk/send/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = (await response.json()) as { code: number; message: string };

    if (result.code !== 0) {
      console.error("[Kakao Alimtalk] 발송 실패:", result.message, params.templateCode);
      return false;
    }

    console.log("[Kakao Alimtalk] 발송 성공:", params.templateCode, "→", params.receiverPhone);
    return true;
  } catch (err) {
    console.error("[Kakao Alimtalk] 발송 오류:", err);
    return false;
  }
}

// ─── 사이트 기본 URL ────────────────────────────────────────────────────────
const SITE_URL = "https://reageweb-aerfeijb.manus.space";

function orderDetailUrl(orderId: number): string {
  return `${SITE_URL}/mypage`;
}

// ─── 템플릿 1: 신규 주문 (결제 완료) ─────────────────────────────────────────
export async function sendOrderCompleteAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 주문이 완료되었어요.\n\n` +
    `- 주문일 : ${params.orderDate}\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 주문금액 : ${params.totalAmount.toLocaleString()}원\n\n` +
    `영업일 기준 1~2일 내 배송이 시작됩니다.\n` +
    `문의: 010-9679-9498`;

  return sendAlimtalk({
    templateCode: "ORDER_COMPLETE",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "주문 확인",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 2: 입금 안내 (무통장 입금) ───────────────────────────────────────
export async function sendBankTransferGuideAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
  totalAmount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 입금 안내 드려요.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 입금은행 : ${params.bankName}\n` +
    `- 입금계좌 : ${params.accountNumber}\n` +
    `- 예금주 : ${params.accountHolder}\n` +
    `- 금액 : ${params.totalAmount.toLocaleString()}원\n\n` +
    `입금 확인 후 배송이 시작됩니다.`;

  return sendAlimtalk({
    templateCode: "BANK_TRANSFER_GUIDE",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "주문 확인",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 3: 배송 안내 (배송 준비 완료) ────────────────────────────────────
export async function sendShippingReadyAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 주문하신 상품을 발송했어요.\n\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 주문번호 : ${params.orderNumber}\n\n` +
    `배송 시작 시 송장번호를 별도 안내해 드립니다.\n` +
    `문의: 010-9679-9498`;

  return sendAlimtalk({
    templateCode: "SHIPPING_READY",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "주문 확인",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 4: 배송 시작 (운송장 등록) ───────────────────────────────────────
export async function sendShippingStartedAlimtalk(params: {
  phone: string;
  name: string;
  orderNumber: string;
  productName: string;
  courierName: string;
  trackingNumber: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 주문하신 상품이 배송 중이에요.\n\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 택배사 : ${params.courierName}\n` +
    `- 송장번호 : ${params.trackingNumber}\n\n` +
    `택배사 홈페이지에서 배송 현황을 확인하실 수 있습니다.`;

  return sendAlimtalk({
    templateCode: "SHIPPING_STARTED",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
  });
}

// ─── 템플릿 5: 배송 완료 ─────────────────────────────────────────────────────
export async function sendDeliveryCompleteAlimtalk(params: {
  phone: string;
  name: string;
  productName: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 상품 배송이 완료되었어요.\n\n` +
    `- 상품명 : ${params.productName}\n\n` +
    `REAGE를 이용해 주셔서 감사합니다.`;

  return sendAlimtalk({
    templateCode: "DELIVERY_COMPLETE",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "쇼핑몰 바로 가기",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: SITE_URL,
        linkPc: SITE_URL,
      },
    ],
  });
}

// ─── 템플릿 6: 취소/반품/교환 완료 ──────────────────────────────────────────
export async function sendOrderCancelledAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 주문이 취소 완료되었어요.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n\n` +
    `환불은 결제 수단에 따라 영업일 기준 3~5일 소요될 수 있습니다.\n` +
    `문의: 010-9679-9498`;

  return sendAlimtalk({
    templateCode: "ORDER_CANCELLED",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "자세히 보기",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 7: 환불 완료 ─────────────────────────────────────────────────────
export async function sendRefundCompleteAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
  processDate: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, ${params.productName} 상품이 환불 처리되었어요.\n\n` +
    `- 처리일 : ${params.processDate}\n` +
    `- 처리번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n\n` +
    `추가 문의사항은 아래로 연락 주세요.\n` +
    `문의: 010-9679-9498`;

  return sendAlimtalk({
    templateCode: "REFUND_COMPLETE",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "자세히 보기",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 8: 입금 확인 안내 ──────────────────────────────────────────────
export async function sendBankTransferConfirmAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
  totalAmount: number;
}): Promise<boolean> {
  const message =
    `${params.name}님, 입금이 확인되었습니다.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 결제금액 : ${params.totalAmount.toLocaleString()}원\n\n` +
    `빠르게 배송 준비를 시작하겠습니다. 감사합니다.\n` +
    `문의: 010-9679-9498`;

  return sendAlimtalk({
    templateCode: "BANK_TRANSFER_CONFIRM",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "주문 확인",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 템플릿 9: 입금 전 취소 ──────────────────────────────────────────────────
export async function sendCancelBeforePaymentAlimtalk(params: {
  phone: string;
  name: string;
  orderId: number;
  orderNumber: string;
  productName: string;
}): Promise<boolean> {
  const message =
    `${params.name}님, 주문이 입금전 취소되었어요.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n\n` +
    `다시 주문하시려면 아래 버튼을 눌러주세요.`;

  return sendAlimtalk({
    templateCode: "CANCEL_BEFORE_PAYMENT",
    receiverPhone: params.phone,
    receiverName: params.name,
    message,
    buttons: [
      {
        name: "자세히 보기",
        linkType: "WL",
        linkTypeName: "웹링크",
        linkMo: orderDetailUrl(params.orderId),
        linkPc: orderDetailUrl(params.orderId),
      },
    ],
  });
}

// ─── 관리자 신규 주문 알림 (SMS 대체) ────────────────────────────────────────
export async function sendAdminNewOrderAlimtalk(params: {
  orderNumber: string;
  productName: string;
  totalAmount: number;
  recipientName: string;
}): Promise<boolean> {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) {
    console.warn("[Kakao Alimtalk] ADMIN_PHONE 미설정 - 관리자 알림 건너뜀");
    return false;
  }

  // 관리자 알림은 알림톡 채널이 없으므로 일반 SMS로 발송
  // (알리고 SMS API 사용)
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  if (!apiKey || !userId || !sender) {
    console.warn("[Admin SMS] 환경변수 미설정 - 관리자 알림 건너뜀");
    return false;
  }

  try {
    const message =
      `[REAGE] 신규 주문 알림\n` +
      `주문번호: ${params.orderNumber}\n` +
      `상품명: ${params.productName}\n` +
      `결제금액: ${params.totalAmount.toLocaleString()}원\n` +
      `수령인: ${params.recipientName}\n` +
      `관리자 페이지에서 확인해 주세요.`;

    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("user_id", userId);
    formData.append("sender", sender);
    formData.append("receiver", adminPhone);
    formData.append("msg", message);
    formData.append("msg_type", "LMS");

    const response = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = (await response.json()) as { result_code: string; message: string };
    if (result.result_code !== "1") {
      console.error("[Admin SMS] 발송 실패:", result.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Admin SMS] 발송 오류:", err);
    return false;
  }
}
