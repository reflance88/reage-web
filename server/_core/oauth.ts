/**
 * OAuth 라우트 등록
 *
 * registerSupabaseOAuthRoutes:
 *   POST /api/auth/session       — 프론트 PKCE 완료 후 토큰 전달 → sb-* 쿠키 설정
 *   GET  /api/auth/social/:provider — 서버 사이드 소셜 로그인 시작 (PKCE 흐름)
 *   GET  /api/auth/callback      — Supabase OAuth 콜백 (PKCE code 교환)
 *   POST /api/auth/refresh       — refresh token → 새 access token
 *   POST /api/auth/signout       — 로그아웃 (쿠키 삭제)
 *
 * registerOAuthRoutes:
 *   GET  /api/oauth/callback     — Manus OAuth 레거시 콜백 (전환 기간 유지)
 *
 * [수정 내역 - 2026-03-13]
 *   1. SITE_URL 하드코딩 제거 → APP_BASE_URL 환경변수 사용 (fallback: req.origin)
 *   2. flowType: "implicit" → "pkce" 로 통일 (클라이언트와 일치)
 *   3. /api/auth/email/signup, /api/auth/email/signin 중복 라우트 제거
 *      (emailAuth.ts 에서만 등록)
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { supabaseAdmin } from "./supabase";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * state 파라미터에서 returnPath를 파싱합니다.
 */
function parseReturnPath(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (parsed.returnPath && typeof parsed.returnPath === "string") {
        return parsed.returnPath;
      }
    }
    return "/";
  } catch {
    return "/";
  }
}

/**
 * 배포 환경에 따른 사이트 기본 URL을 반환합니다.
 * APP_BASE_URL 환경변수 → 요청의 origin 순으로 폴백합니다.
 */
