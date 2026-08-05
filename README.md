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