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
import { createClient, type EmailOtpType, type Session, type User } from "@supabase/supabase-js";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "../../shared/const";
import { clearAuthCookies, requireAdminRequest, sanitizeReturnPath, signOutAuthSession } from "./authSession";
import { getSessionCookieOptions, parseCookies } from "./cookies";
import { supabaseAdmin } from "./supabase";
import * as db from "../db";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const ACCESS_MAX_AGE = 60 * 60;           // 1시간 (초)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)

function resolveAppOrigin(req: Request, requestedOrigin?: string): string | null {
  const candidates = [requestedOrigin, req.headers.origin, req.get("host") ? `${req.protocol}://${req.get("host")}` : null];
  const expectedHost = req.get("host");

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (expectedHost && url.host !== expectedHost) continue;
      return url.origin;
    } catch {
      continue;
    }
  }

  return null;
}

function setSessionCookies(req: Request, res: Response, session: Session) {
  const cookieBase = getSessionCookieOptions(req);
  res.cookie(SB_ACCESS_COOKIE, session.access_token, { ...cookieBase, maxAge: ACCESS_MAX_AGE * 1000 });
  res.cookie(SB_REFRESH_COOKIE, session.refresh_token, { ...cookieBase, maxAge: REFRESH_MAX_AGE * 1000 });
}

async function syncProfileFromAuthUser(user: User, overrides?: { loginMethod?: string | null; name?: string | null }) {
  const metadata = user.user_metadata ?? {};
  const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : null;
  const openId = typeof metadata.openId === "string" ? metadata.openId : null;
  const name = overrides?.name ?? (
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null
  );

  try {
    await db.upsertProfile({
      id: user.id,
      email: user.email ?? null,
      name,
      openId,
      loginMethod: overrides?.loginMethod ?? provider ?? "email",
      lastSignedIn: new Date(),
    });
  } catch (error) {
    console.error("[EmailAuth] profile sync deferred:", error);
  }
}

export function registerEmailAuthRoutes(app: Express): void {
  app.get("/api/auth/public-config", (_req: Request, res: Response) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(500).json({ error: "Supabase 공개 인증 설정이 누락되었습니다." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    });
  });

  // ── 회원가입 ────────────────────────────────────────────────────────────────
  app.post("/api/auth/email/signup", async (req: Request, res: Response) => {
    const { email, password, name, origin, returnTo } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      origin?: string;
      returnTo?: string;
    };

    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, name은 필수입니다." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." });
      return;
    }

    try {
      // 일반 사용자 가입: supabase.auth.signUp (이메일 확인 메일 발송)
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const appOrigin = resolveAppOrigin(req, origin);
      const safeReturnTo = sanitizeReturnPath(returnTo);
      const emailRedirectTo = appOrigin
        ? `${appOrigin}/auth/callback?flow=signup&next=${encodeURIComponent(safeReturnTo)}`
        : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo,
        },
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      const user = data.user;
      if (!user) {
        res.status(500).json({ error: "회원가입 처리 중 오류가 발생했습니다." });
        return;
      }

      // profiles 테이블에 초기 데이터 저장
      await syncProfileFromAuthUser(user, { loginMethod: "email", name });

      // 이메일 확인 전이면 세션이 없을 수 있음 (confirmationRequired)
      const session = data.session;
      if (session) {
        setSessionCookies(req, res, session);
      }

      res.json({
        success: true,
        confirmationRequired: !session,
        userId: user.id,
        returnTo: safeReturnTo,
      });
    } catch (err) {
      console.error("[EmailAuth] signup error:", err);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });

  // ── 로그인 ──────────────────────────────────────────────────────────────────
  app.post("/api/auth/email/signin", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email과 password는 필수입니다." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
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
      res.status(401).json({ error: "refresh token이 없습니다. 다시 로그인해 주세요." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error || !data.session) {
        // refresh token 만료 또는 무효 → 쿠키 삭제 후 재로그인 요청
        clearAuthCookies(req, res);
        res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해 주세요." });
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
        res.status(401).json({ error: "유효하지 않거나 만료된 인증 링크입니다." });
        return;
      }

      await syncProfileFromAuthUser(data.user);
      setSessionCookies(req, res, data.session);
      res.json({ success: true, returnTo: sanitizeReturnPath(returnTo) });
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
        res.status(401).json({ error: "유효하지 않거나 만료된 인증 링크입니다." });
        return;
      }

      await syncProfileFromAuthUser(data.user);
      setSessionCookies(req, res, data.session);
      res.json({ success: true, returnTo: sanitizeReturnPath(returnTo) });
    } catch (err) {
      console.error("[EmailAuth] confirm error:", err);
      res.status(500).json({ error: "이메일 인증을 완료하지 못했습니다." });
    }
  });

  // ── 관리자 수동 사용자 생성 ─────────────────────────────────────────────────
  // auth.admin.createUser 사용 (이메일 확인 없이 즉시 활성화)
  app.post("/api/auth/admin/create-user", async (req: Request, res: Response) => {
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
  });
}
