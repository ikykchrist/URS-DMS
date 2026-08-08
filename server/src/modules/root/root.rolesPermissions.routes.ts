import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireRole } from "@/middlewares/authorize";
import { validateBody, validateParams } from "@/middlewares/validate";
import { sendSuccess } from "@/utils/apiResponse";
import { readCatalog, readMatrix, updateRoleBindings } from "@/modules/root/root.rolesPermissions.service";
import { roleIdParamSchema, updateRolePermissionsSchema } from "@/modules/admin/roles/roles.validator";
import { writeAudit } from "@/modules/audit/audit.service";
import { AUDIT_ACTIONS } from "@/config/constants";

export const rootRolesPermissionsRouter: Router = Router();

// All routes require ROOT role (hard gate — no admin access).
rootRolesPermissionsRouter.use(requireRole("ROOT"));

// GET /root/roles-permissions/matrix
// Returns all roles with bound permission codes + full permission catalog.
rootRolesPermissionsRouter.get(
  "/matrix",
  asyncHandler(async (_req, res) => {
    const matrix = await readMatrix();
    sendSuccess(res, matrix);
  }),
);

// GET /root/roles-permissions/catalog
// Returns the full permission catalog (all codes with module + description).
rootRolesPermissionsRouter.get(
  "/catalog",
  asyncHandler(async (_req, res) => {
    const catalog = readCatalog();
    sendSuccess(res, catalog);
  }),
);

// PATCH /root/roles-permissions/roles/:id/permissions
// Replace a role's permission bindings. Hard ROOT gate + escalation guard.
rootRolesPermissionsRouter.patch(
  "/roles/:id/permissions",
  validateParams(roleIdParamSchema),
  validateBody(updateRolePermissionsSchema),
  asyncHandler(async (req, res) => {
    const actor = {
      id: req.auth!.userId,
      permissions: req.auth!.permissions,
      ipAddress: req.context.ipAddress,
      userAgent: req.context.userAgent,
    };
    const roleId = req.params.id as string;
    const result = await updateRoleBindings(roleId, req.body, actor);
    await writeAudit({
      action: AUDIT_ACTIONS.PERMISSIONS_UPDATED,
      userId: actor.id,
      entity: "role",
      entityId: roleId,
      newValue: {
        permissions: req.body.permissions,
        added: result.added,
        removed: result.removed,
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });
    sendSuccess(res, result);
  }),
);
