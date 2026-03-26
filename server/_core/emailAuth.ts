/**
 * Supabase Auth 이메일 인증 REST 엔드포인트
 *
 * POST /api/auth/email/signup   — 일반 사용자 회원가입 (supabase.auth.signUp)
 * POST /api/auth/email/signin   — 이메일 로그인 (supabase.auth.signInWithPassword)
 * POST /api/auth/email/signout  — 로그아웃 (refresh token 무효화 + 쿠키 삭제)
 * POST /api/auth/email/refresh  — 세션 갱신 (refresh token → 새 access/refresh token)
 *
 * 쿠키 전략:
 *   sb-access-token  : HttpOnly, Secure, SameSite=Lax, maxAge=3600s (1시간)
 *   sb-refresh-token : HttpOnly, Secure, SameSite=Lax, maxAge=31536000s (1년)
 */

import type { Express, Request, Response } from "express";
import {
  createClient,
  type EmailOtpType,
  type Session,
  type User,
} from "@supabase/supabase-js";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "../../shared/const";
import {
  clearAuthCookies,
  findAuthUserByEmail,
  findAuthUserByUsername,
  getAuthenticatedProfileFromRequest,
  requireAdminRequest,
  sanitizeReturnPath,
  signOutAuthSession,
} from "./authSession";
import { getSessionCookieOptions, parseCookies } from "./cookies";
import {
  buildProfileCompletionPath,
  isProfileCompletionRequired,
} from "./profileCompletion";
import { supabaseAdmin } from "./supabase";
import * as db from "../db";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const ACCESS_MAX_AGE = 60 * 60; // 1시간 (초)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)
const USERNAME_REGEX = /^[a-z0-9]{4,16}$/;

type ProfileSyncOverrides = {
  loginMethod?: string | null;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  landlinePhone?: string | null;
  marketingSmsConsent?: boolean;
  marketingEmailConsent?: boolean;
};

function setSessionCookies(req: Request, res: Response, session: Session) {
  const cookieBase = getSessionCookieOptions(req);
  res.cookie(SB_ACCESS_COOKIE, session.access_token, {
    ...cookieBase,
    maxAge: ACCESS_MAX_AGE * 1000,
  });
  res.cookie(SB_REFRESH_COOKIE, session.refresh_token, {
    ...cookieBase,
    maxAge: REFRESH_MAX_AGE * 1000,
  });
}

function normalizeUsername(value?: string | null) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhoneNumber(value?: string | null) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 10 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return value.trim();
}

function isValidMobilePhone(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return /^01\d{8,9}$/.test(digits);
}

function isValidLandlinePhone(value?: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return /^0\d{8,10}$/.test(digits);
}

function isValidSignupPassword(password: string) {
  if (password.length < 10 || password.length > 16) return false;
  let categories = 0;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) categories += 1;
  if (/\d/.test(password)) categories += 1;
  if (/[^A-Za-z0-9]/.test(password)) categories += 1;
  return categories >= 2;
}

