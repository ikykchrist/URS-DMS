import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams } from "@/middlewares/validate";
import {
  emergencyAccessParamSchema,
  grantEmergencyAccessSchema,
  ownerIdParamSchema,
  revokeEmergencyAccessSchema,
} from "@/modules/repositories/repository.validator";
import {
  backfillHandler,
  getMyRepositoryHandler,
  getStorageSummaryHandler,
  grantEmergencyAccessHandler,
  listEmergencyAccessHandler,
  listRepositoriesHandler,
  revokeEmergencyAccessHandler,
} from "@/modules/repositories/repository.controller";

// =============================================================================
// URS-DMS — Personal repository routes
// Mounted under /api/v1/repositories. Access is ownership-based; emergency
// grants are ROOT-gated via repository.emergency_access.
// =============================================================================

export const repositoryRouter: Router = Router();

repositoryRouter.use(authenticate);

// GET /repositories/me — provision (idempotent) + return the caller's repo
repositoryRouter.get("/me", asyncHandler(getMyRepositoryHandler));

// GET /repositories/storage — honest server storage display (rule 13)
repositoryRouter.get("/storage", asyncHandler(getStorageSummaryHandler));

// GET /repositories/emergency — grants issued to the caller
repositoryRouter.get("/emergency", asyncHandler(listEmergencyAccessHandler));

// POST /repositories/backfill — ROOT-only maintenance (provision all accounts)
repositoryRouter.post(
  "/backfill",
  requirePermission("repository.emergency_access"),
  asyncHandler(backfillHandler),
);

// POST /repositories/:ownerId/emergency-access — ROOT grants time-limited access
repositoryRouter.post(
  "/:ownerId/emergency-access",
  requirePermission("repository.emergency_access"),
  validateParams(ownerIdParamSchema),
  validateBody(grantEmergencyAccessSchema),
  asyncHandler(grantEmergencyAccessHandler),
);

// POST /repositories/emergency-access/:id/revoke — ROOT revokes a grant
repositoryRouter.post(
  "/emergency-access/:id/revoke",
  requirePermission("repository.emergency_access"),
  validateParams(emergencyAccessParamSchema),
  validateBody(revokeEmergencyAccessSchema),
  asyncHandler(revokeEmergencyAccessHandler),
);

// GET /repositories/:ownerId — owner-scoped (or active emergency grant)
repositoryRouter.get(
  "/:ownerId",
  validateParams(ownerIdParamSchema),
  asyncHandler(listRepositoriesHandler),
);
