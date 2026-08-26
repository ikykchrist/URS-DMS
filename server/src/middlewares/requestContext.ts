import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

// =============================================================================
// URS-DMS — request context middleware
// Attaches `req.context` (ip, ua) for audit logging downstream. Also captures
// the request's own origin (scheme + host) in AsyncLocalStorage so service
// layers can mint backend-relative file URLs that resolve to whichever host
// the browser actually reached (localhost in dev, the ngrok domain remotely —
// never a hardcoded localhost or an exposed MinIO host).
// =============================================================================

export interface RequestStore {
  origin: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export function getRequestOrigin(): string | undefined {
  return storage.getStore()?.origin;
}

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  req.context = {
    ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
    userAgent: req.header("user-agent") ?? "",
  };
  const origin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
  storage.run({ origin }, () => next());
}
