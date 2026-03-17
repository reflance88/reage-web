import { HttpError } from "./http.ts";

const ALIGO_BASE_URL = "https://kakaoapi.aligo.in";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://reageweb-aerfeijb.manus.space";

type AlimtalkButton = {
  name: string;
  linkType: "WL";
  linkTypeName: "웹링크";
  linkMo: string;
  linkPc?: string;
};

type SendAlimtalkParams = {
  templateCode: string;
  receiverPhone: string;
  receiverName: string;
  message: string;
  buttons?: AlimtalkButton[];
  failover?: boolean;
};

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

function orderDetailUrl() {
  return `${SITE_URL}/mypage`;
}

export async function sendAlimtalk(params: SendAlimtalkParams) {
  const formData = new URLSearchParams();
  formData.append("apikey", requireEnv("ALIGO_API_KEY"));
  formData.append("userid", requireEnv("ALIGO_USER_ID"));
  formData.append("senderkey", requireEnv("ALIGO_KAKAO_SENDER_KEY"));
  formData.append("tpl_code", params.templateCode);
  formData.append("sender", requireEnv("ALIGO_SENDER"));
  formData.append("receiver_1", params.receiverPhone);
  formData.append("recvname_1", params.receiverName);
  formData.append("subject_1", params.templateCode);
  formData.append("message_1", params.message);

  if (params.buttons && params.buttons.length > 0) {
    formData.append("button_1", JSON.stringify({ button: params.buttons }));
  }

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

  const result = (await response.json().catch(() => ({}))) as { code?: number; message?: string };
  if (!response.ok || result.code !== 0) {
    throw new HttpError(502, result.message ?? "알림톡 발송에 실패했습니다.");
  }
}

export async function sendAdminSms(message: string) {
  const adminPhone = requireEnv("ADMIN_PHONE");
  const formData = new URLSearchParams();
  formData.append("key", requireEnv("ALIGO_API_KEY"));
  formData.append("user_id", requireEnv("ALIGO_USER_ID"));
  formData.append("sender", requireEnv("ALIGO_SENDER"));
  formData.append("receiver", adminPhone);
  formData.append("msg", message);
  formData.append("msg_type", "LMS");

  const response = await fetch("https://apis.aligo.in/send/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const result = (await response.json().catch(() => ({}))) as { result_code?: string; message?: string };
  if (!response.ok || result.result_code !== "1") {
    throw new HttpError(502, result.message ?? "관리자 SMS 발송에 실패했습니다.");
  }
}

export function buildOrderCompleteMessage(params: {
  name: string;
  orderNumber: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
}) {
  return (
    `${params.name}님, 주문이 완료되었어요.\n\n` +
    `- 주문일 : ${params.orderDate}\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 주문금액 : ${params.totalAmount.toLocaleString()}원\n\n` +
    `영업일 기준 1~2일 내 배송이 시작됩니다.\n` +
    `문의: 010-9679-9498`
  );
}

export function buildOrderCancelledMessage(params: {
  name: string;
  orderNumber: string;
  productName: string;
}) {
  return (
    `${params.name}님, 주문이 취소 완료되었어요.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n\n` +
    `환불은 결제 수단에 따라 영업일 기준 3~5일 소요될 수 있습니다.\n` +
    `문의: 010-9679-9498`
  );
}

export function buildShippingStartedMessage(params: {
  name: string;
  orderNumber: string;
  productName: string;
  courierName: string;
  trackingNumber: string;
}) {
  return (
    `${params.name}님, 주문하신 상품이 배송 중이에요.\n\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 택배사 : ${params.courierName}\n` +
    `- 송장번호 : ${params.trackingNumber}\n\n` +
    `택배사 홈페이지에서 배송 현황을 확인하실 수 있습니다.`
  );
}

export function buildBankTransferConfirmMessage(params: {
  name: string;
  orderNumber: string;
  productName: string;
  totalAmount: number;
}) {
  return (
    `${params.name}님, 입금이 확인되었습니다.\n\n` +
    `- 주문번호 : ${params.orderNumber}\n` +
    `- 상품명 : ${params.productName}\n` +
    `- 결제금액 : ${params.totalAmount.toLocaleString()}원\n\n` +
    `빠르게 배송 준비를 시작하겠습니다. 감사합니다.\n` +
    `문의: 010-9679-9498`
  );
}

export function orderButtons(label = "주문 확인"): AlimtalkButton[] {
  return [
    {
      name: label,
      linkType: "WL",
      linkTypeName: "웹링크",
      linkMo: orderDetailUrl(),
      linkPc: orderDetailUrl(),
    },
  ];
}
