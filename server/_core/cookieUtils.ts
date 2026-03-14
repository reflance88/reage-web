/**
 * 쿠키 파싱 유틸리티
 * cookie-parser 미들웨어 없이 req.headers.cookie를 수동으로 파싱합니다.
 */

/**
 * Cookie 헤더 문자열을 파싱하여 key-value 맵으로 반환합니다.
 * @param cookieHeader - req.headers.cookie 값
 * @returns 쿠키 이름 → 값 맵
 */
export function parseCookiesFromHeader(
  cookieHeader: string | undefined
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (k) {
      try {
        cookies[k.trim()] = decodeURIComponent(v.join("="));
      } catch {
        cookies[k.trim()] = v.join("=");
      }
    }
  });
  return cookies;
}
