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

### Requirement library and area setup

- Requirement Builder creates reusable, versioned templates. Creating or activating a template does not expose it to users.
- Administrator/Root navigation uses Campus cards, then College cards, then a single Areas workspace. College-wide and By program are scope controls; program selection uses a dropdown without an extra page. Location is stored in URL query parameters and retained across AACCUP/ISO tab switches.
- Create an area from the selected workspace with its name. Campus, college and optional program are inherited; optional details include description and area status. Existing areas can be edited to correct their organization scope.
- College-wide areas use the existing nullable program field and require a valid campus/college pair. Program areas additionally require a program in that same campus/college. No separate campus-wide audience is introduced.
- Inside the administrator area's Requirements tab, attach an active template from the matching accreditation set. Only this explicit `AACCUP_AREA` assignment supplies dynamic requirements to the area and its program-scoped users.
- Campus, college, program, university and cycle assignments retained from older versions are historical configuration; they no longer automatically resolve area requirements. New attachments must target a specific area.
- Removing the area attachment retires its projected requirements without deleting submission history. Reattaching the same nodes preserves existing requirement identities.
- Area template attachment does not create tasks automatically. Accreditation administrators create tasks separately.
- Users refresh the selected area's requirements and submissions together after configuration changes.
- User areas are separated into College-wide and Program areas within the account's campus/college. The selected area name, campus/college and audience are visible in the requirements header and evidence dialog.
- Server list/detail/requirement/submission access permits the matching program or a college-wide area with the exact campus and college. Null organization fields do not grant college-wide access. Document ownership and existing validation/audit paths remain enforced.

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

## Area labels and evidence withdrawal

- Area responses include `areaNumber`, computed within accreditation set, campus, college and program scope. Explicit `AREA-N` codes reserve their number; remaining areas receive creation-order numbers. Archived areas retain their position. No schema change is required.
- User requirement pages show the area number and name, with separate college-wide and program scopes.
- `POST /aaccup/submissions/:id/unsubmit` requires submission-create permission and ownership. Only pending or returned evidence may be withdrawn; approved and rejected evidence return 409.
- Withdrawal atomically retires the submission, terminates any running bound workflow, and records audit events. The owned document is retained and returned to the user's document root when it was stored in an accreditation archive folder.
- Reviewer and withdrawal updates claim an eligible live row transactionally, preventing a concurrent approval from being withdrawn.

## Related documents

- `specification/workflow.md` — instance binding/advance
- `specification/configuration.md` — Requirement Builder, cycles, templates
- `specification/dashboard.md` — per-set compliance cards
- `specification/audit.md` — accreditation audit events
- `docs/context/MODULE_INDEX.md` — AACCUP module map
