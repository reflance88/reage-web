type EdgeFunctionUser = {
  id: string;
  role?: string | null;
};

type InvokeEdgeFunctionOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  user?: EdgeFunctionUser;
  serviceRole?: boolean;
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export class SupabaseEdgeFunctionError extends Error {
  status: number;
  fallbackEligible: boolean;

  constructor(message: string, options: { status?: number; fallbackEligible?: boolean } = {}) {
    super(message);
    this.name = "SupabaseEdgeFunctionError";
    this.status = options.status ?? 500;
    this.fallbackEligible = options.fallbackEligible ?? false;
  }
}

function buildFunctionUrl(path: string) {
  if (!SUPABASE_URL) {
    throw new SupabaseEdgeFunctionError("SUPABASE_URL이 설정되지 않았습니다.", {
      status: 503,
      fallbackEligible: true,
    });
  }

  return `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${path.replace(/^\//, "")}`;
}

async function readJsonPayload(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

function isFallbackEligibleStatus(status: number) {
  return status === 401 || status === 404 || status >= 500;
}

export async function invokeSupabaseEdgeFunction<T = unknown>(
  path: string,
  options: InvokeEdgeFunctionOptions = {},
) {
  const headers = new Headers(options.headers);
  const method = options.method ?? "POST";

  if (options.user || options.serviceRole) {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new SupabaseEdgeFunctionError("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.", {
        status: 503,
        fallbackEligible: true,
      });
    }
    headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  }

  if (options.user) {
    headers.set("x-user-id", options.user.id);
    headers.set("x-user-role", options.user.role ?? "user");
  }

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildFunctionUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new SupabaseEdgeFunctionError(
      error instanceof Error ? error.message : "Supabase Edge Function 호출에 실패했습니다.",
      { status: 503, fallbackEligible: true },
    );
  }

  const payload = await readJsonPayload(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Supabase Edge Function 호출 실패 (${response.status})`;

    throw new SupabaseEdgeFunctionError(message, {
      status: response.status,
      fallbackEligible: isFallbackEligibleStatus(response.status),
    });
  }

  return payload as T;
}

export function shouldFallbackFromEdgeFunction(error: unknown) {
  if (error instanceof SupabaseEdgeFunctionError) {
    return error.fallbackEligible;
  }

  return error instanceof TypeError;
}
