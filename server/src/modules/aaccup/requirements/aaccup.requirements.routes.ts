import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  requirementIdParamSchema,
  createRequirementSchema,
  listRequirementsQuerySchema,
  updateRequirementSchema,
  validateRequirementUploadSchema,
} from "@/modules/aaccup/requirements/aaccup.requirements.validator";
import {
  archiveRequirementHandler,
  createRequirementHandler,
  getRequirementHandler,
  listRequirementsHandler,
  restoreRequirementHandler,
  updateRequirementHandler,
  validateRequirementUploadHandler,
} from "@/modules/aaccup/requirements/aaccup.requirements.controller";

// =============================================================================
// URS-DMS — AACCUP requirement routes
// Mounted under /aaccup in aaccup.routes.ts. The parent authenticates, so
// requirement routes need only gate via the granular aaccup.requirement.* codes.
// =============================================================================

export const aaccupRequirementsRouter: Router = Router();

// GET /aaccup/requirements
aaccupRequirementsRouter.get(
  "/",
  requirePermission("aaccup.requirement.read"),
  validateQuery(listRequirementsQuerySchema),
  asyncHandler(listRequirementsHandler),
);

// POST /aaccup/requirements
aaccupRequirementsRouter.post(
  "/",
  requirePermission("aaccup.requirement.create"),
  validateBody(createRequirementSchema),
  asyncHandler(createRequirementHandler),
);

// Validate dynamic Requirement Builder rules before a document is uploaded.
// Registered before /:id so the longer fixed suffix is unambiguous.
aaccupRequirementsRouter.post(
  "/:id/validate-upload",
  requirePermission("aaccup.requirement.read"),
  validateParams(requirementIdParamSchema),
  validateBody(validateRequirementUploadSchema),
  asyncHandler(validateRequirementUploadHandler),
);

// GET /aaccup/requirements/:id
aaccupRequirementsRouter.get(
  "/:id",
  requirePermission("aaccup.requirement.read"),
  validateParams(requirementIdParamSchema),
  asyncHandler(getRequirementHandler),
);

// PATCH /aaccup/requirements/:id
aaccupRequirementsRouter.patch(
  "/:id",
  requirePermission("aaccup.requirement.update"),
  validateParams(requirementIdParamSchema),
  validateBody(updateRequirementSchema),
  asyncHandler(updateRequirementHandler),
);

// DELETE /aaccup/requirements/:id  (soft delete = archive)
aaccupRequirementsRouter.delete(
  "/:id",
  requirePermission("aaccup.requirement.archive"),
  validateParams(requirementIdParamSchema),
  asyncHandler(archiveRequirementHandler),
);

// POST /aaccup/requirements/:id/restore
aaccupRequirementsRouter.post(
  "/:id/restore",
  requirePermission("aaccup.requirement.restore"),
  validateParams(requirementIdParamSchema),
  asyncHandler(restoreRequirementHandler),
);
