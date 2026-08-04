import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { securityLog } from "./server-logging";

export type LimitName = "admin-login" | "tracking" | "public-booking" | "public-consultation" | "public-order" | "public-testimonial";

const settings: Record<LimitName, { requests: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  "admin-login": { requests: 5, window: "1 m" },
  tracking: { requests: 5, window: "1 m" },
  "public-booking": { requests: 15, window: "1 m" },
  "public-consultation": { requests: 15, window: "1 m" },
  "public-order": { requests: 20, window: "1 m" },
  "public-testimonial": { requests: 5, window: "10 m" },
};

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;
const limiters = new Map<LimitName, Ratelimit>();

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function enforceRateLimit(request: Request, name: LimitName) {
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, status: 503, retryAfter: 60 };
    }
    return { success: true, status: 200, retryAfter: 0 };
  }
  let limiter = limiters.get(name);
  if (!limiter) {
    const rule = settings[name];
    limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(rule.requests, rule.window), prefix: `gailant:${name}`, analytics: true });
    limiters.set(name, limiter);
  }
  const result = await limiter.limit(requestIp(request));
  if (!result.success) {
    securityLog("rate_limit_triggered", { target: name, ip_hash: await hashIp(requestIp(request)) });
  }
  return { success: result.success, status: result.success ? 200 : 429, retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
}

async function hashIp(ip: string) {
  const bytes = new TextEncoder().encode(`${process.env.LOG_HASH_SALT || "gailant"}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map(value => value.toString(16).padStart(2, "0")).join("");
}

export function rateLimitResponse(result: { status: number; retryAfter: number }) {
  const unavailable = result.status === 503;
  return Response.json(
    { error: unavailable ? "This service is temporarily unavailable." : "Too many attempts. Please try again shortly." },
    { status: result.status, headers: { "retry-after": String(result.retryAfter), "cache-control": "no-store" } },
  );
}
