import { HttpError } from "./http.ts";
import { getServiceRoleKey } from "./supabase.ts";

export function requireServiceRoleAuthorization(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization 헤더가 필요합니다.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token !== getServiceRoleKey()) {
    throw new HttpError(401, "내부 호출 인증에 실패했습니다.");
  }
}
