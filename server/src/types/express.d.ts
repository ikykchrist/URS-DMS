import type { RoleName } from "@prisma/client";

// =============================================================================
// URS-DMS — Express type augmentation
// Adds `req.auth`, `req.id`, and `req.context` to every request.
// =============================================================================

declare global {
  namespace Express {
    interface AuthContext {
      userId: string;
      roleId: string;
      roleName: RoleName;
      sessionId: string;
      permissions: string[];
    }

    interface RequestContext {
      ipAddress: string;
      userAgent: string;
    }

    interface Request {
      id: string;
      auth?: AuthContext;
      context: RequestContext;
    }
  }
}

export {};
