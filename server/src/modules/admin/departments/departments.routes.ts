import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  createDepartmentSchema,
  departmentIdParamSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from "@/modules/admin/departments/departments.validator";
import {
  archiveDepartmentHandler,
  createDepartmentHandler,
  getDepartmentHandler,
  listDepartmentsHandler,
  restoreDepartmentHandler,
  updateDepartmentHandler,
} from "@/modules/admin/departments/departments.controller";

// =============================================================================
// URS-DMS — Admin · Departments routes (Sprint 7.1)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Mounted under /api/v1/admin/departments. All routes require authentication
// (the shared dispatcher admin.routes.ts mounts `authenticate` once for the
// whole tree, so sub-routers deliberately do NOT re-mount it). Permission
// gating uses the granular department.* codes (department.read,
// department.create, department.update, department.archive). The "archive"
// code doubles for the restore flow per the sprint spec.
// =============================================================================

export const departmentsRouter: Router = Router();

// GET /admin/departments
departmentsRouter.get(
  "/",
  requirePermission("department.read"),
  validateQuery(departmentListQuerySchema),
  asyncHandler(listDepartmentsHandler),
);

// POST /admin/departments
departmentsRouter.post(
  "/",
  requirePermission("department.create"),
  validateBody(createDepartmentSchema),
  asyncHandler(createDepartmentHandler),
);

// GET /admin/departments/:id
departmentsRouter.get(
  "/:id",
  requirePermission("department.read"),
  validateParams(departmentIdParamSchema),
  asyncHandler(getDepartmentHandler),
);

// PATCH /admin/departments/:id
departmentsRouter.patch(
  "/:id",
  requirePermission("department.update"),
  validateParams(departmentIdParamSchema),
  validateBody(updateDepartmentSchema),
  asyncHandler(updateDepartmentHandler),
);

// DELETE /admin/departments/:id  (soft delete = "archive")
departmentsRouter.delete(
  "/:id",
  requirePermission("department.archive"),
  validateParams(departmentIdParamSchema),
  asyncHandler(archiveDepartmentHandler),
);

// POST /admin/departments/:id/restore
departmentsRouter.post(
  "/:id/restore",
  requirePermission("department.archive"),
  validateParams(departmentIdParamSchema),
  asyncHandler(restoreDepartmentHandler),
);
