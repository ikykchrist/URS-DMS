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

/**
 * Checks if an IP address is internal/private (RFC 1918, RFC 4193, etc.)
 * so we skip proxy/Docker/Tailscale IPs when looking for the real client IP.
 */
function isInternalIp(ip: string): boolean {
  if (!ip) return true;
  // IPv4 private ranges
  if (/^127\./.test(ip)) return true; // loopback
  if (/^10\./.test(ip)) return true; // class A private
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true; // class B private
  if (/^192\.168\./.test(ip)) return true; // class C private
  if (/^::1$/.test(ip)) return true; // IPv6 loopback
  if (/^::ffff:127\./.test(ip)) return true; // IPv4-mapped loopback
  if (/^::ffff:10\./.test(ip)) return true; // IPv4-mapped class A
  if (/^::ffff:172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true; // IPv4-mapped class B
  if (/^::ffff:192\.168\./.test(ip)) return true; // IPv4-mapped class C
  if (/^fc00:/i.test(ip)) return true; // IPv6 unique local
  if (/^fe80:/i.test(ip)) return true; // IPv6 link-local
  return false;
}

function resolveRequestId(req: Request): string {
  const incoming = req.header("x-request-id") ?? req.header("x-correlation-id");
  if (incoming && SAFE_REQUEST_ID.test(incoming)) return incoming;
  return randomUUID();
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  // Extract real client IP from proxy headers (Traefik/Cloudflare/Nginx)
  // Order of preference:
  //   1. X-Real-IP       (Traefik/Nginx sets this to the direct client IP)
  //   2. CF-Connecting-IP (Cloudflare sets this to the visitor's IP)
  //   3. X-Forwarded-For  (comma-separated chain; rightmost = original client)
  //   4. req.ip           (Express built-in, reads X-Forwarded-For if trust proxy)
  //   5. req.socket.remoteAddress (direct TCP connection, may be proxy IP)
  const xRealIp = req.header("x-real-ip");
  const cfIp = req.header("cf-connecting-ip");
  const xForwardedFor = req.header("x-forwarded-for");

  let rawIp: string | undefined;

  if (xRealIp && !isInternalIp(xRealIp)) {
    rawIp = xRealIp.trim();
  } else if (cfIp && !isInternalIp(cfIp)) {
    rawIp = cfIp.trim();
  } else if (xForwardedFor) {
    // X-Forwarded-For: client, proxy1, proxy2 — take the leftmost non-internal IP
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    rawIp = ips.find((ip) => ip && !isInternalIp(ip)) ?? ips[0];
  } else {
    rawIp = req.ip ?? req.socket.remoteAddress ?? "unknown";
  }

  // Strip IPv4-mapped IPv6 prefix (::ffff:a.b.c.d)
  const normalizedIp: string =
    typeof rawIp === "string" && rawIp.startsWith("::ffff:")
      ? rawIp.substring(7)
      : rawIp ?? "unknown";

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
