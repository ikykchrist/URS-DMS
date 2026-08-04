import { z } from "zod";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — Admin · Users validators (Sprint 7.2)
// -----------------------------------------------------------------------------
// The admin surface is gated by the dedicated `user.*` permission codes
// (distinct from the legacy `users.*` codes used by `/api/v1/users`). These
// schemas intentionally mirror the legacy users.validator shapes so the wire
// contract stays intuitive, but live here so the admin module is self-
// contained.
//
// Why duplicate the password / email / employeeId schemas instead of importing
// them? The legacy users.validator does not export reusable sub-schemas
// (creatuserSchema is the only public surface), and AI_CONTEXT §10 forbids
// refactoring `modules/users/*`. Self-contained duplication here is the
// least-invasive choice.
// =============================================================================

const passwordSchema = z
  .string()
  .min(env.PASSWORD_MIN_LENGTH, `Password must be at least ${env.PASSWORD_MIN_LENGTH} characters`)
  .max(128);

const employeeIdSchema = z
  .string()
  .trim()
  .min(2, "Employee ID too short")
  .max(64, "Employee ID too long")
  .regex(/^[A-Za-z0-9_-]+$/, "Employee ID may contain only letters, digits, '-' and '_'");

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const adminListUsersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  includeArchived: z.coerce.boolean().default(false),
  // Filters
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  collegeId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "SUSPENDED"]).optional(),
  // Date range filters (ISO date or full ISO datetime; we parse to a Date in
  // the service via new Date(str)).
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  updatedFrom: z.string().trim().optional(),
  updatedTo: z.string().trim().optional(),
  // Sort
  sort: z.enum(["name", "email", "employeeId", "createdAt", "updatedAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const createAdminUserSchema = z.object({
  employeeId: employeeIdSchema,
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  suffix: z.string().trim().min(1).max(20).optional(),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  mustChangePassword: z.boolean().optional(),
});
export type CreateAdminUserBody = z.infer<typeof createAdminUserSchema>;

export const updateAdminUserSchema = z
  .object({
    email: emailSchema.optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().min(1).max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    suffix: z.string().trim().min(1).max(20).nullable().optional(),
    roleId: z.string().uuid().optional(),
    departmentId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type UpdateAdminUserBody = z.infer<typeof updateAdminUserSchema>;

export const updateStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
  })
  .strict();
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;

export const resetPasswordAdminSchema = z
  .object({
    newPassword: passwordSchema,
    mustChangePassword: z.boolean().optional(),
  })
  .strict();
export type ResetPasswordAdminBody = z.infer<typeof resetPasswordAdminSchema>;

export const forcePasswordChangeSchema = z
  .object({
    // No body required — the flag is purely a boolean toggle. Accept an
    // optional explicit `mustChange` so callers can both set and clear the
    // flag from one endpoint. Default true (matches the endpoint name).
    mustChange: z.boolean().default(true),
  })
  .strict();
export type ForcePasswordChangeBody = z.infer<typeof forcePasswordChangeSchema>;
