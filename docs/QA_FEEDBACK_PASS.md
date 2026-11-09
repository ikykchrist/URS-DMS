# QA and success feedback pass — 5 November 2026

Success feedback is emitted by user-action completion handlers after their awaited operation succeeds. Existing success toasts, upload queue completion states, and inline authentication/setup confirmations are retained. Reads, polling, navigation, validation failures, and cancelled operations do not receive mutation-success notifications.

## Coverage

| Area | Successful operations with feedback |
| --- | --- |
| Authentication/account | Sign in/out, invitation request, registration, recovery/reset/change password, profile/photo update, revoke sessions |
| Repository | Upload/replace, scanner save, create/rename/move/copy, favorites/pins, sharing, folder appearance, recycle/restore/permanent deletion, file/ZIP download |
| Accreditation | Area create/edit/archive, requirements create/edit/archive, template attachment, tasks create/start, evidence submit/withdraw, approve/reject/return, CSV/approved-evidence ZIP export |
| Requests/users | Request submit/cancel/review, invitation, account create/edit/archive/password reset, user export |
| Root Console | Existing configuration/organization/folder/requirement/workflow feedback retained; form create/draft/publish/duplicate/archive/restore, fields/reorder, assignments, rollback added; setup progress save acknowledged |
| Other | Notification read/read-all, bug-report submission/attachment download, audit/activity export, maintenance jobs, local display/theme/preferences |

Success notifications default to four seconds and expose a dismiss button and a polite status announcement. Errors are assertive alerts. Bulk submission actions and recycle-bin deletion report actual completed, failed, and skipped counts. Background copies acknowledge starting a job, with completion handled by existing job polling.

User settings no longer call the administrator-only settings endpoint to initialize display preferences. Display preferences persist locally; compact mode and sidebar settings update the user shell. Notification preferences use the same local preference key as existing admin settings; this does not add a server-side email-delivery preference API.

## Reproduced QA fixes

- Accreditation dashboard counts use the selected set and preserve it in drill-down links.
- Dashboard task counts use the same personal task scope as their destination.
- Submission status filters synchronize with URL changes; Reset clears URL status while preserving the set.
- Empty search exports contain the header only; quoted CSV cells escape embedded quotes.
- Notification read failures propagate, preventing false local read/success states.
- Failed task loading shows an error rather than an endless skeleton.
- Logout All revokes other sessions before signing out the current account.
- Saved-view labels reflect the active filters; storage maintenance uses valid HTML around its status badge.

## Verification and limits

- Client ESLint/production build and server lint/typecheck/build passed. Existing server console and Vite bundle/Browserslist warnings remain.
- Focused server tests: 19 passed across area numbering, audience scope, and approved-package export planning; these tests do not write to the database.
- `node scripts/verify-action-feedback.cjs` verifies notification lifetime/dismissal/accessibility, mixed outcomes, all-failed/empty batches, and no premature success while pending.
- Browser: administrator dashboard/repository/request/user pages loaded; folder navigation, PDF preview and document activity worked. ISO drill-down showed 14 approved of 30 ISO submissions; Reset restored all 30; zero-match CSV contained only its header. Public recovery showed its generic success state for a nonexistent `.invalid` address.
- ROOT login succeeded using the existing local bootstrap configuration. Sign-in and theme-update success messages were verified live. ROOT console pages rendered, and a fresh maintenance page produced no console errors. The current ISO export reported zero exported submissions in its success toast while downloading a header-only CSV. Screenshots are in `output/qa-success-toast.jpg` and `output/qa-export-success.jpg`.
- Faculty browser regression remains blocked because the supplied credential was rejected for the existing faculty test account. No password resets, role changes, seeding, schema/migration changes, or deletion of existing user data were performed during testing.

This is a scoped QA pass, not a claim that full system acceptance passed. Remaining browser coverage includes faculty workflows, upload/review/request mutations, builder publishing/assignments, and multi-account authorization checks. Form/workflow builder components have success feedback, but their routes currently redirect to Platform Overview in pre-existing workspace changes; those redirects were preserved.
