import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission, requireRole } from "@/middlewares/authorize";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  categoryParamSchema,
  configKeyParamSchema,
  listConfigurationsQuerySchema,
  listHistoryQuerySchema,
  rollbackConfigurationSchema,
  updateConfigurationsSchema,
} from "@/modules/root/root.config.validator";
import {
  deleteConfigurationHandler,
  getCategoryConfigurationsHandler,
  getOverviewHandler,
  listCategoriesHandler,
  listConfigurationsHandler,
  listHistoryHandler,
  listVersionsHandler,
  restoreConfigurationHandler,
  rollbackConfigurationHandler,
  updateConfigurationsHandler,
} from "@/modules/root/root.controller";
import { organizationRouter } from "@/modules/root/root.organization.routes";
import { folderBuilderRouter } from "@/modules/root/root.folderBuilder.routes";
import { requirementRouter } from "@/modules/root/root.requirement.routes";
import { workflowRouter } from "@/modules/workflow/workflow.routes";
import { formRouter } from "@/modules/root/root.form.routes";
import { setupRouter } from "@/modules/root/root.setup.routes";
import { maintenanceRouter } from "@/modules/maintenance/maintenance.routes";

// =============================================================================
// URS-DMS â€” Root routes (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Mounted under /api/v1/root. Authentication is mounted ONCE here so every
// sub-route can assume `req.auth` is populated; granular permission gating
// lives on each route via `requirePermission(...)`.
//
// ROOT-ONLY surface: the spec mandates that only the ROOT role may reach
// these endpoints. Two independent gates enforce that:
//   * `requireRole("ROOT")` â€” hard role gate (spec requirement), DB-backed
//     via req.auth.roleName.
//   * `requirePermission("root.*")` â€” the root.* codes are bound exclusively
//     to the ROOT role in DEFAULT_ROLE_MATRIX and can never be assigned to
//     another role (privilege-escalation guard in `_shared/admin.guard.ts`).
//
// Route ordering note: `/config/history`, `/config/:key/versions` and the
// `/config/:key` actions are registered BEFORE `/config/:category` so the
// category wildcard can never shadow the fixed segments.
//
// Read-only endpoints do NOT write audit entries (project convention,
// AI_CONTEXT Â§8). Mutations audit via their service-layer writeAudit calls
// with the CONFIG_* action constants.
// =============================================================================

export const rootRouter: Router = Router();

rootRouter.use(authenticate);
rootRouter.use(requireRole("ROOT"));

// GET /root/overview â€” Platform Overview dashboard aggregate
rootRouter.get("/overview", requirePermission("root.access"), asyncHandler(getOverviewHandler));

// GET /root/config â€” list (paginated, filterable)
rootRouter.get(
  "/config",
  requirePermission("root.configuration.read"),
  validateQuery(listConfigurationsQuerySchema),
  asyncHandler(listConfigurationsHandler),
);

// GET /root/config/categories â€” category buckets for the console
rootRouter.get(
  "/config/categories",
  requirePermission("root.configuration.read"),
  asyncHandler(listCategoriesHandler),
);

// GET /root/config/history â€” configuration audit trail
rootRouter.get(
  "/config/history",
  requirePermission("root.configuration.read"),
  validateQuery(listHistoryQuerySchema),
  asyncHandler(listHistoryHandler),
);

// GET /root/config/:key/versions â€” version snapshots (rollback source data)
rootRouter.get(
  "/config/:key/versions",
  requirePermission("root.configuration.read"),
  validateParams(configKeyParamSchema),
  asyncHandler(listVersionsHandler),
);

// PATCH /root/config â€” bulk update (bumps versions, writes history)
rootRouter.patch(
  "/config",
  requirePermission("root.configuration.update"),
  validateBody(updateConfigurationsSchema),
  asyncHandler(updateConfigurationsHandler),
);

// DELETE /root/config/:key â€” soft delete (isSystem entries are protected)
rootRouter.delete(
  "/config/:key",
  requirePermission("root.configuration.update"),
  validateParams(configKeyParamSchema),
  asyncHandler(deleteConfigurationHandler),
);

// POST /root/config/:key/restore â€” restore a soft-deleted configuration
rootRouter.post(
  "/config/:key/restore",
  requirePermission("root.configuration.update"),
  validateParams(configKeyParamSchema),
  asyncHandler(restoreConfigurationHandler),
);

// POST /root/config/rollback â€” roll back to a previous version
rootRouter.post(
  "/config/rollback",
  requirePermission("root.configuration.rollback"),
  validateBody(rollbackConfigurationSchema),
  asyncHandler(rollbackConfigurationHandler),
);

// GET /root/config/:category â€” all configurations in one category
// (registered last: the fixed /history and /:key/versions segments above
// must win the match before this wildcard)
rootRouter.get(
  "/config/:category",
  requirePermission("root.configuration.read"),
  validateParams(categoryParamSchema),
  asyncHandler(getCategoryConfigurationsHandler),
);

// Sprint 7.4.2 â€” Organization Management Engine. Mounted last; its paths
// (/organization/*, /colleges, /departments, /offices, /programs) share no
// segment with the config routes above, so ordering is safe.
rootRouter.use(organizationRouter);

// Sprint 7.4.3 â€” Dynamic Folder Builder. Mounted last; its /folder-builder/*
// paths share no segment with any earlier router.
rootRouter.use("/folder-builder", folderBuilderRouter);

// Sprint 7.4.4 - Dynamic Requirement Builder. The parent router already
// enforces authentication and the hard ROOT role gate.
rootRouter.use("/requirements", requirementRouter);

// Sprint 7.4.5 - Dynamic Workflow Builder. Management surface under
// /root/workflows (ROOT-only by construction); the runtime instance surface
// is mounted separately at /api/v1/workflows so reviewers can advance
// live instances without ROOT access.
rootRouter.use("/workflows", workflowRouter);

// Sprint 7.4.6 - Dynamic Form Builder. ROOT-only authoring engine for
// reusable, versioned form templates assignable to requirements, workflow
// steps, AACCUP areas, folder templates and future scopes.
rootRouter.use("/forms", formRouter);

// Sprint 7.4.8 - Platform Setup Wizard. Orchestrates wizard lifecycle only;
// every piece of business data it creates flows through the existing engines.
rootRouter.use("/setup", setupRouter);
rootRouter.use("/maintenance", maintenanceRouter);
