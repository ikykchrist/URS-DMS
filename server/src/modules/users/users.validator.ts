import { z } from "zod";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — users validators
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

export const createUserSchema = z.object({
  employeeId: employeeIdSchema,
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  suffix: z.string().trim().min(1).max(20).optional(),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
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
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Sprint 8.1 — self-service profile edit. Explicit whitelist ONLY: name
// fields. Role, permissions, status, department, email, employee ID and all
// other fields are rejected (.strict()) to prevent mass assignment /
// privilege escalation.
export const updateSelfSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    suffix: z.string().trim().max(20).nullable().optional(),
  })
  .strict();
export type UpdateSelfInput = z.infer<typeof updateSelfSchema>;

export const changeUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});
export type ChangeUserStatusInput = z.infer<typeof changeUserStatusSchema>;

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED", "SUSPENDED"]).optional(),
  roleId: z.string().uuid().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});
