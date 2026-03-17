/**
 * 문의 접수 알림 이메일 발송
 * 새 문의가 접수되면 관리자에게 자동 발송
 */
import { buildInquiryNotificationMail, type InquiryNotificationData } from "../shared/system-mail";
import { sendMail } from "./_core/mailer";

export type { InquiryNotificationData } from "../shared/system-mail";

export async function sendInquiryNotification(data: InquiryNotificationData): Promise<boolean> {
  return sendMail(buildInquiryNotificationMail(data));
}
