import { COOKIE_NAME, ONE_YEAR_MS, SB_REFRESH_COOKIE } from "@shared/const";
import { createClient } from "@supabase/supabase-js";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { findAuthUserByEmail, parseReturnPathState, signOutAuthSession } from "./authSession";
import { getSessionCookieOptions, parseCookies } from "./cookies";
import { sdk } from "./sdk";
import { supabaseAdmin } from "./supabase";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
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
        const existing = await findAuthUserByEmail(userInfo.email);

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
        const existing = await findAuthUserByEmail(fakeEmail);

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
      const returnPath = parseReturnPathState(state);
      res.redirect(302, returnPath);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // POST /api/auth/refresh — refresh token으로 access token 갱신
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies[SB_REFRESH_COOKIE];
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    try {
      const supabaseUrl = process.env.SUPABASE_URL ?? "";
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await anonClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) {
        res.status(401).json({ error: "Session refresh failed" });
        return;
      }
      _setSupabaseCookies(req, res, data.session.access_token, data.session.refresh_token);
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] Refresh failed", error);
      res.status(500).json({ error: "Refresh failed" });
    }
  });

  // POST /api/auth/signout — 로그아웃: refresh token 무효화 + 쿠키 삭제
  app.post("/api/auth/signout", async (req: Request, res: Response) => {
    try {
      await signOutAuthSession(req, res);
    } catch (e) {
      console.warn("[Auth] Supabase signOut error (non-fatal):", e);
    }
    res.json({ ok: true });
  });
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

function _setSupabaseCookies(req: Request, res: Response, accessToken: string, refreshToken: string) {
  const cookieBase = getSessionCookieOptions(req);
  // access token: 1시간
  res.cookie("sb-access-token", accessToken, { ...cookieBase, maxAge: 60 * 60 * 1000 });
  // refresh token: 1년
  res.cookie("sb-refresh-token", refreshToken, { ...cookieBase, maxAge: 365 * 24 * 60 * 60 * 1000 });
}
