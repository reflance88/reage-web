import {
  buildBusinessVerificationAdminMail,
  buildBusinessVerificationApplicantMail,
  type BusinessVerificationNotificationInput,
  type InquiryNotificationData,
} from "../../shared/system-mail";
import { sendInquiryNotification } from "../email-inquiry";
import { sendMail } from "./mailer";
import { invokeSupabaseEdgeFunction, shouldFallbackFromEdgeFunction } from "./supabaseEdgeFunctions";

function resolveAdminEmailSource() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || null;
}

async function sendBusinessVerificationEmailsLocally(
  payload: BusinessVerificationNotificationInput,
) {
  const applicantMail = buildBusinessVerificationApplicantMail(payload);
  await sendMail(applicantMail);

  const adminMail = buildBusinessVerificationAdminMail(payload, {
    adminEmail: resolveAdminEmailSource(),
  });
  if (adminMail) {
    await sendMail(adminMail);
  }
}

export async function notifyInquiryReceived(payload: InquiryNotificationData) {
  try {
    await invokeSupabaseEdgeFunction("system-mail/inquiry-notification", {
      body: payload,
      serviceRole: true,
    });
    return;
  } catch (error) {
    if (!shouldFallbackFromEdgeFunction(error)) {
      throw error;
    }

    console.warn("[SystemNotify] inquiry-notification edge 호출 실패, SMTP 폴백 사용:", error);
  }

  await sendInquiryNotification(payload);
}

export async function notifyBusinessVerificationSubmitted(
  payload: BusinessVerificationNotificationInput,
) {
  try {
    await invokeSupabaseEdgeFunction("system-mail/business-verification", {
      body: {
        ...payload,
        adminEmail: resolveAdminEmailSource(),
      },
      serviceRole: true,
    });
    return;
  } catch (error) {
    if (!shouldFallbackFromEdgeFunction(error)) {
      throw error;
    }

    console.warn("[SystemNotify] business-verification edge 호출 실패, SMTP 폴백 사용:", error);
  }

  await sendBusinessVerificationEmailsLocally(payload);
}