function isValidEmailAddress(value?: string | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEmailNotConfirmedError(error: unknown) {
  const authError = error as
    | { message?: string; code?: string; name?: string }
    | null
    | undefined;
  const message =
    typeof authError?.message === "string"
      ? authError.message.toLowerCase()
      : "";
  const code =
    typeof authError?.code === "string" ? authError.code.toLowerCase() : "";

  return (
    code === "email_not_confirmed" ||
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed")
  );
}

function isEmailAlreadyRegisteredError(error: unknown) {
  const authError = error as { message?: string; code?: string } | null | undefined;
  const message =
    typeof authError?.message === "string"
      ? authError.message.toLowerCase()
      : "";
  const code =
    typeof authError?.code === "string" ? authError.code.toLowerCase() : "";

  return (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("already exists")
  );
}

function isEmailConfirmationPending(user: User | null | undefined) {
  const authUser = user as
    | { email_confirmed_at?: string | null; confirmed_at?: string | null }
    | null
    | undefined;

  return (
    Boolean(user?.email) &&
    !(authUser?.email_confirmed_at || authUser?.confirmed_at)
  );
}

function buildExistingSignupEmailMessage(user: User | null | undefined) {
  return user?.email
    ? "이미 사용 중인 이메일입니다. 로그인 또는 비밀번호 찾기를 이용해주세요."
    : "이미 사용 중인 이메일입니다.";
}

async function resolveSigninErrorMessage(loginEmail: string, error: unknown) {
  if (isEmailNotConfirmedError(error)) {
    return "로그인을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  try {
    const authUser = await findAuthUserByEmail(loginEmail);
    if (isEmailConfirmationPending(authUser)) {
      return "로그인을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.";
    }
  } catch (lookupError) {
    console.warn("[EmailAuth] signin error lookup skipped:", lookupError);
  }

  return "아이디 또는 비밀번호가 올바르지 않습니다.";
}

async function resolveSignupEmailConflictMessage(email: string) {
  try {
    const authUser = await findAuthUserByEmail(email);
    if (authUser) {
      return buildExistingSignupEmailMessage(authUser);
    }
  } catch (lookupError) {
    console.warn("[EmailAuth] signup email lookup skipped:", lookupError);
  }

  return "이미 사용 중인 이메일입니다. 로그인 또는 비밀번호 찾기를 이용해주세요.";
}

async function confirmEmailUserIfNeeded(email: string) {
  const authUser = await findAuthUserByEmail(email);
  if (!authUser || !isEmailConfirmationPending(authUser)) {
    return false;
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    email_confirm: true,
  });
  if (error) {
    throw error;
  }

  return true;
}

async function findExistingUsernameOwnerId(username: string) {
  const existingProfile = await db.getProfileByUsername(username);
  if (existingProfile?.id) {
    return existingProfile.id;
  }

  const existingAuthUser = await findAuthUserByUsername(username);
  return existingAuthUser?.id ?? null;
}

