# Workflow Specification (URS-DMS)

> One responsibility: workflow engine behavior. Authoring surfaces →
> `specification/configuration.md`. Permissions → `specification/users.md`.

## Concepts

- **Definitions**: authored step/transition graphs. Steps: START, TASK,
  REVIEW, APPROVAL, END. Transitions carry `actionCode` + required permission.
- **Publish**: publishing bumps the version and writes a complete immutable
  snapshot (steps, transitions, assignments with stable UUIDs) into
  `workflow_versions.data`. Editing a PUBLISHED definition returns 409 until
  rollback replays an older snapshot as a new DRAFT.
- **Assignments**: Root binds published workflows to scopes (university,
  college, department, area, cycle, program, office).
- **Instances**: a running copy bound to one business record
  (request, submission, document status change).

## Behavior rules (spec §12)

| Rule | Statement |
|---|---|
| Assignment | Root assigns a published workflow to scopes |
| Binding | When a business record enters a scope with an assigned workflow, a workflow instance binds to it (inside the same transaction as the host write) |
| Approval flow | The instance moves through authored steps; only the authorized actor of the current step may act |
| Status changes | Business status changes only through allowed transitions; wrong actions are rejected (409) |
| Notifications | Involved parties informed of workflow events (inbox; email through configured provider) |
| Fallback | No workflow assigned → legacy behavior runs unchanged (fail-open) |
| Terminal instances | Reviewing a business record whose instance is no longer running returns 409 |

## Assignment resolution precedence

- AACCUP_SUBMISSION: AREA → active CYCLE → DEPARTMENT → COLLEGE → UNIVERSITY.
- DOCUMENT_REQUEST / documents: DEPARTMENT → COLLEGE → UNIVERSITY.
- Priority desc, then newest first; PUBLISHED only; 60-second in-process
  cache; invalidated on mutation.

## Runtime API

- `POST /workflows/instances/:entityType/:entityId/actions` — perform a step
  action (validates step/role/permission/action against the live step).
- ROOT-only `POST /instances/:id/override` (COMPLETE/TERMINATE).
- Adapters map business statuses to action codes (e.g. APPROVED→APPROVE,
  REJECTED→REJECT, FULFILLED→FULFILL, NEEDS_REVISION→REQUEST_REVISION).

## Integration

- `bindWorkflowInstance` / `evaluateWorkflowAction` / `recordWorkflowAction`
  are called inside the same Prisma transaction as the host business write
  (see `engineering/database.md`).
- Legacy fallback when no assignment resolves.

## Related documents

- `specification/aaccup.md` — submission ↔ workflow integration
- `specification/configuration.md` — Workflow Builder surface
- `specification/audit.md` — workflow audit events
