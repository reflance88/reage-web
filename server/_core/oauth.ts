import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

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

      // DB 저장 실패 시에도 로그인은 계속 진행 (네트워크 차단 등 일시적 오류 대응)
      try {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
      } catch (dbError) {
        console.warn("[OAuth] DB upsert failed (non-fatal):", dbError);
        // DB 저장 실패해도 세션 발급은 계속 진행
      }

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
}
