import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody } from "@/middlewares/validate";
import { updateSettingsSchema } from "@/modules/admin/settings/settings.validator";
import {
  getSettingsHandler,
  updateSettingsHandler,
} from "@/modules/admin/settings/settings.controller";

// =============================================================================
// URS-DMS — Admin · System Settings routes (Sprint 7.1)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/settings. All routes require authentication
// (the shared dispatcher admin.routes.ts mounts `authenticate` once for the
// whole tree). Settings is a singleton (no `:id`, no list, no pagination).
// Permission gating uses admin.settings.read / admin.settings.update.
// =============================================================================

export const settingsRouter: Router = Router();

// GET /admin/settings
settingsRouter.get(
  "/",
  requirePermission("admin.settings.read"),
  asyncHandler(getSettingsHandler),
);

// PATCH /admin/settings
settingsRouter.patch(
  "/",
  requirePermission("admin.settings.update"),
  validateBody(updateSettingsSchema),
  asyncHandler(updateSettingsHandler),
);
