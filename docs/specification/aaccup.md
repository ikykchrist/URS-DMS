# AACCUP / Accreditation Specification (URS-DMS)

> One responsibility: accreditation record sets (AACCUP, ISO, Certification),
> submissions, tasks, compliance. Workflow integration →
> `specification/workflow.md`. Dashboards → `specification/dashboard.md`.

## Record sets (D-011)

AACCUP, ISO and Certification are **separate record sets** discriminated by
`areaSet` (`AACCUP | ISO | CERT`) on areas. Areas, requirements, submissions
and tasks inherit the set through relations. All set-scoped queries MUST
filter by `areaSet`; admin and user tabs are wired to their own set.

## Structure

- **Areas** — per set, CRUD + archive/restore (soft).
- **Requirements** — per set, under areas; live rows either legacy or
  projected from Requirement Builder templates (see
  `specification/configuration.md`).
- **Tasks** — assignable work items per area; assignee is an ACTIVE user or a
  whole department (validated at write time, `assigneeLabel` snapshot).

## Submission lifecycle (spec §11, D-007)

```
PENDING ──► APPROVED (terminal)
    │
    ├──► REJECTED (terminal)
    └──► NEEDS_REVISION ──► PENDING (re-submit) ──► …
```

| Rule | Standard |
|---|---|
| Snapshot | Submissions are immutable records of a document + requirement at a point in time; editing updates remarks only |
| Evidence capture | `snapshotFilename/MimeType/SizeBytes/Checksum` recorded at submit time |
| Current pointer | Exactly one `isCurrent=true` per requirement; approval promotes, previous current demotes (transactional) |
| Resubmission | NEEDS_REVISION allows re-submission (new submission, history kept) |
| Approved | Terminal; cannot be re-reviewed; never overwritten or deleted by later submissions |
| Review scope | Only authorized reviewers approve/reject/return (`aaccup.submission.review`) |
| Archive | Soft delete; workflow instances gate the review |

## Workflow integration

- A published workflow bound to the requirement's scope chain wraps the
  submission: create binds an instance; review evaluates the action and
  advances/terminates the instance **inside the same transaction**.
- Reviewing a submission whose instance is not running returns 409.
- Unresolved assignment → legacy flow (fail-open).
- Review decisions must be valid actions of the instance's current step.

## Validation rules (Requirement Builder)

FILE_TYPE, FILE_SIZE, PAGE_COUNT, EXPIRATION_DATE, NAMING_CONVENTION,
METADATA — run at upload preflight and again on submit. ERROR rules block;
WARNING rules are advisory. Upload policy base (size/types) comes from the
Configuration Engine.

## Compliance & analytics

- Single source of truth: `compliance.service.ts`
  (`calculateOverallCompliance`) — see `specification/dashboard.md`.
- Includes archived departments that still own live areas.

## Review notifications (rule 19)

Review outcomes emit backend notifications to the submitter:
`AACCUP_SUBMISSION_APPROVED`, `AACCUP_SUBMISSION_RETURNED` (returned for
revision) and `AACCUP_SUBMISSION_REJECTED` — best-effort, never failing the
review. See `specification/repository.md` §Notifications.

## Related documents

- `specification/workflow.md` — instance binding/advance
- `specification/configuration.md` — Requirement Builder, cycles, templates
- `specification/dashboard.md` — per-set compliance cards
- `specification/audit.md` — accreditation audit events
- `docs/context/MODULE_INDEX.md` — AACCUP module map
