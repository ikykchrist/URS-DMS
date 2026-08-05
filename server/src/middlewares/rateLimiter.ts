import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — rate limiters
// globalLimiter: 100 req / 15 min per IP
// authLimiter:   5 req / 15 min per IP, doesn't count successful requests
// =============================================================================

export const globalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." },
  },
});

export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, res) => res.statusCode < 400,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many auth attempts, please try again later." },
  },
});
