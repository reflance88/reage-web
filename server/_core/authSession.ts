import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";
import type { Profile } from "../../drizzle/schema-pg";
import { COOKIE_NAME, SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "../../shared/const";
import { getProfileById, getProfileByOpenId } from "../db";
import { parseCookies, getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { supabaseAdmin } from "./supabase";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export function sanitizeReturnPath(returnPath: string | null | undefined): string {
  if (!returnPath) return "/";

  const trimmed = returnPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";

  return trimmed;
}

export function parseReturnPathState(state: string): string {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");

    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded) as { returnPath?: string };
      return sanitizeReturnPath(parsed.returnPath);
    }
  } catch {
    return "/";
  }

  return "/";
}

export async function findAuthUserByEmail(email: string) {
  const perPage = 200;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find(user => user.email === email);
    if (found) return found;

    if (data.users.length < perPage) return null;
  }
}

async function getSupabaseProfileFromRequest(req: Request): Promise<Profile | null> {
  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies[SB_ACCESS_COOKIE];
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return (await getProfileById(data.user.id)) ?? null;
}

async function getManusProfileFromRequest(req: Request): Promise<Profile | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;

  const session = await sdk.verifySession(sessionCookie);
  if (!session?.openId) return null;

  return (await getProfileByOpenId(session.openId)) ?? null;
}

export async function getAuthenticatedProfileFromRequest(req: Request): Promise<Profile | null> {
  const supabaseProfile = await getSupabaseProfileFromRequest(req);
  if (supabaseProfile) return supabaseProfile;

  return getManusProfileFromRequest(req);
}

export async function requireAdminRequest(req: Request): Promise<Profile> {
  const profile = await getAuthenticatedProfileFromRequest(req);
  if (!profile) {
    throw new Error("UNAUTHORIZED");
  }
  if (profile.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return profile;
}

export function clearAuthCookies(req: Request, res: Response) {
  const cookieOptions = { ...getSessionCookieOptions(req), maxAge: 0 };
  res.clearCookie(SB_ACCESS_COOKIE, cookieOptions);
  res.clearCookie(SB_REFRESH_COOKIE, cookieOptions);
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export async function signOutAuthSession(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const accessToken = cookies[SB_ACCESS_COOKIE];
  const refreshToken = cookies[SB_REFRESH_COOKIE];

  try {
    if (accessToken && refreshToken && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!sessionError) {
        await supabaseClient.auth.signOut({ scope: "global" });
      }
    }
  } catch (error) {
    console.warn("[Auth] Supabase signOut error (non-fatal):", error);
  }

  clearAuthCookies(req, res);
}
