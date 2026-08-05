# Frontend Standards (URS-DMS)

> One responsibility: client architecture and UI rules. Note: the client is
> **React 18 + TypeScript + Vite 5 + Tailwind CSS** (not Vue). Component
> conventions → `coding.md`.

## Stack

React 18, TypeScript strict, Vite 5, Tailwind CSS 3, shadcn-style primitives,
Recharts (dashboards), lucide-react (icons).

## Structure

- `components/layout/` — Sidebar, TopNav, PageHeader, StatCard, ChartCard,
  NotificationCenter
- `components/modals/` — Add/Edit/Confirm modals
- `components/ui/` — reusable primitives (Button, Card, Dialog, Table, Input,
  Select, Badge, Tabs, Toast, Skeleton, EmptyState…)
- `components/repository/` — RepositoryExplorer (owner-scoped file
  management); `components/preview/` — preview modal parts
- `pages/` — one file per page (admin/, user/, root/)
- `services/` — one API layer per module over `lib/http.ts`
- `lib/http.ts` — single-flight token refresh; on failure dispatches
  `urs:session-expired` → AuthContext forces logout

## Design system

- Reuse the existing shadcn-style set; **never fork new primitives**.
- Cards/tables/dialogs: consistent padding (`p-4/p-5`), borders
  (`border-gray-200/60`), hover states, rounded corners.
- Forms: `Label` + `Input` pairs, `h-10` inputs, red `*` required indicators,
  inline validation messages, `autoFocus` on the primary input.
- Typography: `text-[12/13/14px]` scale; `tracking-wide` uppercase section
  labels; gray-900 titles / gray-500 descriptions.
- Animations: subtle `transition-colors`/`hover:shadow` only.

## States

- **Loading**: skeletons or a centered spinner; never blank.
- **Empty**: `EmptyState` with an action hint; never placeholder rows.
- **Error**: inline error cards with Retry where fetchable.
- **Feedback**: every action produces visible feedback (toast or inline).

## Navigation

- Sidebar per portal (Root Console / Admin / User) + page headers + repository
  breadcrumbs; deep links resolve to the right portal.
- Every page sets `document.title` (`"… · URS-DMS"`).
- Root Console pages are code-split with `React.lazy` + `Suspense`.
- Global `ErrorBoundary` (mounted in `main.tsx`) recovers runtime crashes.
- Protected routes redirect by role portal; **server gates are authoritative**
  (see `security.md`).

## State management

- Business data comes ONLY from the backend (PostgreSQL/MinIO). Never rely on
  React state, localStorage, sessionStorage, static arrays or mock JSON for
  business data.
- `localStorage` allowed only for UI preferences (sidebar state, remember-me,
  active page).
- Memoize derived lists (`useMemo`/`useCallback`); poll dashboards at
  20–30s intervals, never per render.

## Explorer interaction model (repository)

Windows-Explorer behavior (see `specification/repository.md`):

| Action | Result |
|---|---|
| Single click | Select + highlight; never navigate |
| Double click on folder | Navigate into folder |
| Double click on file | Open preview |
| Selection | Single by click; multi via checkboxes for bulk actions |

## Related documents

- `coding.md` — component conventions, naming
- `specification/repository.md` — repository UI behaviors
- `specification/dashboard.md` — dashboard rendering rules
