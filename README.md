# URS-DMS

Document Management System for University Recognition and Accreditation (URS)

## Features

- **Document Repository** - Upload, organize, and manage documents by AACCUP areas
- **Submissions Management** - Track and review document submissions from departments
- **User Management** - Manage system users with role-based access
- **AACCUP Management** - Organize and track AACCUP accreditation areas
- **Audit Logs** - Track all system activities for compliance
- **Settings** - Configure system preferences

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- shadcn/ui components

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 to view the application.

## Project Structure

```
src/
├── components/
│   ├── layout/       # Layout components (Sidebar, TopNav, etc.)
│   ├── modals/       # Modal components
│   └── ui/           # Reusable UI components
├── pages/            # Page components
├── data/             # Data files and types
└── lib/              # Utility functions
```