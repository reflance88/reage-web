/**
 * 문의 접수 알림 이메일 발송
 * 새 문의가 접수되면 관리자(reflance88@gmail.com)에게 자동 발송
 */
import { sendMail } from "./_core/mailer";

const ADMIN_EMAIL = "reflance88@gmail.com";

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  trial: "체험 예약",
  introduction: "도입 상담",
  education: "교육 문의",
};

const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  contacted: "연락완료",
  closed: "종료",
};

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

/**
 * 문의 접수 알림 이메일 발송 (관리자용)
 */
export async function sendInquiryNotification(
  data: InquiryNotificationData
): Promise<boolean> {
  const typeLabel = INQUIRY_TYPE_LABEL[data.inquiry_type] ?? data.inquiry_type;
  const receivedAt = data.created_at
    ? new Date(data.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const subject = `[REAGE] 새 문의 접수 — ${typeLabel} | ${data.name}`;

  // 선택 항목 행 생성 헬퍼
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

          <!-- 헤더 -->
          <tr>
            <td style="background:#1A1412;padding:28px 40px;text-align:center;">
              <div style="font-size:26px;font-weight:800;letter-spacing:.12em;color:#ffffff;">
                RE<span style="color:#C9A96E;">A</span>GE
              </div>
              <div style="font-size:11px;color:#9B8B7A;letter-spacing:.2em;margin-top:4px;">올핸드 미세전류 테라피</div>
            </td>
          </tr>

          <!-- 알림 배너 -->
          <tr>
            <td style="background:#6B0F1A;padding:14px 40px;text-align:center;">
              <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:.04em;">
                📬 새로운 문의가 접수되었습니다
              </span>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <!-- 유형 뱃지 -->
              <div style="margin-bottom:20px;">
                <span style="display:inline-block;background:#FEF3C7;color:#B45309;font-size:12px;font-weight:700;padding:4px 14px;border-radius:999px;letter-spacing:.04em;">
                  ${typeLabel}
                </span>
                <span style="font-size:12px;color:#9B9B9B;margin-left:10px;">접수 번호 #${data.id}</span>
              </div>

              <!-- 문의 정보 테이블 -->
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
                  ? `<!-- 문의 내용 -->
              <div style="background:#F7F5F2;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #E8E6E3;">
                <div style="font-size:12px;font-weight:700;color:#6B6B6B;letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px;">문의 내용</div>
                <p style="font-size:13.5px;color:#1A1412;line-height:1.75;margin:0;">${data.message.replace(/\n/g, "<br>")}</p>
              </div>`
                  : ""
              }

              <!-- CTA 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="https://reageweb-aerfeijb.manus.space/admin"
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

          <!-- 푸터 -->
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

관리자 페이지: https://reageweb-aerfeijb.manus.space/admin
  `.trim();

  return sendMail({
    to: ADMIN_EMAIL,
    subject,
    html,
    text,
  });
}
