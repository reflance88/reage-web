import type { Request, RequestHandler } from "express";
import { consumeRequestRateLimit } from "../db";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const APP_BASE_URL = process.env.APP_BASE_URL ?? "";
const SENSITIVE_TRPC_PROCEDURES = new Set([
  "auth.findEmail",
  "auth.requestPasswordReset",
  "auth.resetPassword",
  "auth.logout",
  "order.create",
  "order.verify",
  "order.fail",
  "order.cancel",
  "order.cancelByUser",
]);

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
  match?: (req: Request) => boolean;
  bucket?: (req: Request) => string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const loggedRateLimitFallbacks = new Set<string>();

function getFirstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getClientIp(req: Request) {
  const forwardedFor = getFirstHeaderValue(req.headers["x-forwarded-for"]);
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getRequestOrigin(req: Request) {
  const forwardedProto = getFirstHeaderValue(req.headers["x-forwarded-proto"]);
  const forwardedHost = getFirstHeaderValue(req.headers["x-forwarded-host"]);
  const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol || "http";
  const host = forwardedHost?.split(",")[0]?.trim() || req.get("host");
  return host ? `${protocol}://${host}` : null;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getTrustedOrigins(req: Request) {
  return new Set(
    [APP_BASE_URL, getRequestOrigin(req)]
      .map(origin => normalizeOrigin(origin ?? undefined))
      .filter((origin): origin is string => Boolean(origin))
  );
}

function getOriginCandidate(req: Request) {
  const origin = getFirstHeaderValue(req.headers.origin);
  if (origin) return origin;

  const referer = getFirstHeaderValue(req.headers.referer);
  return referer ?? undefined;
}

function getTrpcProcedures(req: Request) {
  const fromPath = req.path.replace(/^\/+/, "");
  const path = fromPath && fromPath !== "/" ? fromPath : (() => {
    const [, tail = ""] = (req.originalUrl || req.url).split("/api/trpc/");
    return tail.split("?")[0] ?? "";
  })();

  if (!path) return [];

  return path
    .split(",")
    .map(segment => segment.split("?")[0]?.trim())
    .filter((segment): segment is string => Boolean(segment));
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function createRateLimiter(options: RateLimitOptions): RequestHandler {
  return async (req, res, next) => {
    if (options.match && !options.match(req)) {
      next();
      return;
    }

    const key = `${options.keyPrefix}:${getClientIp(req)}:${options.bucket?.(req) ?? req.path}`;

    try {
      const result = await consumeRequestRateLimit({
        bucketKey: key,
        windowMs: options.windowMs,
        max: options.max,
      });

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfterSeconds);
        res.status(429).json({ error: options.message });
        return;
      }

      next();
      return;
    } catch (error) {
      if (!loggedRateLimitFallbacks.has(options.keyPrefix)) {
        loggedRateLimitFallbacks.add(options.keyPrefix);
        console.warn(`[RateLimit] Falling back to in-memory bucket for ${options.keyPrefix}:`, error);
      }
    }

    const now = Date.now();
    cleanupExpiredBuckets(now);

    const current = rateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({ error: options.message });
      return;
    }

    current.count += 1;
    next();
  };
}

export const csrfProtection: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (!req.headers.cookie) {
    next();
    return;
  }

  const secFetchSite = getFirstHeaderValue(req.headers["sec-fetch-site"]);
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite)) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }

  const trustedOrigins = getTrustedOrigins(req);
  const origin = normalizeOrigin(getOriginCandidate(req));
  if (!origin || !trustedOrigins.has(origin)) {
    res.status(403).json({ error: "Invalid request origin" });
    return;
  }

  next();
};

export const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});

export const sensitiveTrpcRateLimit = createRateLimiter({
  keyPrefix: "trpc-sensitive",
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  match: (req) => {
    if (SAFE_METHODS.has(req.method)) return false;
    return getTrpcProcedures(req).some(procedure => SENSITIVE_TRPC_PROCEDURES.has(procedure));
  },
  bucket: (req) => {
    const procedures = getTrpcProcedures(req)
      .filter(procedure => SENSITIVE_TRPC_PROCEDURES.has(procedure))
      .sort();
    return procedures.join(",");
  },
});
