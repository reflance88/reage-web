import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다."
  );
}

/**
 * 프론트엔드 전용 Supabase client
 * - flowType 기본값(pkce)을 사용하여 PKCE 표준 흐름으로 OAuth 처리
 * - service_role 키 절대 사용 금지
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
