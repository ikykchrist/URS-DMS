import { z } from "zod";

export const attachmentUploadSchema = z.object({
  filename: z.string().trim().min(1).max(200).refine(
    (name) => !name.includes("/") && !name.includes("\\") && [...name].every((char) => char.charCodeAt(0) >= 32),
    "Filename must not contain path separators or control characters",
  ),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
});
export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>;

export const createBugReportSchema = z.object({
  tab: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(2000),
  attachment: z.object({
    objectKey: z.string().min(1).max(500),
    filename: attachmentUploadSchema.shape.filename,
  }).optional(),
});
export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;

export const listBugReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListBugReportsQuery = z.infer<typeof listBugReportsQuerySchema>;
