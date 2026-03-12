/**
 * ============================================================
 * 자체 서버용 소셜 OAuth 연동 헬퍼
 * ============================================================
 *
 * 사용 방법 (자체 서버 이전 시):
 * 1. 각 플랫폼에서 앱 등록 후 환경변수 설정:
 *    - KAKAO_CLIENT_ID       : 카카오 REST API 키
 *    - NAVER_CLIENT_ID       : 네이버 Client ID
 *    - NAVER_CLIENT_SECRET   : 네이버 Client Secret
 *    - GOOGLE_CLIENT_ID      : 구글 OAuth 2.0 Client ID
 *    - GOOGLE_CLIENT_SECRET  : 구글 OAuth 2.0 Client Secret
 *    - APP_BASE_URL          : 서비스 도메인 (예: https://reage.co.kr)
 *
 * 2. server/_core/index.ts에서 registerSocialOAuthRoutes(app) 호출
 *
 * 3. 프론트엔드에서 getSocialLoginUrl('kakao'|'naver'|'google') 사용
 *
 * 각 플랫폼 앱 등록 시 리다이렉트 URI:
 *    - 카카오: {APP_BASE_URL}/api/oauth/kakao/callback
 *    - 네이버: {APP_BASE_URL}/api/oauth/naver/callback
 *    - 구글:   {APP_BASE_URL}/api/oauth/google/callback
 * ============================================================
 */

import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// ─── 환경변수 ─────────────────────────────────────────────────────────────────
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID ?? "";
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────
interface SocialUserInfo {
  openId: string;       // 플랫폼 고유 ID (예: kakao_12345678)
  name: string | null;
  email: string | null;
  loginMethod: string;  // 'kakao' | 'naver' | 'google'
}

// ─── 카카오 OAuth ─────────────────────────────────────────────────────────────

/**
 * 카카오 로그인 시작 URL 생성
 * 카카오 개발자센터: https://developers.kakao.com
 * 앱 등록 후 REST API 키를 KAKAO_CLIENT_ID에 설정
 */
