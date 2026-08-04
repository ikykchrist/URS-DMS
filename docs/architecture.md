# Architecture

URS-DMS follows a **layered, modular monolith** architecture suitable for
deployment on a single host (Docker Compose) or scaled to multiple
containers (Kubernetes) in a future iteration.

## High-level overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│              Vite + TypeScript + Tailwind                    │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS / JSON
                             │ (JWT in Authorization header or cookie)
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                   Server (Node.js + Express)                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Middleware Pipeline                                    │ │
│  │ helmet → cors → json → morgan → rate-limit → auth     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Feature Modules (auth, documents, requests, ...)      │ │
│  │   routes → services → repositories                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Cross-cutting                                          │ │
│  │   • Zod validation       • Error handler               │ │
│  │   • Logger (winston)     • Auth foundation (Sprint 1) │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────┬────────────────────────┬───────────────────┘
                  │                        │
                  ▼                        ▼
        ┌──────────────────┐    ┌──────────────────────┐
        │   PostgreSQL     │    │       MinIO           │
        │   (Prisma ORM)   │    │   (S3-compatible)    │
        └──────────────────┘    └──────────────────────┘
```

## Module structure (per feature)

Each feature follows the same internal structure:

```
modules/<feature>/
├── <feature>.routes.ts        # Express router (HTTP endpoints)
├── <feature>.service.ts       # Business logic
├── <feature>.repository.ts    # Data access (Prisma)
├── <feature>.validator.ts     # Zod schemas for request validation
├── <feature>.types.ts         # Local types / interfaces
└── <feature>.errors.ts        # Feature-specific error classes
```

Sprint 1 ships only the auth module **foundation** (no routes) — see
`src/modules/auth/` for the JWT, password, middleware, and validator
scaffolding.

## Folder responsibilities

| Folder | Responsibility |
|---|---|
| `src/config/` | Environment validation (Zod), app-wide constants |
| `src/middlewares/` | Express middlewares: error, logger, rate limit, validator |
| `src/routes/` | Route registry + per-feature routers |
| `src/modules/` | Feature modules (auth, etc.) |
| `src/repositories/` | Data access layer (Prisma clients) |
| `src/services/` | Business logic |
| `src/validators/` | Cross-feature Zod schemas |
| `src/storage/` | MinIO bucket + (Sprint 2+) upload helpers |
| `src/types/` | Ambient TypeScript declarations (Express augmentation) |
| `src/utils/` | Generic utilities (logger, asyncHandler, apiResponse, errors) |
| `src/lib/` | Third-party client singletons (Prisma, MinIO) |
| `src/logs/` | Log files (mounted as Docker volume) |
| `src/tests/` | Test setup (Vitest) |

## Cross-cutting concerns

- **Logging**: `winston` writes JSON-formatted logs to `logs/` (in
  production) and to the console. Morgan pipes HTTP requests through
  winston so all logs go to one place.

- **Error handling**: All thrown errors are subclasses of `ApiError`.
  The global error handler in `src/middlewares/errorHandler.ts` catches
  them and returns the standard `{ success: false, error: { ... } }`
  envelope.

- **Validation**: Every route that accepts a body, query, or params
  uses Zod via `validateBody` / `validateQuery` / `validateParams`.
  Failed validation becomes a 400 with `code: VALIDATION_ERROR`.

- **Auth**: A single `authenticate()` middleware verifies the JWT (if
  present) and attaches `req.auth`. Per-route `requireAuth()` and
  `requireRole(...)` / `requirePermission(...)` enforce access.

- **Security headers**: `helmet` adds the standard set (CSP, HSTS,
  X-Frame-Options, X-Content-Type-Options, etc.).

- **CORS**: Configured via `CLIENT_URL` env var. Credentials supported
  for cookie-based refresh tokens.

- **Rate limiting**: Global `express-rate-limit` (default 100 req / 15
  min). Stricter limits on auth routes in Sprint 2.

## Why a modular monolith?

A modular monolith gives us:

1. **Deployment simplicity** — single Node.js process (or N replicas
   behind a load balancer). Docker Compose, single Helm chart in K8s.
2. **Module boundaries** — each feature has its own folder and
   explicit dependency direction. If we later split into microservices,
   the seams are already there.
3. **Local development speed** — no service-to-service networking
   during dev. Postgres + MinIO + server on one machine.

## Next steps (out of Sprint 1 scope)

- Split modules into separate processes if load demands.
- Add Redis for session storage and rate-limit distribution.
- Add a message queue (BullMQ + Redis) for background jobs.
- Move from Docker Compose to Kubernetes.
