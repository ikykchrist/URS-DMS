import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  archiveCollegeHandler,
  createCollegeHandler,
  getCollegeHandler,
  listCollegesHandler,
  restoreCollegeHandler,
  updateCollegeHandler,
} from "@/modules/admin/colleges/colleges.controller";
import {
  collegeIdParamSchema,
  collegeListQuerySchema,
  createCollegeSchema,
  updateCollegeSchema,
} from "@/modules/admin/colleges/colleges.validator";

// =============================================================================
// URS-DMS — Admin · Colleges routes (Sprint 7.1)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/colleges. All routes require authentication (the
// shared dispatcher admin.routes.ts mounts `authenticate` once for the whole
// tree). Permission gating uses the granular college.* codes (college.read,
// college.create, college.update, college.archive). The "archive" code doubles
// for the restore flow per the sprint spec.
// =============================================================================

export const collegesRouter: Router = Router();

// GET /admin/colleges
collegesRouter.get(
  "/",
  requirePermission("college.read"),
  validateQuery(collegeListQuerySchema),
  asyncHandler(listCollegesHandler),
);

// POST /admin/colleges
collegesRouter.post(
  "/",
  requirePermission("college.create"),
  validateBody(createCollegeSchema),
  asyncHandler(createCollegeHandler),
);

// GET /admin/colleges/:id
collegesRouter.get(
  "/:id",
  requirePermission("college.read"),
  validateParams(collegeIdParamSchema),
  asyncHandler(getCollegeHandler),
);

// PATCH /admin/colleges/:id
collegesRouter.patch(
  "/:id",
  requirePermission("college.update"),
  validateParams(collegeIdParamSchema),
  validateBody(updateCollegeSchema),
  asyncHandler(updateCollegeHandler),
);

// DELETE /admin/colleges/:id  (soft delete = "archive")
collegesRouter.delete(
  "/:id",
  requirePermission("college.archive"),
  validateParams(collegeIdParamSchema),
  asyncHandler(archiveCollegeHandler),
);

// POST /admin/colleges/:id/restore
collegesRouter.post(
  "/:id/restore",
  requirePermission("college.archive"),
  validateParams(collegeIdParamSchema),
  asyncHandler(restoreCollegeHandler),
);
