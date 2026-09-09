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
  skip: (req) => {
    // Health checks are probed frequently by ops and monitoring and must
    // never be throttled.
    if (req.path.startsWith("/v1/health")) return true;
    // The university logo is read on the public login screen (GET only). It is
    // still gated by the setup.read permission at the handler, so exempting it
    // from the global limiter leaks nothing while preventing a login-page
    // lockout.
    if (req.method === "GET" && req.path === "/v1/root/setup/logo") return true;
    return false;
  },
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
