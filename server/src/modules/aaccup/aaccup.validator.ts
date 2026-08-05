import { z } from "zod";

// =============================================================================
// URS-DMS — AACCUP validators
// =============================================================================

const idParam = z.object({ id: z.string().uuid() });

export const areaIdParamSchema = idParam;

export const listAreasQuerySchema = z.object({
  areaSet: z.enum(["AACCUP", "ISO", "CERT"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  departmentId: z.string().uuid().optional(),
  accreditationCycleId: z.string().uuid().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["code", "name", "createdAt", "updatedAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type ListAreasQuery = z.infer<typeof listAreasQuerySchema>;

export const createAreaSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(
      /^[A-Z0-9._-]+$/,
      "Code must contain only uppercase letters, digits, dots, underscores, and dashes",
    ),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional(),
  departmentId: z.string().uuid(),
  accreditationCycleId: z.string().uuid().nullable().optional(),
  areaSet: z.enum(["AACCUP", "ISO", "CERT"]).default("AACCUP"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
export type CreateAreaInput = z.infer<typeof createAreaSchema>;

export const updateAreaSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(
        /^[A-Z0-9._-]+$/,
        "Code must contain only uppercase letters, digits, dots, underscores, and dashes",
      )
      .optional(),
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(2000).optional(),
    departmentId: z.string().uuid().optional(),
    accreditationCycleId: z.string().uuid().nullable().optional(),
    areaSet: z.enum(["AACCUP", "ISO", "CERT"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
