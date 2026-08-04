import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { departmentsRouter } from "@/modules/admin/departments/departments.routes";
import { collegesRouter } from "@/modules/admin/colleges/colleges.routes";
import { settingsRouter } from "@/modules/admin/settings/settings.routes";
import { adminUsersRouter } from "@/modules/admin/users/users.routes";
import { adminRolesRouter } from "@/modules/admin/roles/roles.routes";
import { adminPermissionsRouter } from "@/modules/admin/permissions/permissions.routes";

// =============================================================================
// URS-DMS — Admin routes (Sprint 7.1 + 7.2)
// -----------------------------------------------------------------------------
// Top-level dispatcher for the administration backend surface. Mounted under
// /api/v1/admin. Authentication is mounted ONCE here so every sub-router can
// assume `req.auth` is populated; granular permission gating lives on each
// individual route via `requirePermission(...)`.
//
// The sub-routers cover six admin-managed surfaces:
//   * /admin/departments  — CRUD + archive + restore for departments         (Sprint 7.1)
//   * /admin/colleges     — CRUD + archive + restore for colleges            (Sprint 7.1)
//   * /admin/settings     — singleton system-settings get + patch           (Sprint 7.1)
//   * /admin/users        — user CRUD + archive/restore + status + pwd      (Sprint 7.2)
//   * /admin/roles        — role CRUD + archive/restore + permission mgmt    (Sprint 7.2)
//   * /admin/permissions  — permission catalog read                          (Sprint 7.2)
//
// Read-only endpoints (settings get, list+detail departments/colleges/users/
// roles/permissions) do NOT write audit entries — matching the project
// convention that read paths skip auditing (AI_CONTEXT §8). Mutation
// endpoints each write a dedicated audit action constant via their
// service-layer `writeAudit` calls. Permission bindings changes write a
// single `role.permissions_updated` action per role change.
// =============================================================================

export const adminRouter: Router = Router();

adminRouter.use(authenticate);

adminRouter.use("/departments", departmentsRouter);
adminRouter.use("/colleges", collegesRouter);
adminRouter.use("/settings", settingsRouter);
adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/roles", adminRolesRouter);
adminRouter.use("/permissions", adminPermissionsRouter);
