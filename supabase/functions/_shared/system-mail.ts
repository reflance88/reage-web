export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface InquiryNotificationData {
  id: number | string;
  inquiry_type: string;
  name: string;
  phone: string;
  email?: string | null;
  shop_name?: string | null;
  region?: string | null;
  preferred_date?: string | null;
  education_program?: string | null;
  message?: string | null;
  privacy_agreed?: boolean;
  created_at?: string;
}

export interface BusinessVerificationNotificationInput {
  userEmail: string;
  userName?: string | null;
  businessName: string;
  businessNumber: string;
  contactPhone?: string | null;
  fileUrl?: string | null;
}

const DEFAULT_INQUIRY_ADMIN_EMAIL = "reflance88@gmail.com";
const DEFAULT_APP_BASE_URL = "https://reage-web.vercel.app";

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  trial: "체험 예약",
  introduction: "도입 상담",
  education: "교육 문의",
};

function formatSeoulDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function normalizeEmailRecipient(value?: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/<([^>]+)>/);
  return match?.[1]?.trim() || trimmed;
}

function resolveAdminEmailRecipient(override?: string | null) {
  return normalizeEmailRecipient(override) ?? DEFAULT_INQUIRY_ADMIN_EMAIL;
}

function resolveAdminPortalUrl() {
  const baseUrl = (Deno.env.get("APP_BASE_URL") ?? DEFAULT_APP_BASE_URL).replace(/\/$/, "");
  return `${baseUrl}/admin`;
}

export function buildInquiryNotificationMail(
  data: InquiryNotificationData,
  options: { adminEmail?: string | null } = {},
): MailMessage {
  const typeLabel = INQUIRY_TYPE_LABEL[data.inquiry_type] ?? data.inquiry_type;
  const receivedAt = formatSeoulDateTime(data.created_at);
  const to = resolveAdminEmailRecipient(options.adminEmail);
  const subject = `[REAGE] 새 문의 접수 — ${typeLabel} | ${data.name}`;

  const optRow = (label: string, value: string | null | undefined) =>
    value
      ? `<tr><td style="padding:8px 16px;font-size:13px;color:#6B6B6B;white-space:nowrap;border-bottom:1px solid #F0EDE9;">${label}</td><td style="padding:8px 16px;font-size:13px;color:#1A1412;border-bottom:1px solid #F0EDE9;">${value}</td></tr>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>문의 접수 알림</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(26,20,18,.10);border:1px solid #E8E6E3;">
          <tr>
            <td style="background:#1A1412;padding:28px 40px;text-align:center;">
              <div style="font-size:26px;font-weight:800;letter-spacing:.12em;color:#ffffff;">
                RE<span style="color:#C9A96E;">A</span>GE
              </div>
              <div style="font-size:11px;color:#9B8B7A;letter-spacing:.2em;margin-top:4px;">올핸드 미세전류 테라피</div>
            </td>
          </tr>
          <tr>
            <td style="background:#6B0F1A;padding:14px 40px;text-align:center;">
              <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:.04em;">
                📬 새로운 문의가 접수되었습니다
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <div style="margin-bottom:20px;">
                <span style="display:inline-block;background:#FEF3C7;color:#B45309;font-size:12px;font-weight:700;padding:4px 14px;border-radius:999px;letter-spacing:.04em;">
                  ${typeLabel}
                </span>
                <span style="font-size:12px;color:#9B9B9B;margin-left:10px;">접수 번호 #${data.id}</span>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E6E3;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <tr style="background:#F7F5F2;">
                  <td colspan="2" style="padding:10px 16px;font-size:12px;font-weight:700;color:#6B6B6B;letter-spacing:.06em;text-transform:uppercase;">문의 정보</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6B6B6B;white-space:nowrap;border-bottom:1px solid #F0EDE9;width:100px;">이름</td>
                  <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#1A1412;border-bottom:1px solid #F0EDE9;">${data.name}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6B6B6B;white-space:nowrap;border-bottom:1px solid #F0EDE9;">연락처</td>
                  <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#6B0F1A;border-bottom:1px solid #F0EDE9;">${data.phone}</td>
                </tr>
                ${optRow("이메일", data.email)}
                ${optRow("상호명", data.shop_name)}
                ${optRow("지역", data.region)}
                ${optRow("선호 날짜", data.preferred_date)}
                ${optRow("교육 프로그램", data.education_program)}
                <tr>
                  <td style="padding:10px 16px;font-size:13px;color:#6B6B6B;white-space:nowrap;">접수 시각</td>
                  <td style="padding:10px 16px;font-size:13px;color:#1A1412;">${receivedAt}</td>
                </tr>
              </table>
              ${
                data.message
                  ? `<div style="background:#F7F5F2;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #E8E6E3;">
                <div style="font-size:12px;font-weight:700;color:#6B6B6B;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;">문의 내용</div>
                <p style="font-size:13.5px;color:#1A1412;line-height:1.75;margin:0;">${data.message.replace(/\n/g, "<br>")}</p>
              </div>`
                  : ""
              }
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${resolveAdminPortalUrl()}"
                       style="display:inline-block;background:#6B0F1A;color:#ffffff;text-decoration:none;
                              font-size:14px;font-weight:700;padding:13px 36px;border-radius:10px;
                              letter-spacing:.02em;">
                      관리자 페이지에서 확인하기 →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F7F5F2;padding:18px 40px;border-top:1px solid #E8E6E3;">
              <p style="font-size:11.5px;color:#9B9B9B;margin:0;text-align:center;line-height:1.6;">
                본 이메일은 REAGE 웹사이트 문의 접수 시 자동 발송됩니다.<br>
                © REAGE. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
[REAGE] 새 문의 접수 알림

문의 유형: ${typeLabel}
접수 번호: #${data.id}

이름: ${data.name}
연락처: ${data.phone}
${data.email ? `이메일: ${data.email}\n` : ""}${data.shop_name ? `상호명: ${data.shop_name}\n` : ""}${data.region ? `지역: ${data.region}\n` : ""}${data.preferred_date ? `선호 날짜: ${data.preferred_date}\n` : ""}${data.message ? `\n문의 내용:\n${data.message}\n` : ""}
접수 시각: ${receivedAt}

관리자 페이지: ${resolveAdminPortalUrl()}
  `.trim();

  return { to, subject, html, text };
}

