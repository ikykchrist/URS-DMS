import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody } from "@/middlewares/validate";
import {
  sendCredentialsSchema,
  updateSetupStateSchema,
  uploadLogoSchema,
} from "@/modules/root/root.setup.validator";
import {
  completeSetupHandler,
  getLogoUrlHandler,
  getSetupHandler,
  getSummaryHandler,
  reopenSetupHandler,
  saveSetupStateHandler,
  sendCredentialsHandler,
  startSetupHandler,
  uploadLogoHandler,
} from "@/modules/root/root.setup.controller";

// =============================================================================
// Sprint 7.4.8 — Platform Setup Wizard router
// Mounted under /api/v1/root/setup. The parent rootRouter enforces
// authentication + the hard ROOT role gate; each route gates via the
// ROOT-only setup.* codes.
// =============================================================================

export const setupRouter: Router = Router();

// GET /root/setup — wizard state + live summary counts
setupRouter.get("/", requirePermission("setup.read"), asyncHandler(getSetupHandler));

// POST /root/setup/start — NOT_STARTED -> IN_PROGRESS (audited)
setupRouter.post("/start", requirePermission("setup.manage"), asyncHandler(startSetupHandler));

// PATCH /root/setup/state — persist progress (step + completed steps)
setupRouter.patch(
  "/state",
  requirePermission("setup.manage"),
  validateBody(updateSetupStateSchema),
  asyncHandler(saveSetupStateHandler),
);

// POST /root/setup/logo — presign a MinIO upload for the university logo
setupRouter.post(
  "/logo",
  requirePermission("setup.manage"),
  validateBody(uploadLogoSchema),
  asyncHandler(uploadLogoHandler),
);

// GET /root/setup/logo — presigned download URL for the stored logo
setupRouter.get("/logo", requirePermission("setup.read"), asyncHandler(getLogoUrlHandler));

// POST /root/setup/complete — finish the wizard (audited)
setupRouter.post("/complete", requirePermission("setup.manage"), asyncHandler(completeSetupHandler));

// POST /root/setup/reopen — reopen a completed wizard from the control center
setupRouter.post("/reopen", requirePermission("setup.manage"), asyncHandler(reopenSetupHandler));

// GET /root/setup/summary — live counts only
setupRouter.get("/summary", requirePermission("setup.read"), asyncHandler(getSummaryHandler));

// POST /root/setup/send-credentials — email initial credentials (Sprint 7.3 queue)
setupRouter.post(
  "/send-credentials",
  requirePermission("setup.manage"),
  validateBody(sendCredentialsSchema),
  asyncHandler(sendCredentialsHandler),
);
