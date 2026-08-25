import { z } from "zod";
import { strongPasswordSchema } from "@/modules/auth/auth.validator";

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
    newPassword: strongPasswordSchema,
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const devResetLinkQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
export type DevResetLinkQuery = z.infer<typeof devResetLinkQuerySchema>;
