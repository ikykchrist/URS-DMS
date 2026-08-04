# Security

This document explains every security decision in the URS-DMS backend,
why it was made, and how to verify it's working. Sprint 1 lays the
foundation; Sprint 2+ adds auth endpoints that build on it.

## Threat model

URS-DMS is an **internal university document management system**.
Realistic threats:

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Brute-force login | High | Account takeover | Rate limit on auth endpoints, Argon2id cost (memory=19 MiB / time=2) |
| Cross-site scripting (XSS) | Medium | Session theft | `helmet` CSP, httpOnly cookies, React auto-escaping |
| Cross-site request forgery (CSRF) | Medium | Unauthorized actions | SameSite cookies, CORS allowlist |
| SQL injection | Low | Data breach | Prisma (parameterized queries only) |
| Token theft via MITM | Low | Session impersonation | HTTPS in production, `secure` cookies |
| Insider abuse | Medium | Data leak | Audit log (Sprint 2+), least-privilege roles |
| DDoS | Medium | Service unavailable | Rate limiter (express-rate-limit) |
| Dependency vulnerabilities | High | Various | Dependabot (GitHub), `npm audit` in CI |
| Path traversal | Low | Arbitrary file read | Whitelist object keys, no `req.params` in fs ops |
| Object storage leak | Medium | Document exposure | Private bucket, presigned URLs only (Sprint 2+) |

## Security headers (`helmet`)

`helmet` is mounted first in the middleware pipeline
(`server/src/app.ts`). It sets these response headers by default:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-DNS-Prefetch-Control` | `off` | Don't leak DNS lookups |
| `X-Download-Options` | `noopen` | IE-only: prevent download execution |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restrict Flash/PDF cross-domain |
| `X-XSS-Protection` | `0` | Disabled (rely on CSP) |
| `Strict-Transport-Security` | enabled in prod | Force HTTPS |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` (overridden) | Allow our client |
| `Origin-Agent-Cluster` | `?1` | Window isolation |
| `Referrer-Policy` | `no-referrer` | Don't leak URLs |
| `Content-Security-Policy` | default | XSS protection |

We override `crossOriginResourcePolicy` to `cross-origin` so the
client can load static assets (avatars, document thumbnails) from
MinIO presigned URLs in future sprints.

To inspect, after a request:

```bash
curl -I http://localhost:4000/api/v1/health
```

## CORS

Configured in `server/src/app.ts`:

```ts
cors({
  origin: env.CLIENT_URL,        // single origin from env
  credentials: true,              // allow cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
})
```

Why single-origin?
- The browser sends an `Origin` header. We allow only the configured
  `CLIENT_URL`. Mismatched origins get a CORS rejection.
- Wildcard origins are incompatible with `credentials: true` (per spec).

For multi-client setups (e.g., admin app at a different URL), use a
function-based origin (Sprint 2+):

```ts
origin: (origin, cb) => {
  if ([env.CLIENT_URL, env.ADMIN_URL].includes(origin)) cb(null, true);
  else cb(new Error("Not allowed by CORS"));
}
```

## Rate limiting

Global limit (`server/src/middlewares/rateLimiter.ts`):

```ts
rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                    // 100 requests per window per IP
  standardHeaders: true,       // RateLimit-* headers
  legacyHeaders: false,
  ...
})
```

Mounted **after** `/health` so health checks never 429.

Auth-specific limit (`authRateLimiter`): 5 attempts / 15 min, with
`skipSuccessfulRequests: true` so legitimate logins don't count.

