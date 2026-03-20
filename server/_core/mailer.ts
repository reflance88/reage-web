/**
 * SMTP 이메일 발송 헬퍼
 *
 * 환경변수 설정 방법:
 *   SMTP_HOST     - SMTP 서버 주소 (예: smtp.gmail.com, smtp.naver.com)
 *   SMTP_PORT     - SMTP 포트 (Gmail: 587, Naver: 587, SSL: 465)
 *   SMTP_SECURE   - SSL 사용 여부 (포트 465이면 true, 나머지는 false)
 *   SMTP_USER     - 발신 이메일 계정 (예: noreply@reage.co.kr)
 *   SMTP_PASS     - 이메일 계정 비밀번호 또는 앱 비밀번호
 *   SMTP_FROM     - 발신자 표시명 (예: "REAGE <noreply@reage.co.kr>")
 *
 * Gmail 사용 시:
 *   - Google 계정 → 보안 → 2단계 인증 활성화 → 앱 비밀번호 생성
 *   - SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false
 *
 * Naver 메일 사용 시:
 *   - 네이버 메일 → 환경설정 → POP3/SMTP 설정 → 사용함
 *   - SMTP_HOST=smtp.naver.com, SMTP_PORT=587, SMTP_SECURE=false
 */
import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * 이메일 발송
 * SMTP 환경변수가 설정되지 않은 경우 콘솔에 출력 (개발 환경 폴백)
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    // SMTP 미설정 시 개발용 콘솔 출력
    console.log("[Mailer] SMTP not configured. Email would be sent to:", options.to);
    console.log("[Mailer] Subject:", options.subject);
    console.log("[Mailer] Content (text):", options.text || "(html only)");
    return false;
  }

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log("[Mailer] Email sent to:", options.to);
    return true;
  } catch (error) {
    console.error("[Mailer] Failed to send email:", error);
    return false;
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "[REAGE] 비밀번호 재설정 안내";

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비밀번호 재설정</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Noto Sans KR',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(26,20,18,.10);border:1px solid #E8E6E3;">
          <!-- 헤더 -->
          <tr>
            <td style="background:#1A1412;padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;letter-spacing:.12em;color:#ffffff;">
                RE<span style="color:#C9A96E;">A</span>GE
              </div>
              <div style="font-size:11px;color:#9B8B7A;letter-spacing:.2em;margin-top:4px;">올핸드 주파 미세전류 테라피</div>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="font-size:20px;font-weight:700;color:#1A1412;margin:0 0 12px;">비밀번호 재설정 요청</h1>
              <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
                안녕하세요.<br>
                REAGE 계정의 비밀번호 재설정 요청이 접수되었습니다.<br>
                아래 버튼을 클릭하여 새로운 비밀번호를 설정해 주세요.
              </p>
              <!-- 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#6B0F1A;color:#ffffff;text-decoration:none;
                              font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;
                              letter-spacing:.02em;">
                      비밀번호 재설정하기
                    </a>
                  </td>
                </tr>
              </table>
              <!-- 안내 -->
              <div style="background:#FEF3F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="font-size:12.5px;color:#991B1B;margin:0;line-height:1.6;">
                  ⚠️ 이 링크는 <strong>1시간</strong> 동안만 유효합니다.<br>
                  본인이 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.<br>
                  계정 보안을 위해 링크를 타인과 공유하지 마세요.
                </p>
              </div>
              <!-- URL 직접 표시 -->
              <p style="font-size:12px;color:#9B9B9B;line-height:1.6;margin:0;">
                버튼이 작동하지 않으면 아래 링크를 브라우저에 직접 붙여넣으세요:<br>
                <a href="${resetUrl}" style="color:#6B0F1A;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background:#F7F5F2;padding:20px 40px;border-top:1px solid #E8E6E3;">
              <p style="font-size:11.5px;color:#9B9B9B;margin:0;text-align:center;line-height:1.6;">
                본 이메일은 발신 전용입니다. 문의사항은 고객센터를 이용해 주세요.<br>
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
[REAGE] 비밀번호 재설정 안내

안녕하세요.
REAGE 계정의 비밀번호 재설정 요청이 접수되었습니다.

아래 링크를 클릭하여 새로운 비밀번호를 설정해 주세요.
이 링크는 1시간 동안만 유효합니다.

${resetUrl}

본인이 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.
  `.trim();

  return sendMail({ to, subject, html, text });
}
