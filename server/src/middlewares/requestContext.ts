import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// =============================================================================
// URS-DMS — request context middleware
// Attaches `req.context` (ip, ua) and a stable `req.id` correlation id for
// audit logging downstream. Also captures the request's own origin (scheme +
// host) and the correlation id in AsyncLocalStorage so service layers can:
//   * mint backend-relative file URLs that resolve to whichever host the
//     browser actually reached (localhost in dev, the remote tunnel domain —
//     never a hardcoded localhost or an exposed MinIO host), and
//   * stamp every audit event written during the request with the same
//     correlationId (audit.service.writeAudit defaults to it).
// An inbound X-Request-Id / X-Correlation-Id header (e.g. from a reverse
// proxy) is honored when it is a short, safe token; otherwise a UUID is
// generated. The resolved id is echoed back as the X-Request-Id response
// header so a client/proxy can correlate a response with its audit trail.
// =============================================================================

export interface RequestStore {
  origin: string;
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export function getRequestOrigin(): string | undefined {
  return storage.getStore()?.origin;
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Runs `fn` inside a fresh correlation context. Used by background workers so
 * audit events they emit inherit one stable `job:<queue>:<id>` correlation id
 * instead of writing NULL. Inherits the ambient origin when one exists.
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  const current = storage.getStore();
  return storage.run({ origin: current?.origin ?? "", requestId }, fn);
}

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function resolveRequestId(req: Request): string {
  const incoming = req.header("x-request-id") ?? req.header("x-correlation-id");
  if (incoming && SAFE_REQUEST_ID.test(incoming)) return incoming;
  return randomUUID();
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  // Prefer req.ip (reads X-Forwarded-For when trust proxy is configured).
  // This gives the real client public IP behind Traefik/load balancer.
  // Fall back to socket.remoteAddress for direct connections.
  const rawIp = req.ip ?? req.socket.remoteAddress ?? "unknown";

  // Strip IPv4-mapped IPv6 prefix (::ffff:a.b.c.d) from socket/proxy addresses
  const normalizedIp =
    typeof rawIp === "string" && rawIp.startsWith("::ffff:")
      ? rawIp.substring(7)
      : rawIp;

  req.context = {
    ipAddress: normalizedIp,
    userAgent: req.header("user-agent") ?? "",
  };
  const requestId = resolveRequestId(req);
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  const origin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
  storage.run({ origin, requestId }, () => next());
}
