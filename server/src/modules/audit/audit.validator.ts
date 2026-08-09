import { z } from "zod";

const simpleString = z.string().trim().min(1).max(255);

export const auditIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const auditArchiveParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),

  q: simpleString.max(200).optional(),

  userId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),

  module: simpleString.optional(),
  entity: simpleString.optional(),
  entityId: z.string().uuid().optional(),
  action: simpleString.optional(),
  status: z.enum(["SUCCESS", "FAILED"]).optional(),
  category: z.enum([
    "AUTHENTICATION", "SUBMISSION", "REQUEST", "SECURITY",
    "ACCESS_CONTROL", "SYSTEM", "REPOSITORY",
  ]).optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  result: z.enum(["SUCCESS", "FAILED", "DENIED"]).optional(),
  targetType: simpleString.optional(),
  ipAddress: simpleString.max(64).optional(),

  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),

  sort: z
    .enum(["newest", "oldest", "user", "action", "module", "category", "severity"])
    .default("newest"),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

export const exportAuditQuerySchema = listAuditQuerySchema.extend({
  format: z.enum(["csv", "json", "pdf"]).default("csv"),
  maxRows: z.coerce.number().int().min(1).max(10_000).default(10_000),
});
export type ExportAuditQuery = z.infer<typeof exportAuditQuerySchema>;

export const archiveAuditQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});
export type ArchiveAuditQuery = z.infer<typeof archiveAuditQuerySchema>;

export const purgeAuditQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  archiveFirst: z.coerce.boolean().default(true),
  confirmation: z.literal("PURGE_AUDIT_LOGS"),
});
export type PurgeAuditQuery = z.infer<typeof purgeAuditQuerySchema>;

export const retentionConfigSchema = z.object({
  retentionYears: z.coerce.number().int().min(1).max(100),
});
export type RetentionConfigQuery = z.infer<typeof retentionConfigSchema>;

export const myActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: simpleString.max(200).optional(),
  category: z.enum([
    "AUTHENTICATION", "SUBMISSION", "REQUEST", "SECURITY",
    "ACCESS_CONTROL", "SYSTEM", "REPOSITORY",
  ]).optional(),
  result: z.enum(["SUCCESS", "FAILED", "DENIED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type MyActivityQuery = z.infer<typeof myActivityQuerySchema>;

export const reviewUpdateSchema = z.object({
  status: z.enum(["UNREVIEWED", "REVIEWED", "NEEDS_FOLLOW_UP"]).optional(),
  note: z.string().max(2000).optional(),
});
export type ReviewUpdateQuery = z.infer<typeof reviewUpdateSchema>;

export const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(1),
});
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export const archiveDownloadParamsSchema = z.object({
  id: z.string().uuid(),
});

export const loginGroupsQuerySchema = z.object({
  withinMinutes: z.coerce.number().int().min(1).max(1440).default(10),
  minAttempts: z.coerce.number().int().min(2).max(1000).default(3),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type LoginGroupsQuery = z.infer<typeof loginGroupsQuerySchema>;