function getSiteUrl(req: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "http";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Supabase OAuth 흐름 (PKCE 표준):
 * 1. 클라이언트: supabase.auth.signInWithOAuth → provider 로그인 페이지로 이동
 *    (code_verifier는 Supabase client가 localStorage에 자동 저장)
 * 2. Provider → GET /auth/callback?code=... (프론트엔드 AuthCallback 페이지)
 * 3. 프론트엔드: supabase.auth.exchangeCodeForSession(code) → session 획득
 * 4. 프론트엔드: POST /api/auth/session { access_token, refresh_token }
 * 5. 서버: sb-* httpOnly 쿠키 설정 + profiles upsert
 *
 * 또는 서버 사이드 흐름 (GET /api/auth/social/:provider 사용 시):
 * 1. GET /api/auth/social/:provider → Supabase signInWithOAuth URL 생성 → 리다이렉트
 * 2. Provider → GET /api/auth/callback?code=... (서버 콜백)
 * 3. 서버: exchangeCodeForSession → sb-* 쿠키 설정 → 홈 리다이렉트
 *    ※ 서버 사이드 흐름은 code_verifier 없이 처리하므로 PKCE 보안 이점 없음
 *    ※ 가능하면 클라이언트 PKCE 흐름 사용 권장
 */
export function registerSupabaseOAuthRoutes(app: Express) {
  // ─── 0. 프론트엔드 PKCE 세션 전달 ─────────────────────────────────────────
  // POST /api/auth/session
  // 프론트에서 exchangeCodeForSession 완료 후 access_token/refresh_token을 전달
  // 서버는 sb-* httpOnly 쿠키를 설정하고 profiles upsert
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    const { access_token, refresh_token } = req.body as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!access_token || !refresh_token) {
      res.status(400).json({ error: "access_token and refresh_token are required" });
      return;
    }

    try {
      // access_token으로 사용자 정보 검증
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(access_token);
      if (userError || !userData.user) {
        console.error("[/api/auth/session] getUser error:", userError);
        res.status(401).json({ error: "Invalid access_token" });
        return;
      }

      const user = userData.user;

      // sb-* httpOnly 쿠키 설정
      _setSupabaseCookies(res, access_token, refresh_token);

      // profiles upsert (auth.users.id 기준)
      try {
        const email = user.email ?? null;
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.user_metadata?.preferred_username ??
          null;
        const loginMethod = user.app_metadata?.provider ?? null;

        await db.upsertProfile({
          id: user.id,
          email,
          name,
          loginMethod,
          lastSignedIn: new Date(),
        });
        console.log("[/api/auth/session] profiles upserted for", user.id, email);
      } catch (profileErr) {
        console.warn("[/api/auth/session] profiles upsert failed (non-fatal):", profileErr);
      }

      res.json({ ok: true, userId: user.id });
    } catch (err) {
      console.error("[/api/auth/session] Unexpected error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── 1. 소셜 로그인 시작 ───────────────────────────────────────────────────
  // GET /api/auth/social/:provider (google | kakao)
  // 서버 사이드 흐름: code_verifier 없이 처리 (PKCE 보안 이점 없음)
  // 클라이언트 PKCE 흐름(LoginPage.tsx의 handleSocialLogin)을 권장
  app.get("/api/auth/social/:provider", async (req: Request, res: Response) => {
    const provider = req.params.provider as "google" | "kakao";
    if (provider !== "google" && provider !== "kakao") {
      res.status(400).json({ error: "Unsupported provider" });
      return;
    }

    const returnTo = (req.query.returnTo as string) || "/index-main.html";
    const siteUrl = getSiteUrl(req);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_ANON_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      console.error("[Supabase OAuth] signInWithOAuth error:", error);
      res.status(500).json({ error: "OAuth init failed" });
      return;
    }

    res.redirect(302, data.url);
  });

  // ─── 2. Supabase OAuth 콜백 (서버 사이드) ────────────────────────────────
  // GET /api/auth/callback?code=...&returnTo=...
  // ※ 서버 사이드 흐름에서만 사용됨
  //   클라이언트 PKCE 흐름은 /auth/callback (AuthCallback.tsx)에서 처리
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const returnTo = (req.query.returnTo as string) || "/index-main.html";

    if (!code) {
      res.redirect(302, `/login?error=missing_code`);
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      // 서버 사이드 code 교환: code_verifier 없이 처리
      // Supabase는 서버 사이드에서 PKCE 없이 code 교환을 허용하지 않으므로
      // 이 엔드포인트는 서버 사이드 소셜 로그인 흐름 전용
      const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_ANON_KEY ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session || !data.user) {
        console.error("[Supabase OAuth] exchangeCodeForSession error:", error);
        res.redirect(302, `/login?error=auth_failed`);
        return;
      }

      const { session, user } = data;

      // sb-* 쿠키 설정
      _setSupabaseCookies(res, session.access_token, session.refresh_token);

      // profiles upsert (auth.users.id 기준)
      try {
        const email = user.email ?? null;
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.user_metadata?.preferred_username ??
          null;
        const loginMethod = user.app_metadata?.provider ?? null;

        await db.upsertProfile({
          id: user.id,
          email,
          name,
          loginMethod,
          lastSignedIn: new Date(),
        });
        console.log("[Supabase OAuth] profiles upserted for", user.id, email);
      } catch (profileErr) {
        console.warn("[Supabase OAuth] profiles upsert failed (non-fatal):", profileErr);
      }

      res.redirect(302, returnTo);
    } catch (err) {
      console.error("[Supabase OAuth] Callback error:", err);
      res.redirect(302, `/login?error=server_error`);
    }
  });

  // ─── 3. refresh token → 새 access token ──────────────────────────────────
  // POST /api/auth/refresh
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    const cookies = _parseCookies(req.headers.cookie);
    const refreshToken = cookies["sb-refresh-token"];
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    try {
      const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) {
        res.status(401).json({ error: "Session refresh failed" });
        return;
      }
      _setSupabaseCookies(res, data.session.access_token, data.session.refresh_token);
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] Refresh failed", error);
      res.status(500).json({ error: "Refresh failed" });
    }
  });

  // ─── 4. 로그아웃 ──────────────────────────────────────────────────────────
  // POST /api/auth/signout
  app.post("/api/auth/signout", async (req: Request, res: Response) => {
    const cookies = _parseCookies(req.headers.cookie);
    const accessToken = cookies["sb-access-token"];

    try {
      if (accessToken) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseClient = createClient(
          process.env.SUPABASE_URL ?? "",
          process.env.SUPABASE_ANON_KEY ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: cookies["sb-refresh-token"] ?? "",
        });
        await supabaseClient.auth.signOut({ scope: "local" });
      }
    } catch (e) {
      console.warn("[Auth] Supabase signOut error (non-fatal):", e);
    }

    const sessionCookieOptions = getSessionCookieOptions(req);
    const isProduction = process.env.NODE_ENV === "production";
    const sbClearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
    };
    res.clearCookie("sb-access-token", sbClearOptions);
    res.clearCookie("sb-refresh-token", sbClearOptions);
    res.clearCookie(COOKIE_NAME, sessionCookieOptions);
    res.json({ ok: true });
  });
}

