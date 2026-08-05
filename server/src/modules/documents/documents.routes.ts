import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requireAnyPermission, requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  copyDocumentSchema,
  addVersionSchema,
  createDocumentSchema,
  documentAndVersionParamSchema,
  documentIdParamSchema,
  listDocumentsQuerySchema,
  restoreDocumentSchema,
  shareDocumentSchema,
  shareUserParamSchema,
  updateDocumentSchema,
} from "@/modules/documents/documents.validator";
import {
  addVersionHandler,
  copyDocumentHandler,
  createDocumentHandler,
  deleteDocumentHandler,
  downloadDocumentHandler,
  favoriteDocumentHandler,
  getDocumentActivityHandler,
  getDocumentHandler,
  listDeletedDocumentsHandler,
  listDocumentsHandler,
  listFavoriteDocumentsHandler,
  listRecentsHandler,
  listRequestedDocumentsHandler,
  listVersionsHandler,
  permanentDeleteDocumentHandler,
  previewDocumentHandler,
  restoreDocumentHandler,
  shareDocumentHandler,
  unfavoriteDocumentHandler,
  unshareDocumentHandler,
  updateDocumentHandler,
  verifyUploadHandler,
} from "@/modules/documents/documents.controller";

// =============================================================================
// URS-DMS â€” documents routes
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

// Fixed segments BEFORE /:id
documentsRouter.get(
  "/deleted",
  requirePermission("documents.read"),
  asyncHandler(listDeletedDocumentsHandler),
);
documentsRouter.get(
  "/requested",
  requirePermission("documents.read"),
  asyncHandler(listRequestedDocumentsHandler),
);
documentsRouter.get(
  "/favorites",
  requirePermission("documents.read"),
  asyncHandler(listFavoriteDocumentsHandler),
);
documentsRouter.get(
  "/recents",
  requirePermission("documents.read"),
  asyncHandler(listRecentsHandler),
);

// POST /documents â€” create metadata + return presigned PUT URL
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

// DELETE /documents/:id â€” soft delete
documentsRouter.delete(
  "/:id",
  requirePermission("documents.delete"),
  validateParams(documentIdParamSchema),
  asyncHandler(deleteDocumentHandler),
);

// POST /documents/:id/restore â€" restore from recycle bin (conflict-aware)
documentsRouter.post(
  "/:id/restore",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  validateBody(restoreDocumentSchema),
  asyncHandler(restoreDocumentHandler),
);

// GET /documents/:id/activity â€" per-file Details/Activity (rule 18)
documentsRouter.get(
  "/:id/activity",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(getDocumentActivityHandler),
);

// POST /documents/:id/copy â€” copy to a folder (keep_both/replace/cancel)
documentsRouter.post(
  "/:id/copy",
  requirePermission("documents.create"),
  validateParams(documentIdParamSchema),
  validateBody(copyDocumentSchema),
  asyncHandler(copyDocumentHandler),
);

// DELETE /documents/:id/permanent â€” permanent delete (snapshot-guarded)
documentsRouter.delete(
  "/:id/permanent",
  requirePermission("documents.delete"),
  validateParams(documentIdParamSchema),
  asyncHandler(permanentDeleteDocumentHandler),
);

// POST /documents/:id/favorite
documentsRouter.post(
  "/:id/favorite",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  asyncHandler(favoriteDocumentHandler),
);

// DELETE /documents/:id/favorite
documentsRouter.delete(
  "/:id/favorite",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  asyncHandler(unfavoriteDocumentHandler),
);

// GET /documents/:id/download â€” returns presigned GET URL (?versionId=...)
documentsRouter.get(
  "/:id/download",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(downloadDocumentHandler),
);

// GET /documents/:id/preview â€” same as download (inline render on client)
documentsRouter.get(
  "/:id/preview",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(previewDocumentHandler),
);

// POST /documents/:id/version â€” add a new version, return presigned PUT URL
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

// GET /documents/:id/versions â€” list version history
documentsRouter.get(
  "/:id/versions",
  requirePermission("documents.read"),
  validateParams(documentIdParamSchema),
  asyncHandler(listVersionsHandler),
);

// POST /documents/:id/share â€” share with another user
documentsRouter.post(
  "/:id/share",
  requirePermission("documents.update"),
  validateParams(documentIdParamSchema),
  validateBody(shareDocumentSchema),
  asyncHandler(shareDocumentHandler),
);

// DELETE /documents/:id/share/:userId â€” remove a share
documentsRouter.delete(
  "/:id/share/:userId",
  requirePermission("documents.update"),
  validateParams(shareUserParamSchema),
  asyncHandler(unshareDocumentHandler),
);
