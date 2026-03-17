import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  buildBusinessVerificationAdminMail,
  buildBusinessVerificationApplicantMail,
  buildInquiryNotificationMail,
  type BusinessVerificationNotificationInput,
  type InquiryNotificationData,
} from "../_shared/system-mail.ts";
import { HttpError, errorResponse, getFunctionPath, jsonResponse, parseJsonBody } from "../_shared/http.ts";
import { requireServiceRoleAuthorization } from "../_shared/internal-auth.ts";
import { sendSmtpMail } from "../_shared/mail.ts";

type BusinessVerificationRequest = BusinessVerificationNotificationInput & {
  adminEmail?: string | null;
};

async function handleInquiryNotification(req: Request) {
  const body = await parseJsonBody<InquiryNotificationData>(req);
  const message = buildInquiryNotificationMail(body, {
    adminEmail: Deno.env.get("INQUIRY_ADMIN_EMAIL"),
  });

  await sendSmtpMail(message);
  return jsonResponse({ success: true });
}

async function handleBusinessVerification(req: Request) {
  const body = await parseJsonBody<BusinessVerificationRequest>(req);
  if (!body.userEmail) {
    throw new HttpError(400, "userEmail이 필요합니다.");
  }

  await sendSmtpMail(buildBusinessVerificationApplicantMail(body));

  const adminMail = buildBusinessVerificationAdminMail(body, {
    adminEmail: body.adminEmail ?? Deno.env.get("BUSINESS_VERIFICATION_ADMIN_EMAIL"),
  });

  if (adminMail) {
    await sendSmtpMail(adminMail);
  }

  return jsonResponse({ success: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    requireServiceRoleAuthorization(req);

    const path = getFunctionPath(req, "system-mail");
    if (req.method !== "POST") {
      throw new HttpError(405, "허용되지 않는 메서드입니다.");
    }

    if (path === "/inquiry-notification") {
      return await handleInquiryNotification(req);
    }

    if (path === "/business-verification") {
      return await handleBusinessVerification(req);
    }

    throw new HttpError(404, "지원하지 않는 경로입니다.");
  } catch (error) {
    return errorResponse(error);
  }
});