export function getKakaoAuthUrl(state: string): string {
  const redirectUri = `${APP_BASE_URL}/api/oauth/kakao/callback`;
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: "profile_nickname,account_email",
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

/**
 * 카카오 인가 코드로 액세스 토큰 교환
 */
async function exchangeKakaoCode(code: string, state: string): Promise<string> {
  const redirectUri = `${APP_BASE_URL}/api/oauth/kakao/callback`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Kakao] Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * 카카오 액세스 토큰으로 사용자 정보 조회
 */
async function getKakaoUserInfo(accessToken: string): Promise<SocialUserInfo> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`[Kakao] User info fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: number;
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string };
    };
  };

  return {
    openId: `kakao_${data.id}`,
    name: data.kakao_account?.profile?.nickname ?? null,
    email: data.kakao_account?.email ?? null,
    loginMethod: "kakao",
  };
}

// ─── 네이버 OAuth ─────────────────────────────────────────────────────────────

/**
 * 네이버 로그인 시작 URL 생성
 * 네이버 개발자센터: https://developers.naver.com
 * 앱 등록 후 Client ID/Secret을 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET에 설정
 */
export function getNaverAuthUrl(state: string): string {
  const redirectUri = `${APP_BASE_URL}/api/oauth/naver/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: NAVER_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

/**
 * 네이버 인가 코드로 액세스 토큰 교환
 */
async function exchangeNaverCode(code: string, state: string): Promise<string> {
  const redirectUri = `${APP_BASE_URL}/api/oauth/naver/callback`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: NAVER_CLIENT_ID,
    client_secret: NAVER_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
    state,
  });

  const res = await fetch("https://nid.naver.com/oauth2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Naver] Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * 네이버 액세스 토큰으로 사용자 정보 조회
 */
async function getNaverUserInfo(accessToken: string): Promise<SocialUserInfo> {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`[Naver] User info fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    response: {
      id: string;
      name?: string;
      email?: string;
    };
  };

  return {
    openId: `naver_${data.response.id}`,
    name: data.response.name ?? null,
    email: data.response.email ?? null,
    loginMethod: "naver",
  };
}

// ─── 구글 OAuth ───────────────────────────────────────────────────────────────

/**
 * 구글 로그인 시작 URL 생성
 * Google Cloud Console: https://console.cloud.google.com
 * OAuth 2.0 클라이언트 ID를 GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET에 설정
 */
export function getGoogleAuthUrl(state: string): string {
  const redirectUri = `${APP_BASE_URL}/api/oauth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * 구글 인가 코드로 액세스 토큰 교환
 */
async function exchangeGoogleCode(code: string): Promise<string> {
  const redirectUri = `${APP_BASE_URL}/api/oauth/google/callback`;
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[Google] Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * 구글 액세스 토큰으로 사용자 정보 조회
 */
async function getGoogleUserInfo(accessToken: string): Promise<SocialUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`[Google] User info fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: string;
    name?: string;
    email?: string;
  };

  return {
    openId: `google_${data.id}`,
    name: data.name ?? null,
    email: data.email ?? null,
    loginMethod: "google",
  };
}

// ─── 공통 세션 발급 헬퍼 ──────────────────────────────────────────────────────

/**
 * 소셜 사용자 정보로 DB upsert 후 세션 쿠키 발급
 */
async function issueSession(
  res: Response,
  req: Request,
  userInfo: SocialUserInfo
): Promise<void> {
  // auth.users에 소셜 사용자 등록 (없으면 생성, 있으면 조회)
  const { supabaseAdmin } = await import('./supabase');
  const lookupEmail = userInfo.email ?? `${userInfo.openId}@social-oauth.local`;
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u: { email?: string }) => u.email === lookupEmail);
  let authUserId: string;
  if (existing) {
    authUserId = existing.id;
  } else {
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: lookupEmail,
      user_metadata: { full_name: userInfo.name, openId: userInfo.openId },
      email_confirm: true,
    });
    if (createErr || !newUser?.user) throw new Error(`[Social] auth.users 생성 실패: ${createErr?.message}`);
    authUserId = newUser.user.id;
  }
  // profiles 테이블 upsert (auth.users.id를 PK로 사용)
  await db.upsertProfile({
    id: authUserId,
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod,
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(userInfo.openId, {
    name: userInfo.name || "",
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

/**
 * state에서 returnPath 파싱
 */
function parseReturnPath(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded) as { returnPath?: string };
      if (parsed.returnPath) return parsed.returnPath;
    }
    return "/";
  } catch {
    return "/";
  }
}

// ─── Express 라우트 등록 ──────────────────────────────────────────────────────

/**
 * 소셜 로그인 라우트 등록
 *
 * 등록되는 라우트:
 *   GET /api/oauth/kakao          → 카카오 로그인 시작 (리다이렉트)
 *   GET /api/oauth/kakao/callback → 카카오 콜백 처리
 *   GET /api/oauth/naver          → 네이버 로그인 시작 (리다이렉트)
 *   GET /api/oauth/naver/callback → 네이버 콜백 처리
 *   GET /api/oauth/google         → 구글 로그인 시작 (리다이렉트)
 *   GET /api/oauth/google/callback → 구글 콜백 처리
 *
 * 사용 방법: server/_core/index.ts에서 registerSocialOAuthRoutes(app) 호출
 */
export function registerSocialOAuthRoutes(app: Express): void {
  // ── 카카오 ──────────────────────────────────────────────────────────────────
  app.get("/api/oauth/kakao", (req: Request, res: Response) => {
    const returnPath = (req.query.returnPath as string) || "/";
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64");
    res.redirect(302, getKakaoAuthUrl(state));
  });

  app.get("/api/oauth/kakao/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const accessToken = await exchangeKakaoCode(code, state);
      const userInfo = await getKakaoUserInfo(accessToken);
      await issueSession(res, req, userInfo);
      res.redirect(302, parseReturnPath(state));
    } catch (error) {
      console.error("[OAuth/Kakao] Callback failed", error);
      res.redirect(302, "/login?error=kakao_failed");
    }
  });

  // ── 네이버 ──────────────────────────────────────────────────────────────────
  app.get("/api/oauth/naver", (req: Request, res: Response) => {
    const returnPath = (req.query.returnPath as string) || "/";
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64");
    res.redirect(302, getNaverAuthUrl(state));
  });

  app.get("/api/oauth/naver/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const accessToken = await exchangeNaverCode(code, state);
      const userInfo = await getNaverUserInfo(accessToken);
      await issueSession(res, req, userInfo);
      res.redirect(302, parseReturnPath(state));
    } catch (error) {
      console.error("[OAuth/Naver] Callback failed", error);
      res.redirect(302, "/login?error=naver_failed");
    }
  });

  // ── 구글 ────────────────────────────────────────────────────────────────────
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const returnPath = (req.query.returnPath as string) || "/";
    const state = Buffer.from(JSON.stringify({ returnPath })).toString("base64");
    res.redirect(302, getGoogleAuthUrl(state));
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const accessToken = await exchangeGoogleCode(code);
      const userInfo = await getGoogleUserInfo(accessToken);
      await issueSession(res, req, userInfo);
      res.redirect(302, parseReturnPath(state));
    } catch (error) {
      console.error("[OAuth/Google] Callback failed", error);
      res.redirect(302, "/login?error=google_failed");
    }
  });
}