/**
 * Manus OAuth 레거시 콜백 (전환 기간 동안 유지)
 * GET /api/oauth/callback
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // auth.users에 사용자 등록 또는 확인 (openId를 user_metadata에 저장)
      let authUserId: string | null = null;

      if (userInfo.email) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === userInfo.email);

        if (existing) {
          authUserId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            user_metadata: {
              ...existing.user_metadata,
              openId: userInfo.openId,
              full_name: userInfo.name || existing.user_metadata?.full_name,
            },
          });
        } else {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userInfo.email,
            user_metadata: {
              full_name: userInfo.name || null,
              openId: userInfo.openId,
            },
            email_confirm: true,
          });
          if (!createError && newUser.user) {
            authUserId = newUser.user.id;
          }
        }
      }

      if (!authUserId) {
        const fakeEmail = `${userInfo.openId}@manus-oauth.local`;
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === fakeEmail);

        if (existing) {
          authUserId = existing.id;
        } else {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: fakeEmail,
            user_metadata: {
              full_name: userInfo.name || null,
              openId: userInfo.openId,
            },
            email_confirm: true,
          });
          if (!createError && newUser.user) {
            authUserId = newUser.user.id;
          }
        }
      }

      if (!authUserId) {
        res.status(500).json({ error: "Failed to register user in auth.users" });
        return;
      }

      // profiles 테이블에 upsert
      await db.upsertProfile({
        id: authUserId,
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Supabase 세션 생성 (generateLink → verifyOtp 패턴)
      try {
        const userEmail = userInfo.email || `${userInfo.openId}@manus-oauth.local`;
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseAnonClient = createClient(
          process.env.SUPABASE_URL ?? "",
          process.env.SUPABASE_ANON_KEY ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
        });

        if (!linkError && linkData?.properties?.hashed_token) {
          const { data: sessionData, error: sessionError } = await supabaseAnonClient.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: "magiclink",
          });

          if (!sessionError && sessionData?.session) {
            _setSupabaseCookies(res, sessionData.session.access_token, sessionData.session.refresh_token);
            console.log("[OAuth] Supabase session created for", userEmail);
          } else {
            console.warn("[OAuth] verifyOtp failed (non-fatal):", sessionError);
          }
        } else {
          console.warn("[OAuth] generateLink failed (non-fatal):", linkError);
        }
      } catch (sessionErr) {
        console.warn("[OAuth] Supabase session creation failed (non-fatal):", sessionErr);
      }

      // Manus OAuth 세션 토큰 발급 (전환 기간 동안 유지)
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      const returnPath = parseReturnPath(state);
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

function _setSupabaseCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieBase = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  };
  // access token: 1시간
  res.cookie("sb-access-token", accessToken, { ...cookieBase, maxAge: 60 * 60 * 1000 });
  // refresh token: 1년
  res.cookie("sb-refresh-token", refreshToken, { ...cookieBase, maxAge: 365 * 24 * 60 * 60 * 1000 });
}

function _parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
  });
  return cookies;
}
