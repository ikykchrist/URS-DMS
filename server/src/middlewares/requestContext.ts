import type { Request, Response, NextFunction } from "express";

// =============================================================================
// URS-DMS — request context middleware
// Attaches `req.context` (ip, ua) for audit logging downstream.
// =============================================================================

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  req.context = {
    ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
    userAgent: req.header("user-agent") ?? "",
  };
  next();
}
