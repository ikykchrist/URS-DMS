import { prisma } from "@/lib/prisma";

// =============================================================================
// URS-DMS — password recovery repository (Sprint 8.2)
// Only token HASHES are ever stored or queried; the plaintext token lives
// solely in the reset email and in memory during a reset request.
// =============================================================================

export interface CreateResetTokenArgs {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export function createResetToken(args: CreateResetTokenArgs) {
  return prisma.passwordResetToken.create({
    data: {
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
    },
    select: { id: true },
  });
}

/** Finds an unused, unexpired token by its hash. */
export function findValidByHash(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true, createdAt: true },
  });
}

/** Marks a token consumed (single-use). */
export function markUsed(id: string) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
    select: { id: true },
  });
}

/** Invalidates every other outstanding token for the user. */
export function invalidateOutstanding(userId: string, exceptId?: string) {
  return prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { usedAt: new Date() },
  });
}

/** Revokes every active refresh session for the account. */
export function revokeAllSessions(userId: string) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
