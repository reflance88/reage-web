import { createClient, type Provider, type SupabaseClient } from "@supabase/supabase-js";

export type SocialProvider = "google" | "kakao";

type PublicAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const SOCIAL_AUTH_STORAGE_KEY = "reage-social-auth";

let authConfigPromise: Promise<PublicAuthConfig> | null = null;
let browserClientPromise: Promise<SupabaseClient> | null = null;

function sanitizeReturnTo(path: string | null | undefined, fallback: string = "/mypage") {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

function getSessionStorage() {
  return {
    getItem(key: string) {
      if (typeof window === "undefined") return null;
      return window.sessionStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem(key, value);
    },
    removeItem(key: string) {
      if (typeof window === "undefined") return;
      window.sessionStorage.removeItem(key);
    },
  };
}

async function getPublicAuthConfig(): Promise<PublicAuthConfig> {
  if (!authConfigPromise) {
    authConfigPromise = (async () => {
      const res = await fetch("/api/auth/public-config", {
        method: "GET",
        credentials: "omit",
      });
      const data = (await res.json()) as {
        error?: string;
        supabaseUrl?: string;
        supabaseAnonKey?: string;
      };

      if (!res.ok || !data.supabaseUrl || !data.supabaseAnonKey) {
        throw new Error(data.error || "Supabase 인증 설정을 불러오지 못했습니다.");
      }

      return {
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey,
      };
    })();
  }

  return authConfigPromise;
}

export async function getBrowserSupabaseAuthClient() {
  if (!browserClientPromise) {
    browserClientPromise = (async () => {
      const { supabaseUrl, supabaseAnonKey } = await getPublicAuthConfig();

      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          flowType: "pkce",
          persistSession: true,
          storage: getSessionStorage(),
          storageKey: SOCIAL_AUTH_STORAGE_KEY,
        },
      });
    })();
  }

  return browserClientPromise;
}

function buildOAuthRedirectTo(returnTo: string) {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", sanitizeReturnTo(returnTo));
  return url.toString();
}

export async function signInWithSocialProvider(provider: SocialProvider, returnTo: string) {
  const supabase = await getBrowserSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: buildOAuthRedirectTo(returnTo),
    },
  });

  if (error) {
    throw error;
  }
}

export async function finalizeSocialAuthSession(authCode: string, returnTo: string) {
  const supabase = await getBrowserSupabaseAuthClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

  if (error || !data.session) {
    throw new Error(error?.message || "소셜 로그인 세션 교환에 실패했습니다.");
  }

  const res = await fetch("/api/auth/email/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      returnTo: sanitizeReturnTo(returnTo),
    }),
  });
  const payload = (await res.json()) as { error?: string; returnTo?: string };

  if (!res.ok) {
    throw new Error(payload.error || "로그인 세션을 완료하지 못했습니다.");
  }

  return payload.returnTo || sanitizeReturnTo(returnTo);
}

export async function clearSocialAuthSession() {
  try {
    const supabase = await getBrowserSupabaseAuthClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore browser-side cleanup failures.
  }
}
