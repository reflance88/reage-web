import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Profile } from "../../drizzle/schema-pg";
import { sdk } from "./sdk";
import { COOKIE_NAME, SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "../../shared/const";
import { getProfileById, getProfileByOpenId, upsertProfile } from "../db";
import { supabaseAdmin } from "./supabase";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Profile | null;
};

/**
 * 쿠키에서 값을 파싱합니다.
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
  });
  return cookies;
}

/**
 * Supabase Auth access token으로 사용자를 검증합니다.
 * profiles 테이블에서 auth.users.id 기준으로 조회합니다.
 */
async function trySupabaseAuth(
  req: CreateExpressContextOptions["req"]
): Promise<Profile | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const accessToken = cookies[SB_ACCESS_COOKIE];
    if (!accessToken) return null;

    // Supabase Admin으로 토큰 검증 (getUser는 항상 서버에서 검증)
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) return null;

    // profiles 테이블에서 조회
    const profile = await getProfileById(data.user.id);
    if (profile) return profile;

    // profiles에 없으면 자동 생성 (최초 소셜 로그인 등)
    const email = data.user.email ?? null;
    const name = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null;
    const loginMethod = data.user.app_metadata?.provider ?? null;

    await upsertProfile({
      id: data.user.id,
      email,
      name,
      loginMethod,
      lastSignedIn: new Date(),
    });

    return await getProfileById(data.user.id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Manus OAuth JWT 쿠키(COOKIE_NAME)로 사용자를 검증합니다.
 * Supabase Auth 전환 기간 동안 폴백으로 사용합니다.
 * 최종 구조에서는 이 폴백을 제거하고 Supabase 세션만 사용합니다.
 */
async function tryManusOAuthFallback(
  req: CreateExpressContextOptions["req"]
): Promise<Profile | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;

    const session = await sdk.verifySession(sessionCookie);
    if (!session?.openId) return null;

    const profile = await getProfileByOpenId(session.openId);
    if (profile) {
      // lastSignedIn 갱신
      await upsertProfile({ id: profile.id, openId: session.openId, lastSignedIn: new Date() });
      return await getProfileById(profile.id) ?? null;
    }

    // profiles에 없으면 OAuth 서버에서 정보 가져와 생성
    try {
      const userInfo = await sdk.getUserInfoWithJwt(sessionCookie);
      if (!userInfo.openId) return null;

      // Supabase Admin으로 auth.users에 등록
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userInfo.email ?? undefined,
        user_metadata: { full_name: userInfo.name, openId: userInfo.openId },
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error("[Auth] Failed to create auth.users entry:", authError);
        return null;
      }

      await upsertProfile({
        id: authData.user.id,
        openId: userInfo.openId,
        email: userInfo.email ?? null,
        name: userInfo.name ?? null,
        loginMethod: userInfo.loginMethod ?? null,
        lastSignedIn: new Date(),
      });

      return await getProfileById(authData.user.id) ?? null;
    } catch (error) {
      console.error("[Auth] Failed to sync user from Manus OAuth:", error);
      return null;
    }
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: Profile | null = null;

  // 1) Supabase Auth access token 우선 시도
  user = await trySupabaseAuth(opts.req);

  // 2) 실패 시 Manus OAuth 세션으로 폴백 (전환 기간 한정)
  if (!user) {
    user = await tryManusOAuthFallback(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
