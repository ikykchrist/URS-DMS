# URS-DMS

Document Management System for University Recognition and Accreditation (URS)

## Features

- **Document Repository** - Upload, organize, and manage documents by AACCUP areas
- **Accreditation Management (AACCUP / ISO / Certification)** - Separate tabs,
  each with its own areas, requirements, submissions, and analytics
- **Area Tasks** - Admins assign tasks to active users or whole departments;
  visible in the area details modal
- **Submissions Management** - Track and review document submissions from
  departments; files are auto-filed into per-area archive folders
- **User Management** - Manage system users with role-based access; user
  creation restricted to the four colleges (Science / Engineering / Industrial
  Technology / Education) with college categorization
- **Realtime Analytics** - Live per-set stats on the accreditation tabs and the
  admin / ROOT / user dashboards (auto-refreshing)
- **Audit Logs** - Track all system activities for compliance
- **Settings** - Configure system preferences

## v1.3 Email Account Creation

This release adds a validated email account creation flow for invited users.

- Users register with an invitation, email address, campus, department, and
  university ID.
- Registration validates invitation status and prevents duplicate accounts.
- Successful registration sends transactional email through the configured email
  provider.
- Password reset uses the same authenticated email delivery service.

## v1.1 Revamped Features

This release refreshes the Documents and AACCUP group experiences while
preserving the existing API and permission model.

### Documents tab

- Reworked the personal repository into a cleaner, responsive explorer layout.
- Added prominent **New Folder** and **Upload** actions beside the repository
  search controls.
- Added repository sections for My Documents, Favorites, Requested Documents,
  Recent, and Recycle Bin with item counts.
- Added file-type, modified-date, folder, and expanded sort filters.
- Added Name A-Z, Name Z-A, largest-first, smallest-first, newest, and oldest
  sorting options.
- Added list and grid view improvements for desktop and mobile layouts.
- Moved file and folder actions into accessible menus: preview, details,
  rename, move, copy, download, favorite/pin, replace version, customize, ZIP
  download, and delete.
- Added folder details showing files, subfolders, and total size.
- Improved folder and file selection with checkboxes and bulk-action support.
- Added a full-screen drag-and-drop upload overlay.
- Added lazy previews for image, PDF, and video files.
- Unified the page title and description as **My Documents**.

### AACCUP group tab

- Added one shared, responsive tab strip across admin and user accreditation
  views.
- Added consistent navigation for AACCUP, ISO, Certification, Submissions,
  and Tasks without duplicating the tab bar on each page.
- Preserved URL-synced tab selection so refreshes and direct links open the
  selected accreditation section.
- Restyled active and inactive tabs for clearer keyboard, hover, and mobile
  interaction.
- Kept area management, requirements, submissions, task workflows, review
  actions, and set-specific data in their existing views.

### Supporting v1.1 updates

- Improved recent activity ordering and added actor, date, time, and IP details
  to the admin dashboard.
- Added local MinIO browser CORS configuration and public endpoint mapping for
  local Docker and tunnel workflows.
- Removed the unsupported email notification toggle and email dispatch path so
  the UI does not promise a feature that is not currently configured.
- Added defensive local logout and settings fallbacks when the API is
  unavailable.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Node.js + Express + Prisma + PostgreSQL + MinIO
- Lucide React (icons)
- shadcn/ui components

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 to view the application.

Backend (separate terminal):

```powershell
.\restart-server.ps1   # safe restart of the API server only (keeps Vite/alive)
```

or launch a fresh AI session via `ai-dev.bat`.

## Project Structure

```
server/            # Express API (modules: auth, users, documents, folders,
                   #   requests, aaccup (+ tasks/requirements/submissions/
                   #   analytics), dashboard, admin, root, workflow, ...)
client/src/
├── components/
│   ├── layout/       # Layout components (Sidebar, TopNav, etc.)
│   ├── modals/       # Modal components
│   └── ui/           # Reusable UI components
├── pages/            # Page components
└── lib/              # Utility functions
```

## Current Known Bugs and Limitations

These are confirmed open items in the current system. They are not release
blockers for the v1.3 Email Account Creation release unless noted otherwise.

- `prisma migrate dev` cannot replay the shadow database reliably; use the
  repository's manual SQL and `prisma migrate deploy` workflow instead.
- The `DocumentRequest` model has no soft-delete column, so request archival
  still requires a future migration.
- The storage **available** metric is currently `null` because MinIO quota
  probing is not implemented.
- A legacy client-side `ROLE_PERMISSIONS` matrix remains for compatibility and
  can drift from the server matrix. Server-side permissions remain
  authoritative.
- Password recovery retains a latent issue in the pre-existing `authLimiter`:
  its success-status skip hook runs before handlers and does not count those
  requests. The dedicated password-reset limiter does count requests.
- Abandoned MinIO multipart uploads are not currently cleaned automatically;
  a MinIO lifecycle policy is still recommended.
- Notification preferences are currently local-only and are not persisted as
  per-user delivery preferences.
- The client build reports a non-blocking Vite chunk-size warning.

The automated test suites cover RBAC, repository ownership and rules,
audit/notifications, account security, requests, maintenance, roles and
background jobs. Run the available checks before deployment:

```powershell
npm --workspace server run typecheck
npm --workspace server run lint
npm --workspace server run build
npm --prefix client exec tsc -- --noEmit
npm --prefix client run build
npm --workspace server run test
```

## Release Backup

The v1.3 release is tagged `v1.3`. The main development branch is `main`; the
tag is immutable and can be used to restore this release state.
