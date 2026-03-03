export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * 자체 서버 이전 시 사용하는 소셔 로그인 URL 생성 함수
 *
 * 사용 방법:
 *   window.location.href = getSocialLoginUrl('kakao');
 *   window.location.href = getSocialLoginUrl('naver', '/mypage');
 *   window.location.href = getSocialLoginUrl('google');
 *
 * 자체 서버에서 활성화하려면:
 *   1. 서버 .env에 KAKAO_CLIENT_ID, NAVER_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, APP_BASE_URL 설정
 *   2. 로그인 페이지에서 getLoginUrl() 대신 getSocialLoginUrl('kakao') 사용
 */
export const getSocialLoginUrl = (
  provider: 'kakao' | 'naver' | 'google',
  returnPath: string = '/'
): string => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({ returnPath });
  return `${baseUrl}/api/oauth/${provider}?${params.toString()}`;
};
