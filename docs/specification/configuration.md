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
| Workflow Builder | Workflow definitions, steps, transitions, validation, immutable publish, versions + rollback, assignment, instance administration |
| Form Builder | Dynamic form templates (12 field types), versioning, publish/rollback/duplicate, assignments to requirements/workflow steps/AACCUP areas/folder templates/global scope |
| Platform Control Center | Platform health, configuration and monitoring overview |
| Setup Wizard | Guided 8-step first-run configuration (identity + logo, organization, folder templates, requirement templates, workflow assignment, form assignment, administrators, summary); progress persists; locks on completion; reopenable |

## Behavior rules

- Published templates are immutable; editing requires rollback to a draft
  first (409 on published mutation).
- Every mutation is versioned and audited; rollback replays an older snapshot
  as a new version.
- Assignments resolve by specificity (area → cycle → department → college →
  university) and can be re-prioritized.

## Related documents

- `specification/workflow.md` — workflow engine runtime
- `specification/aaccup.md` — requirement projection + validation rules
- `specification/audit.md` — config/builder audit events
- `docs/context/MODULE_INDEX.md` — Root module map
