import { z } from "zod";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — password recovery validators (Sprint 8.2)
// =============================================================================

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(512),
    newPassword: z
      .string()
      .min(env.PASSWORD_MIN_LENGTH, `Password must be at least ${env.PASSWORD_MIN_LENGTH} characters`)
      .max(128),
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const devResetLinkQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
export type DevResetLinkQuery = z.infer<typeof devResetLinkQuerySchema>;
