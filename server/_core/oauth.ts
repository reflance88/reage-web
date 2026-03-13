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
 * getLoginUrl()은 state = btoa(redirectUri) 형식으로 전달합니다.
 * state = btoa(JSON.stringify({redirectUri, returnPath})) 형식도 지원합니다.
 */
function parseReturnPath(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    // JSON 형식인 경우
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (parsed.returnPath && typeof parsed.returnPath === "string") {
        return parsed.returnPath;
      }
    }
    // 단순 URL 형식인 경우 (기존 방식) - 홈으로
    return "/";
  } catch {
    return "/";
  }
}

const SITE_URL = process.env.NODE_ENV === "production"
  ? "https://reageweb-aerfeijb.manus.space"
  : "http://localhost:3000";

/**
 * Supabase OAuth 흐름:
 * 1. GET /api/auth/social/:provider → Supabase signInWithOAuth URL 생성 → 리다이렉트
 * 2. Supabase → GET /api/auth/callback?code=... → exchangeCodeForSession → sb-* 쿠키 설정 → 홈 리다이렉트
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
  app.get("/api/auth/social/:provider", async (req: Request, res: Response) => {
    const provider = req.params.provider as "google" | "kakao";
    if (provider !== "google" && provider !== "kakao") {
      res.status(400).json({ error: "Unsupported provider" });
      return;
    }

    const returnTo = (req.query.returnTo as string) || "/index-main.html";
    const { createClient } = await import("@supabase/supabase-js");
    // flowType: "implicit" → PKCE code_verifier 없이 서버 사이드에서 처리 가능
    const supabase = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_ANON_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false, flowType: "implicit" } }
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${SITE_URL}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
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

  // ─── 2. Supabase OAuth 콜백 ───────────────────────────────────────────────
  // GET /api/auth/callback?code=...&returnTo=...
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const returnTo = (req.query.returnTo as string) || "/index-main.html";

    if (!code) {
      res.redirect(302, `/login?error=missing_code`);
      return;
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      // flowType: "implicit" → PKCE code_verifier 없이 서버 사이드에서 code 교환 가능
      const supabase = createClient(
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_ANON_KEY ?? "",
        { auth: { autoRefreshToken: false, persistSession: false, flowType: "implicit" } }
      );

      // code → session 교환 (implicit flow에서는 code가 아닌 access_token이 fragment로 옴)
      // Supabase implicit flow: callback URL에 #access_token=...&refresh_token=... 형태로 전달
      // 서버에서는 fragment를 읽을 수 없으므로 프론트엔드에서 처리하는 방식으로 변경
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
        const loginMethod =
          user.app_metadata?.provider ?? null;

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
}

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
        // 이메일로 기존 auth.users 조회 시도
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email === userInfo.email);

        if (existing) {
          authUserId = existing.id;
          // openId 메타데이터 업데이트
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            user_metadata: {
              ...existing.user_metadata,
              openId: userInfo.openId,
              full_name: userInfo.name || existing.user_metadata?.full_name,
            },
          });
        } else {
          // 신규 사용자 auth.users 등록
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
        // 이메일 없는 경우 openId를 email로 사용해 auth.users 등록
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
      // 이렇게 해야 sb-access-token / sb-refresh-token 쿠키가 설정되어 로그아웃이 정상 동작함
      try {
        const userEmail = userInfo.email || `${userInfo.openId}@manus-oauth.local`;
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseAnonClient = createClient(
          process.env.SUPABASE_URL ?? "",
          process.env.SUPABASE_ANON_KEY ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1) admin.generateLink로 token_hash 획득
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userEmail,
        });

        if (!linkError && linkData?.properties?.hashed_token) {
          // 2) verifyOtp로 실제 세션 생성
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

      // 로그인 후 returnPath로 리다이렉트 (없으면 홈으로)
      const returnPath = parseReturnPath(state);
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── Supabase Auth 이메일 로그인 엔드포인트 ───────────────────────────────────
  // POST /api/auth/email/signup
  app.post("/api/auth/email/signup", async (req: Request, res: Response) => {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    try {
      // 일반 사용자 가입: supabase.auth.signUp (anon key 사용)
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL ?? "";
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name ?? null },
        },
      });

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }

      if (!data.user) {
        res.status(400).json({ error: "Signup failed" });
        return;
      }

      // profiles 테이블에 upsert
      await db.upsertProfile({
        id: data.user.id,
        email,
        name: name ?? null,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // 이메일 확인이 필요한 경우 세션 없음
      if (!data.session) {
        res.json({ requiresEmailConfirmation: true });
        return;
      }

      // 세션이 있으면 쿠키 설정
      _setSupabaseCookies(res, data.session.access_token, data.session.refresh_token);
      res.json({ user: data.user, requiresEmailConfirmation: false });
    } catch (error) {
      console.error("[Auth] Email signup failed", error);
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // POST /api/auth/email/signin
  app.post("/api/auth/email/signin", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL ?? "";
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        res.status(401).json({ error: error.message });
        return;
      }

      if (!data.session || !data.user) {
        res.status(401).json({ error: "Login failed" });
        return;
      }

      // profiles 테이블 upsert (lastSignedIn 갱신)
      await db.upsertProfile({
        id: data.user.id,
        email: data.user.email ?? null,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      _setSupabaseCookies(res, data.session.access_token, data.session.refresh_token);
      res.json({ user: data.user });
    } catch (error) {
      console.error("[Auth] Email signin failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // POST /api/auth/refresh — refresh token으로 access token 갱신
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

  // POST /api/auth/signout — 로그아웃: refresh token 무효화 + 쿠키 삭제
  app.post("/api/auth/signout", async (req: Request, res: Response) => {
    const cookies = _parseCookies(req.headers.cookie);
    const accessToken = cookies["sb-access-token"];

    try {
      if (accessToken) {
        // refresh token 무효화 (scope: local — 현재 세션만 종료)
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.SUPABASE_URL ?? "";
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: cookies["sb-refresh-token"] ?? "",
        });
        await supabaseClient.auth.signOut({ scope: "local" });
      }
    } catch (e) {
      console.warn("[Auth] Supabase signOut error (non-fatal):", e);
    }

    // 쿠키 삭제
    // - COOKIE_NAME(app_session_id): getSessionCookieOptions 사용 (sameSite:none, 설정 시와 동일)
    // - sb-access-token / sb-refresh-token: _setSupabaseCookies와 동일한 sameSite:lax
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
    res.clearCookie(COOKIE_NAME, sessionCookieOptions); // Manus OAuth 쿠키 (sameSite:none)
    res.json({ ok: true });
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
