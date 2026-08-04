import crypto from "node:crypto";

// =============================================================================
// URS-DMS — sha256 hex hash for refresh tokens (stored in Session.refreshTokenHash)
// We never store the raw refresh token.
// =============================================================================

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
