import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  createFolderSchema,
  folderIdParamSchema,
  listFoldersQuerySchema,
  updateFolderSchema,
} from "@/modules/folders/folders.validator";
import {
  createFolderHandler,
  deleteFolderHandler,
  getFolderHandler,
  listFoldersHandler,
  resolveMyFolderStructureHandler,
  updateFolderHandler,
} from "@/modules/folders/folders.controller";

// =============================================================================
// URS-DMS — folders routes
// All routes require authentication. Mutations require the appropriate
// permission. No `if (role === "admin")` anywhere.
// =============================================================================

export const foldersRouter: Router = Router();

foldersRouter.use(authenticate);

// GET /folders/resolve — resolved repository structure for the current user
// (Sprint 7.4.3: Folder Builder template assigned to DEPARTMENT → COLLEGE →
// UNIVERSITY; falls back to legacy folders when nothing is assigned).
// Registered BEFORE /:id so the fixed segment wins the match.
foldersRouter.get(
  "/resolve",
  requirePermission("folders.read"),
  asyncHandler(resolveMyFolderStructureHandler),
);

// GET /folders
foldersRouter.get(
  "/",
  requirePermission("folders.read"),
  validateQuery(listFoldersQuerySchema),
  asyncHandler(listFoldersHandler),
);

// POST /folders
foldersRouter.post(
  "/",
  requirePermission("folders.create"),
  validateBody(createFolderSchema),
  asyncHandler(createFolderHandler),
);

// GET /folders/:id
foldersRouter.get(
  "/:id",
  requirePermission("folders.read"),
  validateParams(folderIdParamSchema),
  asyncHandler(getFolderHandler),
);

// PATCH /folders/:id
foldersRouter.patch(
  "/:id",
  requirePermission("folders.update"),
  validateParams(folderIdParamSchema),
  validateBody(updateFolderSchema),
  asyncHandler(updateFolderHandler),
);

// DELETE /folders/:id — soft delete (cascades to children)
foldersRouter.delete(
  "/:id",
  requirePermission("folders.delete"),
  validateParams(folderIdParamSchema),
  asyncHandler(deleteFolderHandler),
);
