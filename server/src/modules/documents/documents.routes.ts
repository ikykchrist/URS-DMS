import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requireAnyPermission, requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  addVersionSchema,
  createDocumentSchema,
  documentAndVersionParamSchema,
  documentIdParamSchema,
  listDocumentsQuerySchema,
  shareDocumentSchema,
  shareUserParamSchema,
  updateDocumentSchema,
} from "@/modules/documents/documents.validator";
import {
  addVersionHandler,
  createDocumentHandler,
  deleteDocumentHandler,
  downloadDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  listVersionsHandler,
  previewDocumentHandler,
  shareDocumentHandler,
  unshareDocumentHandler,
  updateDocumentHandler,
  verifyUploadHandler,
} from "@/modules/documents/documents.controller";

// =============================================================================
// URS-DMS — documents routes
// All routes require authentication. Mutations require the appropriate
// permission. No `if (role === "admin")` anywhere.
// =============================================================================

export const documentsRouter: Router = Router();

documentsRouter.use(authenticate);

// GET /documents
documentsRouter.get(
  "/",
  requirePermission("documents.read"),
  validateQuery(listDocumentsQuerySchema),
  asyncHandler(listDocumentsHandler),
);

// POST /documents — create metadata + return presigned PUT URL
documentsRouter.post(
  "/",
  requirePermission("documents.create"),
  validateBody(createDocumentSchema),
  asyncHandler(createDocumentHandler),
);

// GET /documents/:id
documentsRouter.get(
  "/:id",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(getDocumentHandler),
);

// PATCH /documents/:id
documentsRouter.patch(
  "/:id",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  validateBody(updateDocumentSchema),
  asyncHandler(updateDocumentHandler),
);

// DELETE /documents/:id — soft delete
documentsRouter.delete(
  "/:id",
  requirePermission("documents.delete"),
  validateParams(documentIdParamSchema),
  asyncHandler(deleteDocumentHandler),
);

// GET /documents/:id/download — returns presigned GET URL (?versionId=...)
documentsRouter.get(
  "/:id/download",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(downloadDocumentHandler),
);

// GET /documents/:id/preview — same as download (inline render on client)
documentsRouter.get(
  "/:id/preview",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(previewDocumentHandler),
);

// POST /documents/:id/version — add a new version, return presigned PUT URL
documentsRouter.post(
  "/:id/version",
  requireAnyPermission("documents.create", "documents.update"),
  validateParams(documentIdParamSchema),
  validateBody(addVersionSchema),
  asyncHandler(addVersionHandler),
);

// POST /documents/:id/versions/:versionId/verify - verify the stored object
// against its declared size and SHA-256 digest.
documentsRouter.post(
  "/:id/versions/:versionId/verify",
  requireAnyPermission("documents.create", "documents.update"),
  validateParams(documentAndVersionParamSchema),
  asyncHandler(verifyUploadHandler),
);

// GET /documents/:id/versions — list version history
documentsRouter.get(
  "/:id/versions",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(listVersionsHandler),
);

// POST /documents/:id/share — share with another user
documentsRouter.post(
  "/:id/share",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  validateBody(shareDocumentSchema),
  asyncHandler(shareDocumentHandler),
);

// DELETE /documents/:id/share/:userId — remove a share
documentsRouter.delete(
  "/:id/share/:userId",
  requirePermission("documents.update"),
  validateParams(shareUserParamSchema),
  asyncHandler(unshareDocumentHandler),
);
