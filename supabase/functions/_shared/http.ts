export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id, x-user-role, x-webhook-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return jsonResponse({ error: message }, 500);
}

export async function parseJsonBody<T>(req: Request) {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "JSON 요청 본문이 올바르지 않습니다.");
  }
}

export function getFunctionPath(req: Request, functionName: string) {
  const pathname = new URL(req.url).pathname;
  const prefixes = [`/functions/v1/${functionName}`, `/${functionName}`];

  for (const prefix of prefixes) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length);
    }
  }

  return pathname;
}
