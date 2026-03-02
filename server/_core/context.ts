import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "../../shared/const";
import { jwtVerify } from "jose";
import { getUserByOpenId } from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * 이메일 로그인 시 발급되는 자체 JWT를 파싱합니다.
 * 페이로드에 { id, openId, role } 가 있으면 이메일 로그인 토큰으로 간주합니다.
 */
async function tryEmailJwt(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    // 간단한 쿠키 파서
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((part) => {
      const [k, ...v] = part.trim().split("=");
      if (k) cookies[k.trim()] = decodeURIComponent(v.join("="));
    });

    const token = cookies[COOKIE_NAME];
    if (!token) return null;

    const secret = new TextEncoder().encode(ENV.cookieSecret ?? process.env.JWT_SECRET ?? "secret");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    // 이메일 로그인 JWT 판별: id(number) + openId(string) + role 포함
    if (
      typeof payload.id !== "number" ||
      typeof payload.openId !== "string" ||
      !payload.role
    ) {
      return null;
    }

    // DB에서 최신 user 정보 조회 (role 변경 반영)
    const user = await getUserByOpenId(payload.openId as string);
    return user ?? null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1) 이메일 로그인 JWT 우선 시도
  user = await tryEmailJwt(opts.req);

  // 2) 실패 시 Manus OAuth 세션으로 폴백
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