Response on 429:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests, please try again later."
  }
}
```

## Environment validation

`server/src/config/env.ts` validates every environment variable at
boot via Zod. Missing or invalid values cause `process.exit(1)` with
a detailed error log.

This is intentional "fail fast" behavior — we never want the server
running with a half-configured environment.

Critical rules:

- `JWT_ACCESS_SECRET` must be at least 32 characters
- `JWT_REFRESH_SECRET` must be at least 32 characters
- `DATABASE_URL` must be a valid PostgreSQL URL
- `COOKIE_SECURE` should be `true` in production

## Request validation

Every route that accepts input uses Zod via
`server/src/middlewares/validate.ts`:

```ts
import { z } from "zod";
import { validateBody } from "@/middlewares/validate";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post("/login", validateBody(schema), asyncHandler(handler));
```

Three flavors:

| Function | Validates | Replaces |
|---|---|---|
| `validateBody(schema)` | `req.body` | `req.body` |
| `validateQuery(schema)` | `req.query` | (mutates) |
| `validateParams(schema)` | `req.params` | (mutates) |

Failed validation forwards a `ZodError` to the global error handler,
which returns a 400 with field-level details.

## Error handling

`server/src/middlewares/errorHandler.ts` is the **last** middleware.
It catches:

1. **`ApiError`** subclasses — operational errors (401, 403, 404, 409, 429).
   Returns the standard envelope with the correct status code.
2. **`ZodError`** — translated to 400 with field details.
3. **`Prisma.PrismaClientKnownRequestError`** — `P2002` → 409 conflict,
   `P2025` → 404 not found.
4. **Unknown errors** — logged with full stack trace, returns generic
   500 in production (no stack leaked to client).

In production, stack traces are NEVER returned in the response.

## Password hashing (`argon2id`)

`server/src/modules/auth/auth.password.ts`:

- Algorithm: **Argon2id** (OWASP-recommended for password storage)
- Parameters: `memoryCost=19456 KiB (~19 MiB)`, `timeCost=2`, `parallelism=1`
- Per-password salt: handled by argon2 automatically
- Minimum password length: 8 characters (enforced by validators, configurable via `PASSWORD_MIN_LENGTH`)

The `hashPassword()` function throws if the password is too short.
`verifyPassword()` returns `false` (never throws) for malformed hashes
— prevents timing attacks that distinguish "user exists" from
"corrupted record".

## JWT

- Algorithm: **HS256** (HMAC-SHA256) — symmetric, simple, fast.
  Suitable for a single-issuer single-audience system like URS-DMS.
- Secrets: separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
  (≥32 chars each, env-validated).
- Expiry: short-lived access token (default 15m), longer-lived
  refresh token (default 7d).
- Issuer + audience: both enforced on verification.
- Token type claim: distinguishes `access` vs `refresh`.

```ts
// Sprint 2 will use these in login/refresh endpoints:
const access  = signAccessToken({ userId, role, sessionId });
const refresh = signRefreshToken({ userId, role, sessionId });
```

## Cookies

`server/src/modules/auth/auth.cookies.ts` configures:

| Property | Dev | Prod |
|---|---|---|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `lax` | `strict` or `lax` |
| `domain` | `localhost` | configured |
| `path` | `/` | `/api/auth/refresh` (Sprint 2) |

`httpOnly: true` prevents JavaScript from reading the token —
mitigates XSS token theft.

`secure: true` in production forces the cookie to only travel over
HTTPS.

## Trust proxy

`app.set("trust proxy", 1)` is set in `app.ts`. This makes
`req.ip` return the real client IP when behind Docker/nginx/ALB,
instead of the proxy's IP. Without this, rate limiting would
effectively throttle all traffic to a single bucket.

The `1` means "trust the first hop". For multi-hop setups, use the
exact count or a function.

## Logging — what we DON'T log

- ❌ Passwords (plain or hashed)
- ❌ JWT secrets
- ❌ Session tokens
- ❌ Credit card numbers, PII
- ❌ MinIO secret keys

We DO log:

- ✅ Request method, URL, status, response time (Morgan)
- ✅ Application errors with stack trace (winston error level)
- ✅ Rate-limit violations (winston warn level)
- ✅ Auth events (login, logout, refresh) — Sprint 2+

## Audit log (Sprint 2+)

The frontend currently has `AuditLog` types. The backend will mirror
these and write to a dedicated `AuditLog` table (Prisma model in
Sprint 2). Every state-changing operation will record:

- Who (`userId`, `userName`)
- What (`action`, `module`, `category`)
- When (`createdAt`)
- Where (`ipAddress`, `device`, `browser`, `os`)
- Target (`targetId`, `targetName`)
- Status (`success`, `failure`)

## Dependency security

- **`npm audit`** runs in CI (`.github/workflows/ci.yml` — drafted).
- **Dependabot** will be enabled on GitHub for automated PRs.
- We pin exact versions for critical deps (`helmet`, `argon2`, `jsonwebtoken`)
  and use caret ranges for the rest.

## Pre-flight checklist

Before each release:

- [ ] All env vars use real secrets (no `replace_me_*`)
- [ ] `COOKIE_SECURE=true` in production
- [ ] `MINIO_USE_SSL=true` in production
- [ ] HTTPS terminated at the load balancer
- [ ] `helmet` is the FIRST middleware (verified in `app.ts`)
- [ ] No `console.log` of sensitive data
- [ ] Rate limits configured per environment
- [ ] Audit log writes verified (Sprint 2)
- [ ] `npm audit` shows 0 high/critical vulnerabilities

## Reporting a vulnerability

If you discover a security issue, contact the URS-DMS maintainers
**privately** (do not file a public issue). Include:

- Description of the vulnerability
- Reproduction steps
- Potential impact
- Suggested fix (optional)

We aim to acknowledge within 48 hours and provide a fix within 7 days
for critical issues.
