import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "@/modules/auth/auth.tokens";
import { prisma } from "@/lib/prisma";
import { TokenInvalidError, TokenExpiredError } from "@/utils/errors";

// =============================================================================
// URS-DMS — authenticate middleware
// Verifies the access JWT (Authorization: Bearer or `urs_access_token` cookie),
// confirms the session is still valid, and attaches `req.auth`.
// =============================================================================

function extractToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.urs_access_token;
  return cookie ?? null;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new TokenInvalidError("Missing access token");
    }

    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof Error && err.name === "TokenExpiredError") {
        throw new TokenExpiredError();
      }
      throw new TokenInvalidError();
    }

    // Confirm session is still active (not revoked, not expired)
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, revokedAt: true, expiresAt: true, userId: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new TokenInvalidError("Session is no longer valid");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        roleId: true,
        status: true,
        role: { select: { name: true } },
      },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new TokenInvalidError("User is not active");
    }

    const permissions = await prisma.permission.findMany({
      where: { roles: { some: { roleId: user.roleId } } },
      select: { code: true },
    });

    req.auth = {
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      sessionId: session.id,
      permissions: permissions.map((p) => p.code),
    };
    next();
  } catch (err) {
    next(err);
  }
}
