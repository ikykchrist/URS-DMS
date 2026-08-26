import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — signed file URL tokens
// Replaces browser-facing presigned MinIO URLs. File access now always flows
// through the Express backend (which streams to/from private MinIO), so MinIO
// never needs a public endpoint. The token IS the authorization: short-lived,
// single-purpose, bound to one object key. It is NOT an access token (the
// `type: "file"` discriminator makes it unusable as a Bearer credential).
// =============================================================================

export type FileTokenOp = "upload" | "download";

export interface FileTokenPayload {
  type: "file";
  op: FileTokenOp;
  k: string; // objectKey
  i?: 1; // download renders inline (preview)
}

const UPLOAD_TTL_SECONDS = 15 * 60;
const DOWNLOAD_TTL_SECONDS = 10 * 60;

function signOptions(expiresInSeconds: number): SignOptions {
  return {
    algorithm: "HS256",
    expiresIn: expiresInSeconds,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
}

export function signFileToken(
  op: FileTokenOp,
  objectKey: string,
  opts: { inline?: boolean } = {},
): string {
  const payload: FileTokenPayload = {
    type: "file",
    op,
    k: objectKey,
    ...(opts.inline ? { i: 1 as const } : {}),
  };
  const ttl = op === "upload" ? UPLOAD_TTL_SECONDS : DOWNLOAD_TTL_SECONDS;
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, signOptions(ttl));
}

export function verifyFileToken(token: string, expectedOp: FileTokenOp): FileTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as Partial<FileTokenPayload>;
  if (decoded.type !== "file" || decoded.op !== expectedOp || typeof decoded.k !== "string") {
    throw new Error("Invalid file token");
  }
  return decoded as FileTokenPayload;
}
