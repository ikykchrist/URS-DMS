import { z } from "zod";

// =============================================================================
// URS-DMS — Root · Configuration Engine validators (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// The engine accepts configuration values as plain JSON (string / number /
// boolean / array / object). Updates are bulk: one PATCH may touch many keys,
// so each entry carries its own key + value + optional changeNote. The
// `valueType` is derived server-side from the value itself (never trusted
// from the wire) — STRING / NUMBER / BOOLEAN / LIST(JSON array) / JSON
// (object).
// =============================================================================

const configKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "Key must be lowercase alphanumeric with dots/underscores/hyphens");

export const listConfigurationsQuerySchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type ListConfigurationsQuery = z.infer<typeof listConfigurationsQuerySchema>;

export const categoryParamSchema = z.object({
  category: z.string().trim().min(1).max(80),
});
export type CategoryParam = z.infer<typeof categoryParamSchema>;

export const configKeyParamSchema = z.object({
  key: configKeySchema,
});
export type ConfigKeyParam = z.infer<typeof configKeyParamSchema>;

// A configuration value is any JSON value. We accept raw unknown and let the
// service infer the valueType; a `null` value is rejected (a configuration
// with a null value is indistinguishable from an absent one).
const configValueSchema = z.unknown().refine((v) => v !== null && v !== undefined, {
  message: "value must not be null",
});

export const updateConfigurationsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            key: configKeySchema,
            value: configValueSchema,
            changeNote: z.string().trim().max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type UpdateConfigurationsBody = z.infer<typeof updateConfigurationsSchema>;

export const listHistoryQuerySchema = z.object({
  key: configKeySchema.optional(),
  action: z
    .enum(["CREATED", "UPDATED", "DELETED", "RESTORED", "ROLLED_BACK"])
    .optional(),
  actorId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;

export const rollbackConfigurationSchema = z
  .object({
    key: configKeySchema,
    toVersion: z.number().int().min(1),
    changeNote: z.string().trim().max(500).optional(),
  })
  .strict();
export type RollbackConfigurationBody = z.infer<typeof rollbackConfigurationSchema>;

export const listVersionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});
export type ListVersionsQuery = z.infer<typeof listVersionsQuerySchema>;
