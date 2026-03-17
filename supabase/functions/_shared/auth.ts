import { HttpError } from "./http.ts";
import { createAdminClient, createRequestAuthClient, getServiceRoleKey } from "./supabase.ts";

export type RequestActor = {
  userId: string;
  role: string | null;
  source: "internal" | "jwt";
};

export async function resolveRequestActor(req: Request): Promise<RequestActor> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authorization 헤더가 필요합니다.");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpError(401, "Authorization 토큰이 비어 있습니다.");
  }

  if (token === getServiceRoleKey()) {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      throw new HttpError(401, "내부 호출에는 x-user-id 헤더가 필요합니다.");
    }

    return {
      userId,
      role: req.headers.get("x-user-role"),
      source: "internal",
    };
  }

  const authClient = createRequestAuthClient(req);
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "유효한 사용자 세션이 아닙니다.");
  }

  return {
    userId: data.user.id,
    role: null,
    source: "jwt",
  };
}

export async function requireAdminRole(actor: RequestActor) {
  if (actor.role === "admin") return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", actor.userId)
    .maybeSingle<{ role: string | null }>();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (data?.role !== "admin") {
    throw new HttpError(403, "관리자만 요청할 수 있습니다.");
  }
}
