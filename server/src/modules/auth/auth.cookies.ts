import type { Response } from "express";
import { env } from "@/config/env";
import { COOKIE_NAMES } from "@/config/constants";

// =============================================================================
// URS-DMS — refresh token cookie helpers
// Sprint 1 cookie spec (docs/security.md): httpOnly always, secure in prod,
// sameSite from env, path scoped to /api/v1/auth so it isn't sent elsewhere.
// =============================================================================

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAMES.REFRESH, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d — matches refresh token expiry
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAMES.REFRESH, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    path: "/api/v1/auth",
  });
}
