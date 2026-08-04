import argon2 from "argon2";
import { env } from "@/config/env";
import { PasswordTooWeakError } from "@/utils/errors";

// =============================================================================
// URS-DMS — Argon2id password hashing
// OWASP-recommended. ~250ms per hash on modern hardware.
// =============================================================================

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB (OWASP minimum for argon2id, 2023+)
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  if (password.length < env.PASSWORD_MIN_LENGTH) {
    throw new PasswordTooWeakError(
      `Password must be at least ${env.PASSWORD_MIN_LENGTH} characters long`,
    );
  }
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Malformed hash → treat as failed verification (don't leak info)
    return false;
  }
}
