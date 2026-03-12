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

    // 쿠키 삭제 (access token은 만료까지 유효하지만 refresh token 무효화로 갱신 불가)
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie("sb-access-token", cookieOptions);
    res.clearCookie("sb-refresh-token", cookieOptions);
    res.clearCookie(COOKIE_NAME, cookieOptions); // Manus OAuth 쿠키도 함께 삭제
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
