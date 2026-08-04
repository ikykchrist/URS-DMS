import type { Request, Response, NextFunction } from "express";
import type { RoleName } from "@prisma/client";
import { ForbiddenError } from "@/utils/errors";
import { AUDIT_ACTIONS } from "@/config/constants";
import { prisma } from "@/lib/prisma";

// =============================================================================
// URS-DMS — authorization middlewares (DB-backed, dynamic RBAC)
// NEVER hardcodes role names like `if (role === "admin")`.
// =============================================================================

export function requireRole(...allowed: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new ForbiddenError("Not authenticated"));
      return;
    }
    if (!allowed.includes(req.auth.roleName)) {
      // Audit permission denial (best-effort, don't block response)
      void prisma.auditLog.create({
        data: {
          userId: req.auth.userId,
          action: AUDIT_ACTIONS.PERMISSION_DENIED,
          entity: "route",
          entityId: req.originalUrl,
          ipAddress: req.context.ipAddress,
          userAgent: req.context.userAgent,
          newValue: {
            reason: "role_check_failed",
            requiredRoles: allowed,
            actualRole: req.auth.roleName,
          },
        },
      });
      next(new ForbiddenError(`Requires role: ${allowed.join(", ")}`));
      return;
    }
    next();
  };
}

export function requirePermission(...required: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) {
        next(new ForbiddenError("Not authenticated"));
        return;
      }
      const have = new Set(req.auth.permissions);
      const missing = required.filter((p) => !have.has(p));
      if (missing.length > 0) {
        await prisma.auditLog.create({
          data: {
            userId: req.auth.userId,
            action: AUDIT_ACTIONS.PERMISSION_DENIED,
            entity: "route",
            entityId: req.originalUrl,
            ipAddress: req.context.ipAddress,
            userAgent: req.context.userAgent,
            newValue: {
              reason: "permission_check_failed",
              required,
              missing,
            },
          },
        });
        next(new ForbiddenError(`Missing permission(s): ${missing.join(", ")}`));
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAnyPermission(...allowed: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.auth) {
        next(new ForbiddenError("Not authenticated"));
        return;
      }
      if (allowed.some((permission) => req.auth!.permissions.includes(permission))) {
        next();
        return;
      }
      await prisma.auditLog.create({
        data: {
          userId: req.auth.userId,
          action: AUDIT_ACTIONS.PERMISSION_DENIED,
          entity: "route",
          entityId: req.originalUrl,
          ipAddress: req.context.ipAddress,
          userAgent: req.context.userAgent,
          newValue: {
            reason: "any_permission_check_failed",
            allowed,
          },
        },
      });
      next(new ForbiddenError(`Requires one of: ${allowed.join(", ")}`));
    } catch (err) {
      next(err);
    }
  };
}
