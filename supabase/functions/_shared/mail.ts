import nodemailer from "npm:nodemailer";
import { HttpError } from "./http.ts";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function createTransporter() {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number.parseInt(Deno.env.get("SMTP_PORT") ?? "587", 10);
  const secure = (Deno.env.get("SMTP_SECURE") ?? "false") === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendSmtpMail(message: MailMessage) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new HttpError(503, "SMTP 환경변수가 설정되지 않았습니다.");
  }

  const from = Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USER");
  if (!from) {
    throw new HttpError(503, "SMTP 발신 주소가 설정되지 않았습니다.");
  }

  try {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "SMTP 메일 발송 실패";
    throw new HttpError(502, messageText);
  }
}
