import { z } from "zod";

// =============================================================================
// URS-DMS — documents validators
// =============================================================================

// MIME types allowed on upload. Server rejects anything else.
// Keep this list small and conservative — extend only when the records
// office formally accepts a new file type.
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "text/csv",
  "text/plain",
  // Audio (rule 6: supported audio uploads)
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  // Video (rule 6: video uploads, native preview playback)
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const idParam = z.object({ id: z.string().uuid() });

const versionIdParam = z.object({ versionId: z.string().uuid() });

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9 _.-]+$/, "Tag may contain only letters, digits, spaces, '.', '_', '-'");

const shareUserIdParam = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

const documentMetadataSchema = z
  .record(z.string(), z.unknown())
  .refine((value) => Object.keys(value).length <= 64, "Metadata is limited to 64 entries");

export const listDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
  classification: z.enum(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]).optional(),
  departmentId: z.string().uuid().optional(),
  folderId: z.preprocess(
    (value) => (value === "null" ? null : value),
    z.string().uuid().nullable().optional(),
  ),
  ownerId: z.string().uuid().optional(),
  uploadedById: z.string().uuid().optional(),
  tag: tagSchema.optional(),
  sort: z.enum(["updatedAt", "title", "createdAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const documentIdParamSchema = idParam;
export const versionIdParamSchema = versionIdParam;

export const documentAndVersionParamSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  classification: z.enum(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]).default("INTERNAL"),
  departmentId: z.string().uuid().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  retentionUntil: z.coerce.date().optional(),
  metadata: documentMetadataSchema.optional(),
  tags: z.array(tagSchema).max(20).optional(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    classification: z.enum(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]).optional(),
    status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
    departmentId: z.string().uuid().nullable().optional(),
    folderId: z.string().uuid().nullable().optional(),
    retentionUntil: z.coerce.date().nullable().optional(),
    metadata: documentMetadataSchema.nullable().optional(),
  })
  .strict();
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const addVersionSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Unsupported file type" }),
  }),
  sizeBytes: z.coerce.bigint().positive(),
  checksum: z
    .string()
    .trim()
    .regex(/^[A-Fa-f0-9]{64}$/, "Checksum must be SHA-256 hex"),
  changeNote: z.string().trim().max(2000).optional(),
});
export type AddVersionInput = z.infer<typeof addVersionSchema>;

export const shareDocumentSchema = z.object({
  userId: z.string().uuid(),
  permission: z.enum(["READ", "WRITE"]).default("READ"),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;

export const copyDocumentSchema = z
  .object({
    targetFolderId: z.string().uuid().nullable().optional(),
    conflictMode: z.enum(["keep_both", "replace", "cancel"]).default("keep_both"),
  })
  .strict();
export type CopyDocumentInput = z.infer<typeof copyDocumentSchema>;

// Restore from recycle bin: explicit destination folder (null = root),
// name-conflict handling, and original-location fallback (rule 10/8).
export const restoreDocumentSchema = z
  .object({
    targetFolderId: z.string().uuid().nullable().optional(),
    conflictMode: z.enum(["keep_both", "replace", "cancel"]).default("keep_both"),
  })
  .strict();
export type RestoreDocumentInput = z.infer<typeof restoreDocumentSchema>;

export const shareUserParamSchema = shareUserIdParam;
