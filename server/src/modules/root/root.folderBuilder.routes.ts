import { Router } from "express";
import { requirePermission } from "@/middlewares/authorize";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  assignFolderTemplateSchema,
  createFolderNodeSchema,
  createFolderTemplateSchema,
  folderNodeIdParamSchema,
  folderTemplateIdParamSchema,
  listFolderAssignmentsQuerySchema,
  listFolderHistoryQuerySchema,
  listFolderNodesQuerySchema,
  listFolderTemplatesQuerySchema,
  moveFolderNodeSchema,
  rollbackFolderTemplateSchema,
  updateFolderNodeSchema,
  updateFolderTemplateSchema,
} from "@/modules/root/root.folderBuilder.validator";
import {
  archiveNodeHandler,
  archiveTemplateHandler,
  assignTemplateHandler,
  createNodeHandler,
  createTemplateHandler,
  duplicateNodeHandler,
  duplicateTemplateHandler,
  getNodeChildrenHandler,
  getTemplateHandler,
  listAssignmentsHandler,
  listHistoryHandler,
  listNodesHandler,
  listTemplatesHandler,
  listVersionsHandler,
  moveNodeHandler,
  restoreNodeHandler,
  restoreTemplateHandler,
  rollbackTemplateHandler,
  unassignTemplateHandler,
  updateNodeHandler,
  updateTemplateHandler,
} from "@/modules/root/root.folderBuilder.controller";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder routes (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// Mounted at /root/folder-builder inside the root router (which already gates
// authenticate + requireRole("ROOT")), so every endpoint here is Root-only
// twice over: the hard role gate and the ROOT-exclusive folder.* codes.
//
// Permission map (catalog in permissions.constants.ts, ROOT_ONLY_CODES in
// roles.constants.ts):
//   - folder.read     → list / detail / tree / nodes / versions / history /
//                       assignments reads
//   - folder.create   → POST template + POST node + duplicate (template/node)
//   - folder.update   → PATCH template / node + node move
//   - folder.archive  → DELETE template / node (archive)
//   - folder.restore  → POST restore (template / node)
//   - folder.assign   → POST assign + DELETE assignment
//   - folder.rollback → POST rollback
// Read-only endpoints do NOT write audit entries (project convention,
// AI_CONTEXT §8); mutations audit via the service (FOLDER_* action constants
// in config/constants.ts).
//
// Router-layering note: ALL node routes are registered on the SAME router as
// the template routes with fully qualified paths (/:id/nodes/:nodeId/...).
// Express 4 does not merge `use('/:id/nodes', ...)` mount params into a
// nested router's req.params, so nesting the node router would lose `:id`.
//
// Route ordering: fixed segments (/:id/versions, /:id/duplicate,
// /:id/assignments, /:id/nodes/...) are registered before the bare
// /:id catch-alls; segment counts differ, so no shadowing is possible, but
// the grouping keeps reads and mutations legible.
// =============================================================================

export const folderBuilderRouter: Router = Router();

const templatesRouter: Router = Router();

// GET  /templates — paginated, filterable list
templatesRouter.get(
  "/",
  requirePermission("folder.read"),
  validateQuery(listFolderTemplatesQuerySchema),
  asyncHandler(listTemplatesHandler),
);
// POST /templates — create (version 1 snapshot + audit)
templatesRouter.post(
  "/",
  requirePermission("folder.create"),
  validateBody(createFolderTemplateSchema),
  asyncHandler(createTemplateHandler),
);

// GET  /templates/:id/versions — version snapshots
templatesRouter.get(
  "/:id/versions",
  requirePermission("folder.read"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(listVersionsHandler),
);
// POST /templates/:id/duplicate — deep-copy template
templatesRouter.post(
  "/:id/duplicate",
  requirePermission("folder.create"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(duplicateTemplateHandler),
);
// POST /templates/:id/assignments — assign to a target
templatesRouter.post(
  "/:id/assignments",
  requirePermission("folder.assign"),
  validateParams(folderTemplateIdParamSchema),
  validateBody(assignFolderTemplateSchema),
  asyncHandler(assignTemplateHandler),
);

// GET  /templates/:id/nodes — tree (or filtered) of the template's nodes
templatesRouter.get(
  "/:id/nodes",
  requirePermission("folder.read"),
  validateParams(folderTemplateIdParamSchema),
  validateQuery(listFolderNodesQuerySchema),
  asyncHandler(listNodesHandler),
);
// POST /templates/:id/nodes — create node under a parent (or root)
templatesRouter.post(
  "/:id/nodes",
  requirePermission("folder.create"),
  validateParams(folderTemplateIdParamSchema),
  validateBody(createFolderNodeSchema),
  asyncHandler(createNodeHandler),
);
// GET /templates/:id/nodes/:nodeId/children — lazy children fetch
templatesRouter.get(
  "/:id/nodes/:nodeId/children",
  requirePermission("folder.read"),
  validateParams(folderNodeIdParamSchema),
  asyncHandler(getNodeChildrenHandler),
);
// POST /templates/:id/nodes/:nodeId/duplicate — deep-copy a node subtree
templatesRouter.post(
  "/:id/nodes/:nodeId/duplicate",
  requirePermission("folder.create"),
  validateParams(folderNodeIdParamSchema),
  asyncHandler(duplicateNodeHandler),
);
// POST /templates/:id/nodes/:nodeId/move — move + level recompute
templatesRouter.post(
  "/:id/nodes/:nodeId/move",
  requirePermission("folder.update"),
  validateParams(folderNodeIdParamSchema),
  validateBody(moveFolderNodeSchema),
  asyncHandler(moveNodeHandler),
);
// PATCH /templates/:id/nodes/:nodeId — update node fields
templatesRouter.patch(
  "/:id/nodes/:nodeId",
  requirePermission("folder.update"),
  validateParams(folderNodeIdParamSchema),
  validateBody(updateFolderNodeSchema),
  asyncHandler(updateNodeHandler),
);
// DELETE /templates/:id/nodes/:nodeId — archive node
templatesRouter.delete(
  "/:id/nodes/:nodeId",
  requirePermission("folder.archive"),
  validateParams(folderNodeIdParamSchema),
  asyncHandler(archiveNodeHandler),
);
// POST /templates/:id/nodes/:nodeId/restore — restore archived node
templatesRouter.post(
  "/:id/nodes/:nodeId/restore",
  requirePermission("folder.restore"),
  validateParams(folderNodeIdParamSchema),
  asyncHandler(restoreNodeHandler),
);

// GET /templates/:id — detail (tree + assignments + version)
templatesRouter.get(
  "/:id",
  requirePermission("folder.read"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(getTemplateHandler),
);
// PATCH /templates/:id — update template fields
templatesRouter.patch(
  "/:id",
  requirePermission("folder.update"),
  validateParams(folderTemplateIdParamSchema),
  validateBody(updateFolderTemplateSchema),
  asyncHandler(updateTemplateHandler),
);
// DELETE /templates/:id — archive (soft delete)
templatesRouter.delete(
  "/:id",
  requirePermission("folder.archive"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(archiveTemplateHandler),
);
// POST /templates/:id/restore — restore archived template
templatesRouter.post(
  "/:id/restore",
  requirePermission("folder.restore"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(restoreTemplateHandler),
);

folderBuilderRouter.use("/templates", templatesRouter);

// GET /history — folder template audit trail (paginated)
folderBuilderRouter.get(
  "/history",
  requirePermission("folder.read"),
  validateQuery(listFolderHistoryQuerySchema),
  asyncHandler(listHistoryHandler),
);

// GET /assignments — all live assignments (filterable)
folderBuilderRouter.get(
  "/assignments",
  requirePermission("folder.read"),
  validateQuery(listFolderAssignmentsQuerySchema),
  asyncHandler(listAssignmentsHandler),
);

// DELETE /assignments/:id — remove an assignment
folderBuilderRouter.delete(
  "/assignments/:id",
  requirePermission("folder.assign"),
  validateParams(folderTemplateIdParamSchema),
  asyncHandler(unassignTemplateHandler),
);

// POST /rollback — replay an earlier snapshot as a new version
folderBuilderRouter.post(
  "/rollback",
  requirePermission("folder.rollback"),
  validateBody(rollbackFolderTemplateSchema),
  asyncHandler(rollbackTemplateHandler),
);