export function buildBusinessVerificationApplicantMail(
  input: BusinessVerificationNotificationInput,
): MailMessage {
  const customerName = input.userName?.trim() || "고객";

  return {
    to: input.userEmail,
    subject: "[REAGE] 사업자 인증 신청이 접수되었습니다",
    html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>사업자 인증 신청</title></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Noto Sans KR',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(26,20,18,.10);border:1px solid #E8E6E3;">
        <tr><td style="background:#1A1412;padding:32px 40px;text-align:center;">
          <div style="font-size:28px;font-weight:800;letter-spacing:.12em;color:#ffffff;">RE<span style="color:#C9A96E;">A</span>GE</div>
          <div style="font-size:11px;color:#9B8B7A;letter-spacing:.2em;margin-top:4px;">올핸드 미세전류 테라피</div>
        </td></tr>
        <tr><td style="padding:40px 40px 32px;">
          <h1 style="font-size:20px;font-weight:700;color:#1A1412;margin:0 0 12px;">사업자 인증 신청 접수 완료</h1>
          <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 20px;">안녕하세요, <strong>${customerName}</strong>님.<br>사업자 인증 신청이 정상적으로 접수되었습니다.<br>접수 후 <strong>1영업일 이내</strong> 검토 후 결과를 안내해 드리겠습니다.</p>
          <div style="background:#F5EFE4;border:1px solid #C9A96E30;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
            <p style="font-size:13px;color:#8B6914;margin:0;"><strong>사업자명:</strong> ${input.businessName}<br><strong>사업자등록번호:</strong> ${input.businessNumber}</p>
          </div>
          <p style="font-size:12px;color:#9B9B9B;line-height:1.6;margin:0;">승인 완료 시 전문가 할인가가 자동 적용됩니다.</p>
        </td></tr>
        <tr><td style="background:#F7F5F2;padding:20px 40px;border-top:1px solid #E8E6E3;">
          <p style="font-size:11.5px;color:#9B9B9B;margin:0;text-align:center;">이 이메일은 발신 전용입니다. &copy; REAGE. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    text: `[REAGE] 사업자 인증 신청

안녕하세요, ${customerName}님.
사업자 인증 신청이 접수되었습니다.
사업자명: ${input.businessName}
사업자등록번호: ${input.businessNumber}
승인 완료 시 전문가 할인가가 적용됩니다.`,
  };
}

export function buildBusinessVerificationAdminMail(
  input: BusinessVerificationNotificationInput,
  options: { adminEmail?: string | null } = {},
): MailMessage | null {
  const to = resolveAdminEmailRecipient(options.adminEmail);
  if (!to || to === input.userEmail) {
    return null;
  }

  const applicantName = input.userName?.trim() || "고객";
  const contactRows = [
    `사업자명: ${input.businessName}`,
    `사업자등록번호: ${input.businessNumber}`,
    `신청자: ${applicantName} (${input.userEmail})`,
    input.contactPhone ? `연락처: ${input.contactPhone}` : null,
    input.fileUrl ? `첨부 서류: ${input.fileUrl}` : null,
  ].filter(Boolean);

  return {
    to,
    subject: `[REAGE 관리자] 사업자 인증 신청: ${input.businessName}`,
    html: `<p>${contactRows.join("<br>")}</p>`,
    text: contactRows.join("\n"),
  };
}
