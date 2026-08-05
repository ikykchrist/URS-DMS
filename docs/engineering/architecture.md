# Architecture (URS-DMS)

> One responsibility: overall architecture, layers, module boundaries,
> integration philosophy. Deep dive: `docs/architecture.md` (legacy,
> more detailed).

## High-level stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn-style UI + Recharts |
| Backend | Node ≥ 20 + Express 4.21 + TypeScript |
| ORM | Prisma 5.22 (PostgreSQL) |
| Database | PostgreSQL 16 (Docker) |
| Object storage | MinIO (Docker) |
| Validation | Zod 3.23 |
| Auth | JWT access/refresh, argon2 password hashing |
| Monorepo | npm workspaces: `server/` + `client/` (canonical frontend) |

## Backend layering

`routes → controller → service → repository → Prisma` — see
`coding.md` for each layer's contract. Every feature module follows this
shape; do not create other top-level structures.

## Frontend structure

```
client/src/
├── components/ layout/ modals/ preview/ repository/ ui/ user/
├── pages/             # one file per page (admin/, user/, root/)
├── services/          # one API layer per module
├── lib/               # http.ts client, toast, theme, permissions, utils
└── types/domain.ts    # shared domain types
```

## Module boundaries

- **Auth** — frozen; never modify `modules/auth/*`,
  `middlewares/authenticate`, `middlewares/authorize` (callers only),
  `lib/storage.ts` (see `security.md`).
- **RBAC** — permission catalog + role matrix are the single sources of
  truth (see `specification/users.md`).
- **Configuration Engine** — `getConfigValue()` is the only accessor; never
  re-read config tables, never hardcode values it owns (see
  `specification/configuration.md`).
- **Repository** — owner-scoped per account (see `specification/repository.md`).
- **Accreditation** — three sets discriminated by `areaSet`
  (see `specification/aaccup.md`).
- **Root surfaces** — mounted under `/api/v1/root` with the hard
  `requireRole("ROOT")` gate (see `backend.md`).

## API design

- Base `/api/v1`. Response envelope, status codes, pagination — see
  `backend.md`.
- Read-only endpoints do not write audit entries by convention (see
  `specification/audit.md`).

## Configuration Engine

- Categories + versioned configurations in PostgreSQL; 60s in-process cache.
- Mutations bump `version`, write snapshot + history row in one transaction,
  invalidate the cache (see `specification/configuration.md`).

## Integration philosophy

1. **Build first, integrate second, refactor third, smoke test last.**
2. **Never redesign existing modules** — preserve architecture; improve in
   place; extend existing patterns.
3. **Never duplicate logic** — reuse the shared helpers listed in
   `coding.md`.
4. **Everything user-created must persist** in PostgreSQL + MinIO across
   refresh, logout, backend restart, Docker restart, Windows restart.
5. **Everything configurable belongs to the Configuration Engine** — never
   hardcode business configuration.
6. **No production mock data** — see `testing.md`.

## Related documents

- `coding.md` — layer contracts, reuse list
- `backend.md` — API conventions
- `security.md` — auth/RBAC architecture
- `docs/architecture.md` — legacy deep dive
