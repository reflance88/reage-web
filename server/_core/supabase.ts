import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
}

const DUMMY_URL = "http://localhost:54321";
const DUMMY_KEY = "dummy-key-for-local-dev";

/**
 * 서버 전용 Supabase 클라이언트 (service_role key — RLS 우회)
 * 관리자 작업, 서버 사이드 데이터 조작에 사용
 */
export const supabaseAdmin = createClient(supabaseUrl || DUMMY_URL, supabaseServiceKey || DUMMY_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * 공개 Supabase 클라이언트 (anon key — RLS 적용)
 * 공개 데이터 조회에 사용
 */
export const supabasePublic = createClient(supabaseUrl || DUMMY_URL, supabaseAnonKey || DUMMY_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default supabaseAdmin;
