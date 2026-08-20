import { z } from "zod";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — auth validators
// =============================================================================

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from the current one",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const registrationName = z.string().trim().min(1).max(100);
const registrationEmail = z.string().trim().toLowerCase().email().max(254);

export const registrationTokenSchema = z.object({
  token: z.string().min(32).max(256),
});
export type RegistrationTokenInput = z.infer<typeof registrationTokenSchema>;

export const registrationSchema = z.object({
  token: z.string().min(32).max(256),
  email: registrationEmail,
  firstName: registrationName,
  middleName: z.preprocess((value) => value === "" ? undefined : value, registrationName.optional()),
  lastName: registrationName,
  suffix: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().max(20).optional()),
  employeeId: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  collegeId: z.string().uuid(),
  departmentId: z.string().uuid(),
  password: z.string().min(env.PASSWORD_MIN_LENGTH).max(128),
  confirmPassword: z.string().min(env.PASSWORD_MIN_LENGTH).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const registrationRequestSchema = z.object({
  email: registrationEmail,
});
