import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `${name} 환경변수가 설정되지 않았습니다.`);
  }
  return value;
}

export function createAdminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createRequestAuthClient(req: Request) {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });
}

export function getServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