async function getAuthUserFromRequest(req: Request) {
  const accessToken = parseCookies(req.headers.cookie)[SB_ACCESS_COOKIE];
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

async function syncProfileFromAuthUser(
  user: User,
  overrides?: ProfileSyncOverrides
) {
  const metadata = user.user_metadata ?? {};
  const provider =
    typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : null;
  const openId = typeof metadata.openId === "string" ? metadata.openId : null;
  const email =
    (typeof metadata.profile_email === "string"
      ? metadata.profile_email
      : user.email) ??
    (typeof metadata.email === "string" ? metadata.email : null);
  const name =
    overrides?.name ??
    (typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null);
  const username =
    overrides?.username ??
    (typeof metadata.username === "string"
      ? normalizeUsername(metadata.username)
      : null);
  const phone =
    overrides?.phone ??
    (typeof metadata.phone === "string"
      ? normalizePhoneNumber(metadata.phone)
      : null);
  const landlinePhone =
    overrides?.landlinePhone ??
    (typeof metadata.landlinePhone === "string"
      ? normalizePhoneNumber(metadata.landlinePhone)
      : null);
  const marketingSmsConsent =
    overrides?.marketingSmsConsent ??
    (typeof metadata.marketingSmsConsent === "boolean"
      ? metadata.marketingSmsConsent
      : undefined);
  const marketingEmailConsent =
    overrides?.marketingEmailConsent ??
    (typeof metadata.marketingEmailConsent === "boolean"
      ? metadata.marketingEmailConsent
      : undefined);

  try {
    await db.upsertProfile({
      id: user.id,
      email,
      name,
      username,
      phone,
      landlinePhone,
      openId,
      marketingSmsConsent,
      marketingEmailConsent,
      loginMethod: overrides?.loginMethod ?? provider ?? "email",
      lastSignedIn: new Date(),
    });
  } catch (error) {
    console.error("[EmailAuth] profile sync deferred:", error);
  }
}

async function resolvePostAuthReturnTo(
  userId: string,
  returnTo?: string | null
) {
  const profile = await db.getProfileById(userId);
  if (!profile || isProfileCompletionRequired(profile)) {
    return buildProfileCompletionPath(returnTo);
  }

  return sanitizeReturnPath(returnTo);
}

export function registerEmailAuthRoutes(app: Express): void {
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const profile = await getAuthenticatedProfileFromRequest(req);
      res.setHeader("Cache-Control", "no-store");
      res.json({
        user: profile
          ? {
              ...profile,
              requiresProfileCompletion: isProfileCompletionRequired(profile),
            }
          : null,
      });
    } catch (error) {
      console.error("[EmailAuth] me error:", error);
      res.status(500).json({ error: "사용자 정보를 확인하지 못했습니다." });
    }
  });

  app.get("/api/auth/public-config", (_req: Request, res: Response) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res
        .status(500)
        .json({ error: "Supabase 공개 인증 설정이 누락되었습니다." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
  });

  app.get(
    "/api/auth/email/check-username",
    async (req: Request, res: Response) => {
      const rawUsername =
        typeof req.query.username === "string" ? req.query.username : "";
      const normalizedUsername = normalizeUsername(rawUsername);

      res.setHeader("Cache-Control", "no-store");

      if (!normalizedUsername) {
        res.json({
          username: "",
          valid: false,
          available: false,
          message: "아이디를 입력해주세요.",
        });
        return;
      }

      if (!USERNAME_REGEX.test(normalizedUsername)) {
        res.json({
          username: normalizedUsername,
          valid: false,
          available: false,
          message: "아이디는 영문 소문자와 숫자 조합 4~16자로 입력해주세요.",
        });
        return;
      }

      try {
        const existingUsernameOwnerId =
          await findExistingUsernameOwnerId(normalizedUsername);

        res.json({
          username: normalizedUsername,
          valid: true,
          available: !existingUsernameOwnerId,
          message: existingUsernameOwnerId
            ? "이미 사용 중인 아이디입니다."
            : "사용 가능한 아이디입니다.",
        });
      } catch (error) {
        console.error("[EmailAuth] username availability error:", error);
        res
          .status(500)
          .json({ error: "아이디 중복 여부를 확인하지 못했습니다." });
      }
    }
  );

  // ── 회원가입 ────────────────────────────────────────────────────────────────
  app.post("/api/auth/email/signup", async (req: Request, res: Response) => {
    const {
      username,
      email,
      password,
      name,
      mobilePhone,
      landlinePhone,
      postalCode,
      address,
      addressDetail,
      termsAgreed,
      marketingSmsConsent,
      marketingEmailConsent,
      returnTo,
    } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      name?: string;
      mobilePhone?: string;
      landlinePhone?: string;
      postalCode?: string;
      address?: string;
      addressDetail?: string;
      termsAgreed?: boolean;
      marketingSmsConsent?: boolean;
      marketingEmailConsent?: boolean;
      returnTo?: string;
    };
    const normalizedUsername = normalizeUsername(username);
    const normalizedMobilePhone = normalizePhoneNumber(mobilePhone);
    const normalizedLandlinePhone = normalizePhoneNumber(landlinePhone);
    const trimmedName = name?.trim() ?? "";
    const trimmedEmail = email?.trim().toLowerCase() ?? "";
    const trimmedPostalCode = postalCode?.trim() ?? "";
    const trimmedAddress = address?.trim() ?? "";
    const trimmedAddressDetail = addressDetail?.trim() ?? "";

    if (
      !normalizedUsername ||
      !trimmedEmail ||
      !password ||
      !trimmedName ||
      !normalizedMobilePhone
    ) {
      res.status(400).json({
        error: "아이디, 이름, 휴대전화, 이메일, 비밀번호는 필수입니다.",
      });
      return;
    }
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      res.status(400).json({
        error: "아이디는 영문 소문자와 숫자 조합 4~16자로 입력해주세요.",
      });
      return;
    }
    if (!isValidEmailAddress(trimmedEmail)) {
      res.status(400).json({ error: "이메일 형식을 확인해주세요." });
      return;
    }
    if (!isValidSignupPassword(password)) {
      res.status(400).json({
        error:
          "비밀번호는 10~16자이며 영문, 숫자, 특수문자 중 2가지 이상을 포함해야 합니다.",
      });
      return;
    }
    if (!termsAgreed) {
      res.status(400).json({ error: "필수 약관 동의가 필요합니다." });
      return;
    }
    if (!isValidMobilePhone(normalizedMobilePhone)) {
      res.status(400).json({ error: "휴대전화 번호를 정확히 입력해주세요." });
      return;
    }
    if (!isValidLandlinePhone(normalizedLandlinePhone)) {
      res.status(400).json({ error: "일반전화 번호 형식을 확인해주세요." });
      return;
    }
    if (
      (trimmedPostalCode && !trimmedAddress) ||
      (!trimmedPostalCode && trimmedAddress)
    ) {
      res
        .status(400)
        .json({ error: "주소는 우편번호와 기본주소를 함께 입력해주세요." });
      return;
    }

    try {
      const existingUsernameOwnerId =
        await findExistingUsernameOwnerId(normalizedUsername);
      if (existingUsernameOwnerId) {
        res.status(409).json({ error: "이미 사용 중인 아이디입니다." });
        return;
      }

      const existingAuthUserByEmail = await findAuthUserByEmail(trimmedEmail);
      if (existingAuthUserByEmail) {
        res.status(409).json({
          error: buildExistingSignupEmailMessage(existingAuthUserByEmail),
        });
        return;
      }

      // 일반 사용자 가입: 서버에서 즉시 인증 완료 계정을 생성하고 곧바로 로그인
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const safeReturnTo = sanitizeReturnPath(returnTo);
      const signupMetadata = {
        full_name: trimmedName,
        username: normalizedUsername,
        phone: normalizedMobilePhone,
        landlinePhone: normalizedLandlinePhone,
        profile_email: trimmedEmail,
        marketingSmsConsent: Boolean(marketingSmsConsent),
        marketingEmailConsent: Boolean(marketingEmailConsent),
      };
      const { data: createdUserData, error } =
        await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        user_metadata: signupMetadata,
        email_confirm: true,
      });

      if (error) {
        if (isEmailAlreadyRegisteredError(error)) {
          res.status(409).json({
            error: await resolveSignupEmailConflictMessage(trimmedEmail),
          });
          return;
        }

        res.status(400).json({ error: error.message });
        return;
      }

      const user = createdUserData.user;
      if (!user) {
        res
          .status(500)
          .json({ error: "회원가입 처리 중 오류가 발생했습니다." });
        return;
      }

      // profiles 테이블에 초기 데이터 저장
      await syncProfileFromAuthUser(user, {
        loginMethod: "email",
        name: trimmedName,
        username: normalizedUsername,
        phone: normalizedMobilePhone,
        landlinePhone: normalizedLandlinePhone,
        marketingSmsConsent: Boolean(marketingSmsConsent),
        marketingEmailConsent: Boolean(marketingEmailConsent),
      });

      if (trimmedPostalCode && trimmedAddress) {
        try {
          await db.createSavedAddress({
            userId: user.id,
            label: "기본 배송지",
            recipientName: trimmedName,
            recipientPhone: normalizedMobilePhone,
            shippingZipCode: trimmedPostalCode,
            shippingAddress: trimmedAddress,
            shippingAddressDetail: trimmedAddressDetail || null,
            isDefault: true,
          });
        } catch (addressError) {
          console.error(
            "[EmailAuth] default address sync deferred:",
            addressError
          );
        }
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (signInError || !signInData.session || !signInData.user) {
        console.error("[EmailAuth] signup auto-login error:", signInError);
        res.status(500).json({
          error:
            "회원가입은 완료되었지만 로그인 처리에 실패했습니다. 로그인 화면에서 다시 시도해주세요.",
        });
        return;
      }

      setSessionCookies(req, res, signInData.session);

      res.json({
        success: true,
        confirmationRequired: false,
        userId: user.id,
        username: normalizedUsername,
        name: trimmedName,
        email: trimmedEmail,
        returnTo: safeReturnTo,
      });
    } catch (err) {
      console.error("[EmailAuth] signup error:", err);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });

  app.post(
    "/api/auth/profile/complete",
    async (req: Request, res: Response) => {
      const profile = await getAuthenticatedProfileFromRequest(req);
      const authUser = await getAuthUserFromRequest(req);

      if (!profile || !authUser) {
        res.status(401).json({ error: "로그인이 필요합니다." });
        return;
      }

      const {
        username,
        email,
        name,
        mobilePhone,
        landlinePhone,
        postalCode,
        address,
        addressDetail,
        termsAgreed,
        marketingSmsConsent,
        marketingEmailConsent,
        returnTo,
      } = req.body as {
        username?: string;
        email?: string;
        name?: string;
        mobilePhone?: string;
        landlinePhone?: string;
        postalCode?: string;
        address?: string;
        addressDetail?: string;
        termsAgreed?: boolean;
        marketingSmsConsent?: boolean;
        marketingEmailConsent?: boolean;
        returnTo?: string;
      };

      const normalizedUsername = normalizeUsername(username);
      const normalizedMobilePhone = normalizePhoneNumber(mobilePhone);
      const normalizedLandlinePhone = normalizePhoneNumber(landlinePhone);
      const trimmedName = name?.trim() ?? "";
      const trimmedEmail = email?.trim().toLowerCase() ?? "";
      const trimmedPostalCode = postalCode?.trim() ?? "";
      const trimmedAddress = address?.trim() ?? "";
      const trimmedAddressDetail = addressDetail?.trim() ?? "";
      const safeReturnTo = sanitizeReturnPath(returnTo);

      if (
        !normalizedUsername ||
        !trimmedEmail ||
        !trimmedName ||
        !normalizedMobilePhone
      ) {
        res
          .status(400)
          .json({ error: "아이디, 이름, 휴대전화, 이메일은 필수입니다." });
        return;
      }
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        res.status(400).json({
          error: "아이디는 영문 소문자와 숫자 조합 4~16자로 입력해주세요.",
        });
        return;
      }
      if (!isValidEmailAddress(trimmedEmail)) {
        res.status(400).json({ error: "이메일 형식을 확인해주세요." });
        return;
      }
      if (!termsAgreed) {
        res.status(400).json({ error: "필수 약관 동의가 필요합니다." });
        return;
      }
      if (!isValidMobilePhone(normalizedMobilePhone)) {
        res.status(400).json({ error: "휴대전화 번호를 정확히 입력해주세요." });
        return;
      }
      if (!isValidLandlinePhone(normalizedLandlinePhone)) {
        res.status(400).json({ error: "일반전화 번호 형식을 확인해주세요." });
        return;
      }
      if (
        (trimmedPostalCode && !trimmedAddress) ||
        (!trimmedPostalCode && trimmedAddress)
      ) {
        res
          .status(400)
          .json({ error: "주소는 우편번호와 기본주소를 함께 입력해주세요." });
        return;
      }

      try {
        const existingUsernameOwnerId =
          await findExistingUsernameOwnerId(normalizedUsername);
        if (existingUsernameOwnerId && existingUsernameOwnerId !== profile.id) {
          res.status(409).json({ error: "이미 사용 중인 아이디입니다." });
          return;
        }

        await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          user_metadata: {
            ...(authUser.user_metadata ?? {}),
            full_name: trimmedName,
            name: trimmedName,
            username: normalizedUsername,
            phone: normalizedMobilePhone,
            landlinePhone: normalizedLandlinePhone,
            profile_email: trimmedEmail,
            marketingSmsConsent: Boolean(marketingSmsConsent),
            marketingEmailConsent: Boolean(marketingEmailConsent),
          },
        });

        await db.updateProfileData(profile.id, {
          username: normalizedUsername,
          name: trimmedName,
          email: trimmedEmail,
          phone: normalizedMobilePhone,
          landlinePhone: normalizedLandlinePhone,
          marketingSmsConsent: Boolean(marketingSmsConsent),
          marketingEmailConsent: Boolean(marketingEmailConsent),
        });

        if (trimmedPostalCode && trimmedAddress) {
          const savedAddresses = await db.getUserSavedAddresses(profile.id);
          const targetAddress =
            savedAddresses.find(item => item.isDefault) ?? savedAddresses[0];
          const addressPayload = {
            userId: profile.id,
            label: "기본 배송지",
            recipientName: trimmedName,
            recipientPhone: normalizedMobilePhone,
            shippingZipCode: trimmedPostalCode,
            shippingAddress: trimmedAddress,
            shippingAddressDetail: trimmedAddressDetail || null,
            isDefault: true,
          };

          if (targetAddress) {
            await db.updateSavedAddress(
              targetAddress.id,
              profile.id,
              addressPayload
            );
          } else {
            await db.createSavedAddress(addressPayload);
          }
        }

        res.json({
          success: true,
          username: normalizedUsername,
          name: trimmedName,
          email: trimmedEmail,
          returnTo: safeReturnTo,
        });
      } catch (err) {
        console.error("[EmailAuth] profile completion error:", err);
        res.status(500).json({ error: "추가 정보를 저장하지 못했습니다." });
      }
    }
  );

  // ── 로그인 ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/email/signin", async (req: Request, res: Response) => {
    const { identifier, email, password } = req.body as {
      identifier?: string;
      email?: string;
      password?: string;
    };
    const normalizedIdentifier = (identifier ?? email ?? "").trim();

    if (!normalizedIdentifier || !password) {
      res
        .status(400)
        .json({ error: "아이디 또는 이메일과 비밀번호는 필수입니다." });
      return;
    }

    try {
      let loginEmail = normalizedIdentifier;
      if (!normalizedIdentifier.includes("@")) {
        const normalizedUsername = normalizeUsername(normalizedIdentifier);
        const profile = await db.getProfileByUsername(normalizedUsername);

        if (profile?.email) {
          loginEmail = profile.email.trim().toLowerCase();
        } else {
          const authUser = await findAuthUserByUsername(normalizedUsername);
          if (!authUser?.email) {
            res
              .status(401)
              .json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
            return;
          }

          loginEmail = authUser.email.trim().toLowerCase();
          await syncProfileFromAuthUser(authUser, {
            loginMethod: "email",
            username: normalizedUsername,
          });
        }
      } else {
        loginEmail = normalizedIdentifier.toLowerCase();
      }

      if (!isValidEmailAddress(loginEmail)) {
        res
          .status(401)
          .json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      let { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error && isEmailNotConfirmedError(error)) {
        try {
          const confirmed = await confirmEmailUserIfNeeded(loginEmail);
          if (confirmed) {
            const retry = await supabase.auth.signInWithPassword({
              email: loginEmail,
              password,
            });
            data = retry.data;
            error = retry.error;
          }
        } catch (confirmError) {
          console.error("[EmailAuth] legacy email confirmation error:", confirmError);
        }
      }

      if (error) {
        const errorMessage = await resolveSigninErrorMessage(loginEmail, error);
        res.status(401).json({ error: errorMessage });
        return;
      }

      if (!data.session || !data.user) {
        res.status(500).json({ error: "로그인 세션을 생성하지 못했습니다." });
        return;
      }

      const { session, user } = data;

      // profiles upsert (로그인 시 lastSignedIn 갱신)
      await syncProfileFromAuthUser(user, { loginMethod: "email" });

      // access token + refresh token 분리 쿠키 저장
      setSessionCookies(req, res, session);

      res.json({ success: true, userId: user.id });
    } catch (err) {
      console.error("[EmailAuth] signin error:", err);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });

  // ── 로그아웃 ────────────────────────────────────────────────────────────────
  // refresh token 무효화 후 쿠키 삭제
  // access token은 만료 전까지 유효하지만 refresh token을 제거하면 갱신 불가
  app.post("/api/auth/email/signout", async (req: Request, res: Response) => {
    try {
      await signOutAuthSession(req, res);
      res.json({ success: true });
    } catch (err) {
      console.error("[EmailAuth] signout error:", err);
      clearAuthCookies(req, res);
      res.json({ success: true });
    }
  });

  // ── 세션 갱신 ───────────────────────────────────────────────────────────────
  // refresh token → 새 access token + refresh token 발급
  app.post("/api/auth/email/refresh", async (req: Request, res: Response) => {
    const refreshToken = parseCookies(req.headers.cookie)[SB_REFRESH_COOKIE];

    if (!refreshToken) {
      res
        .status(401)
        .json({ error: "refresh token이 없습니다. 다시 로그인해 주세요." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        // refresh token 만료 또는 무효 → 쿠키 삭제 후 재로그인 요청
        clearAuthCookies(req, res);
        res
          .status(401)
          .json({ error: "세션이 만료되었습니다. 다시 로그인해 주세요." });
        return;
      }

      const { session } = data;
      setSessionCookies(req, res, session);

      res.json({ success: true });
    } catch (err) {
      console.error("[EmailAuth] refresh error:", err);
      res.status(500).json({ error: "세션 갱신 중 오류가 발생했습니다." });
    }
  });

  // ── 이메일 인증 콜백: access/refresh 토큰으로 서버 세션 확정 ────────────────
  app.post("/api/auth/email/session", async (req: Request, res: Response) => {
    const { accessToken, refreshToken, returnTo } = req.body as {
      accessToken?: string;
      refreshToken?: string;
      returnTo?: string;
    };

    if (!accessToken || !refreshToken) {
      res.status(400).json({ error: "세션 토큰이 없습니다." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !data.session || !data.user) {
        res
          .status(401)
          .json({ error: "유효하지 않거나 만료된 인증 링크입니다." });
        return;
      }

      await syncProfileFromAuthUser(data.user);
      setSessionCookies(req, res, data.session);
      res.json({
        success: true,
        returnTo: await resolvePostAuthReturnTo(data.user.id, returnTo),
      });
    } catch (err) {
      console.error("[EmailAuth] session finalize error:", err);
      res.status(500).json({ error: "인증 세션을 완료하지 못했습니다." });
    }
  });

  // ── 이메일 인증 콜백: token_hash 기반 확인 링크 지원 ───────────────────────
  app.post("/api/auth/email/confirm", async (req: Request, res: Response) => {
    const { tokenHash, type, returnTo } = req.body as {
      tokenHash?: string;
      type?: string;
      returnTo?: string;
    };

    if (!tokenHash || !type) {
      res.status(400).json({ error: "인증 토큰이 없습니다." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });

      if (error || !data.session || !data.user) {
        res
          .status(401)
          .json({ error: "유효하지 않거나 만료된 인증 링크입니다." });
        return;
      }

      await syncProfileFromAuthUser(data.user);
      setSessionCookies(req, res, data.session);
      res.json({
        success: true,
        returnTo: await resolvePostAuthReturnTo(data.user.id, returnTo),
      });
    } catch (err) {
      console.error("[EmailAuth] confirm error:", err);
      res.status(500).json({ error: "이메일 인증을 완료하지 못했습니다." });
    }
  });

  // ── 관리자 수동 사용자 생성 ─────────────────────────────────────────────────
  // auth.admin.createUser 사용 (이메일 확인 없이 즉시 활성화)
  app.post(
    "/api/auth/admin/create-user",
    async (req: Request, res: Response) => {
      const { email, password, name, role } = req.body as {
        email?: string;
        password?: string;
        name?: string;
        role?: "user" | "admin";
      };

      if (!email || !password || !name) {
        res.status(400).json({ error: "email, password, name은 필수입니다." });
        return;
      }

      try {
        await requireAdminRequest(req);

        // 관리자 수동 생성: admin.createUser (이메일 확인 없이 즉시 활성화)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          user_metadata: { full_name: name },
          email_confirm: true, // 이메일 확인 없이 즉시 활성화
        });

        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }

        const user = data.user;
        if (!user) {
          res.status(500).json({ error: "사용자 생성에 실패했습니다." });
          return;
        }

        // profiles 테이블 초기화
        await db.upsertProfile({
          id: user.id,
          email: user.email ?? null,
          name,
          openId: null,
          loginMethod: "email",
          role: role ?? "user",
          lastSignedIn: undefined,
        });

        res.json({ success: true, userId: user.id });
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          res.status(401).json({ error: "로그인이 필요합니다." });
          return;
        }
        if (err instanceof Error && err.message === "FORBIDDEN") {
          res.status(403).json({ error: "관리자만 사용할 수 있습니다." });
          return;
        }
        console.error("[EmailAuth] admin create-user error:", err);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
      }
    }
  );
}
