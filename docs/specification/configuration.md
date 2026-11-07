# Configuration & Root Console (URS-DMS)

> One responsibility: the Configuration Engine and ROOT-only management
> surfaces. Workflow/requirement/form/folder template behavior →
> `specification/workflow.md`, `specification/aaccup.md`.

## Configuration Engine

- Versioned platform settings in PostgreSQL: categories + configurations
  with `version`, snapshots (`configuration_versions`) and history
  (`configuration_histories`).
- **`getConfigValue(key)`** (`root.config.service.ts`) is the ONLY accessor
  consumers use — never re-read the table, never hardcode the values it owns
  (upload size, allowed file types, university identity, academic calendar,
  colors, timezone, language).
- 60s in-process cache; mutations bump `version`, write snapshot + history in
  one transaction, invalidate the cache.
- Rollback replays an older snapshot as a NEW version (auditable,
  non-destructive). Seed-owned entries (`isSystem`) cannot be deleted.

### Upload policy keys

- `upload.max_size_bytes` (default 100 MB), `upload.allowed_file_types`
  (empty = all allowed). Enforced server-side before presign (see
  `specification/repository.md`).

## ROOT-only surfaces (`/api/v1/root`, hard `requireRole("ROOT")`)

| Surface | What it does |
|---|---|
| Configuration Engine | Versioned platform settings (above) |
| Organization Builder | Colleges, departments, offices, programs — CRUD, archive/restore, reorder (`displayOrder`), version history, rollback |
| Folder Builder | Reusable folder template trees assigned to scopes (DEPARTMENT → COLLEGE → UNIVERSITY resolution); legacy fallback |
| Requirement Builder | Recursive requirement templates (SECTION/REQUIREMENT nodes), validation rules, accreditation cycles, scoped assignment; runtime projection into `AaccupRequirement` rows |
| Platform Control Center | Platform health, configuration and monitoring overview |
| Setup Wizard | Six visible setup stages: identity + logo, organization, folder templates, requirement templates, administrators, summary. Progress persists; locks on completion; reopenable. Legacy persisted step IDs are retained. |

## Behavior rules

- Workflow Builder and Form Builder have been removed from the current product navigation and Root authoring API mounts. Their former client URLs redirect to `/root`. Existing schema/history contracts and internal workflow runtime adapters remain intact; the presentation dataset has no active workflow or form assignments.

- Published workflow definitions are immutable. Requirement templates use ACTIVE/INACTIVE states and remain versioned and editable; activating them requires an active document requirement. Edits affect areas explicitly attached to that template.
- Every mutation is versioned and audited; rollback replays an older snapshot
  as a new version.
- Requirement templates resolve only through an explicit area attachment. Template-library and organization-wide assignments do not automatically expose requirements to users. See `specification/aaccup.md` for the administrator area setup flow.

## Related documents

- `specification/workflow.md` — workflow engine runtime
- `specification/aaccup.md` — requirement projection + validation rules
- `specification/audit.md` — config/builder audit events
- `docs/context/MODULE_INDEX.md` — Root module map
