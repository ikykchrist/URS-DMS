import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  createFieldSchema,
  createFormSchema,
  fieldIdParamSchema,
  formIdParamSchema,
  listAssignmentsQuerySchema,
  listFormsQuerySchema,
  publishFormSchema,
  reorderFieldsSchema,
  rollbackFormSchema,
  saveDraftSchema,
  updateFieldSchema,
  updateFormSchema,
} from "@/modules/root/root.form.validator";
import {
  archiveFieldHandler,
  archiveFormHandler,
  createAssignmentHandler,
  createFieldHandler,
  createFormHandler,
  duplicateFormHandler,
  getFormHandler,
  getFormPreviewHandler,
  listAssignmentTargetOptionsHandler,
  listAssignmentsHandler,
  listFormsHandler,
  listHistoryHandler,
  listVersionsHandler,
  publishFormHandler,
  removeAssignmentHandler,
  reorderFieldsHandler,
  restoreFormHandler,
  rollbackFormHandler,
  saveDraftHandler,
  updateFieldHandler,
  updateFormHandler,
} from "@/modules/root/root.form.controller";

// =============================================================================
// Sprint 7.4.6 — Dynamic Form Builder router
// Mounted under /api/v1/root/forms. The parent rootRouter enforces
// authentication + the hard ROOT role gate; each route gates via the
// ROOT-only form.* codes (form.read / form.create / form.update /
// form.archive / form.restore / form.publish / form.assign / form.rollback).
// =============================================================================

export const formRouter: Router = Router();

// GET /root/forms — list templates (search / filter / sort / paginate)
formRouter.get(
  "/",
  requirePermission("form.read"),
  validateQuery(listFormsQuerySchema),
  asyncHandler(listFormsHandler),
);

// POST /root/forms — create a draft template
formRouter.post(
  "/",
  requirePermission("form.create"),
  validateBody(createFormSchema),
  asyncHandler(createFormHandler),
);

// GET /root/forms/assignment-targets/:targetType — live target options for the
// assignment dialog. Registered before /:id so the fixed segment wins.
formRouter.get(
  "/assignment-targets/:targetType",
  requirePermission("form.read"),
  asyncHandler(listAssignmentTargetOptionsHandler),
);

// GET /root/forms/assignments — flat assignment list (all templates)
formRouter.get(
  "/assignments",
  requirePermission("form.read"),
  validateQuery(listAssignmentsQuerySchema),
  asyncHandler(listAssignmentsHandler),
);

// GET /root/forms/:id
formRouter.get(
  "/:id",
  requirePermission("form.read"),
  validateParams(formIdParamSchema),
  asyncHandler(getFormHandler),
);

// PATCH /root/forms/:id — update metadata (draft only)
formRouter.patch(
  "/:id",
  requirePermission("form.update"),
  validateParams(formIdParamSchema),
  validateBody(updateFormSchema),
  asyncHandler(updateFormHandler),
);

// DELETE /root/forms/:id — archive
formRouter.delete(
  "/:id",
  requirePermission("form.archive"),
  validateParams(formIdParamSchema),
  asyncHandler(archiveFormHandler),
);

// POST /root/forms/:id/restore
formRouter.post(
  "/:id/restore",
  requirePermission("form.archive"),
  validateParams(formIdParamSchema),
  asyncHandler(restoreFormHandler),
);

// POST /root/forms/:id/duplicate — copy as a new draft
formRouter.post(
  "/:id/duplicate",
  requirePermission("form.create"),
  validateParams(formIdParamSchema),
  asyncHandler(duplicateFormHandler),
);

// POST /root/forms/:id/save-draft — explicit versioned snapshot
formRouter.post(
  "/:id/save-draft",
  requirePermission("form.update"),
  validateParams(formIdParamSchema),
  validateBody(saveDraftSchema),
  asyncHandler(saveDraftHandler),
);

// POST /root/forms/:id/publish
formRouter.post(
  "/:id/publish",
  requirePermission("form.publish"),
  validateParams(formIdParamSchema),
  validateBody(publishFormSchema),
  asyncHandler(publishFormHandler),
);

// GET /root/forms/:id/preview — effective (published-or-draft) definition
formRouter.get(
  "/:id/preview",
  requirePermission("form.read"),
  validateParams(formIdParamSchema),
  asyncHandler(getFormPreviewHandler),
);

// GET /root/forms/:id/versions
formRouter.get(
  "/:id/versions",
  requirePermission("form.read"),
  validateParams(formIdParamSchema),
  asyncHandler(listVersionsHandler),
);

// POST /root/forms/:id/rollback — replay an old snapshot as a new draft
formRouter.post(
  "/:id/rollback",
  requirePermission("form.rollback"),
  validateParams(formIdParamSchema),
  validateBody(rollbackFormSchema),
  asyncHandler(rollbackFormHandler),
);

// GET /root/forms/:id/history
formRouter.get(
  "/:id/history",
  requirePermission("form.read"),
  validateParams(formIdParamSchema),
  asyncHandler(listHistoryHandler),
);

// POST /root/forms/:id/assignments — assign to a scope
formRouter.post(
  "/:id/assignments",
  requirePermission("form.assign"),
  validateParams(formIdParamSchema),
  validateBody(createAssignmentSchema),
  asyncHandler(createAssignmentHandler),
);

// DELETE /root/forms/:id/assignments/:assignmentId — unassign
formRouter.delete(
  "/:id/assignments/:assignmentId",
  requirePermission("form.assign"),
  validateParams(assignmentIdParamSchema),
  asyncHandler(removeAssignmentHandler),
);

// ── Field endpoints (draft-only, versioned) ─────────────────────────────────

// POST /root/forms/:id/fields
formRouter.post(
  "/:id/fields",
  requirePermission("form.update"),
  validateParams(formIdParamSchema),
  validateBody(createFieldSchema),
  asyncHandler(createFieldHandler),
);

// POST /root/forms/:id/fields/reorder — full ordering
formRouter.post(
  "/:id/fields/reorder",
  requirePermission("form.update"),
  validateParams(formIdParamSchema),
  validateBody(reorderFieldsSchema),
  asyncHandler(reorderFieldsHandler),
);

// PATCH /root/forms/:id/fields/:fieldId
formRouter.patch(
  "/:id/fields/:fieldId",
  requirePermission("form.update"),
  validateParams(fieldIdParamSchema),
  validateBody(updateFieldSchema),
  asyncHandler(updateFieldHandler),
);

// DELETE /root/forms/:id/fields/:fieldId — archive a field
formRouter.delete(
  "/:id/fields/:fieldId",
  requirePermission("form.update"),
  validateParams(fieldIdParamSchema),
  asyncHandler(archiveFieldHandler),
);
