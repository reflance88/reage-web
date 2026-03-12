export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 로그인 페이지로 이동 (Supabase OAuth 기반 — Manus OAuth 제거)
export const getLoginUrl = (returnPath?: string) => {
  if (returnPath) {
    return `/login?returnTo=${encodeURIComponent(returnPath)}`;
  }
  return '/login';
};

/**
 * Supabase OAuth 소셜 로그인 URL 생성 함수 (Google / Kakao)
 */
export const getSocialLoginUrl = (
  provider: 'kakao' | 'google',
  returnPath: string = '/'
): string => {
  return `/api/auth/social/${provider}?returnTo=${encodeURIComponent(returnPath)}`;
};
