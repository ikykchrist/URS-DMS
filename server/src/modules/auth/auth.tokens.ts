import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — JWT helpers
// Access tokens carry `type: "access"`, refresh tokens carry `type: "refresh"`.
// Issuer + audience are enforced on every verification.
// =============================================================================

export interface AccessTokenPayload {
  sub: string; // userId
  roleId: string;
  roleName: string;
  sessionId: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // userId
  sessionId: string;
  type: "refresh";
}

function parseExpiry(input: string): number {
  // Supports "15m", "7d", "1h", "60s" — falls back to raw seconds if no unit.
  const m = /^(\d+)([smhd])?$/.exec(input.trim());
  if (!m || !m[1]) {
    const n = Number.parseInt(input, 10);
    if (Number.isFinite(n)) return n;
    return 900; // 15m fallback
  }
  const value = Number.parseInt(m[1], 10);
  const unit = m[2] ?? "s";
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      return value;
  }
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: parseExpiry(env.JWT_ACCESS_EXPIRES_IN),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: parseExpiry(env.JWT_REFRESH_EXPIRES_IN),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessTokenPayload;
  if (decoded.type !== "access") {
    throw new Error("Wrong token type");
  }
  return decoded;
}

export function verifyRefreshToken(_token: string): never {
  // Refresh tokens in this codebase are opaque random strings (not JWTs).
  // They are looked up by sha256 hash in the sessions table — see
  // `auth.service.ts → refresh()`. Calling this function is a bug.
  throw new Error("verifyRefreshToken is not used — opaque refresh tokens are sha256-lookup only");
}
