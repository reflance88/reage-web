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
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
import * as db from "../db";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";
const ACCESS_MAX_AGE = 60 * 60;           // 1시간 (초)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)

function getCookieOptions(req: Request, maxAge: number) {
  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAge * 1000, // Express는 ms 단위
  };
}

export function registerEmailAuthRoutes(app: Express): void {
  // ── 회원가입 ────────────────────────────────────────────────────────────────
  app.post("/api/auth/email/signup", async (req: Request, res: Response) => {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
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
      await db.upsertProfile({
        id: user.id,
        email: user.email ?? null,
        name,
        openId: null,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // 이메일 확인 전이면 세션이 없을 수 있음 (confirmationRequired)
      const session = data.session;
      if (session) {
        res.cookie(ACCESS_COOKIE, session.access_token, getCookieOptions(req, ACCESS_MAX_AGE));
        res.cookie(REFRESH_COOKIE, session.refresh_token, getCookieOptions(req, REFRESH_MAX_AGE));
      }

      res.json({
        success: true,
        confirmationRequired: !session,
        userId: user.id,
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
      await db.upsertProfile({
        id: user.id,
        email: user.email ?? null,
        name: user.user_metadata?.full_name ?? null,
        openId: null,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // access token + refresh token 분리 쿠키 저장
      res.cookie(ACCESS_COOKIE, session.access_token, getCookieOptions(req, ACCESS_MAX_AGE));
      res.cookie(REFRESH_COOKIE, session.refresh_token, getCookieOptions(req, REFRESH_MAX_AGE));

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
      const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

      if (refreshToken) {
        // refresh token으로 세션 복원 후 서버 측 로그아웃 (scope: "global" = 모든 기기)
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: req.cookies?.[ACCESS_COOKIE] ?? "",
          refresh_token: refreshToken,
        });
        if (!sessionError) {
          await supabase.auth.signOut({ scope: "global" });
        }
      }

      // 쿠키 삭제 (maxAge: 0)
      const clearOptions = { ...getCookieOptions(req, 0), maxAge: 0 };
      res.clearCookie(ACCESS_COOKIE, clearOptions);
      res.clearCookie(REFRESH_COOKIE, clearOptions);

      res.json({ success: true });
    } catch (err) {
      console.error("[EmailAuth] signout error:", err);
      // 오류가 있어도 쿠키는 삭제
      res.clearCookie(ACCESS_COOKIE);
      res.clearCookie(REFRESH_COOKIE);
      res.json({ success: true });
    }
  });

  // ── 세션 갱신 ───────────────────────────────────────────────────────────────
  // refresh token → 새 access token + refresh token 발급
  app.post("/api/auth/email/refresh", async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (!refreshToken) {
      res.status(401).json({ error: "refresh token이 없습니다. 다시 로그인해 주세요." });
      return;
    }

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error || !data.session) {
        // refresh token 만료 또는 무효 → 쿠키 삭제 후 재로그인 요청
        res.clearCookie(ACCESS_COOKIE);
        res.clearCookie(REFRESH_COOKIE);
        res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해 주세요." });
        return;
      }

      const { session } = data;
      res.cookie(ACCESS_COOKIE, session.access_token, getCookieOptions(req, ACCESS_MAX_AGE));
      res.cookie(REFRESH_COOKIE, session.refresh_token, getCookieOptions(req, REFRESH_MAX_AGE));

      res.json({ success: true });
    } catch (err) {
      console.error("[EmailAuth] refresh error:", err);
      res.status(500).json({ error: "세션 갱신 중 오류가 발생했습니다." });
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
      console.error("[EmailAuth] admin create-user error:", err);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  });
}
