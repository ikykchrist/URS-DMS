import { z } from "zod";

// =============================================================================
// URS-DMS — Platform Setup Wizard validators
// =============================================================================

export const updateSetupStateSchema = z
  .object({
    currentStep: z.number().int().min(0).max(8),
    completedSteps: z.array(z.number().int().min(1).max(8)).max(8),
  })
  .strict();
export type UpdateSetupStateInput = z.infer<typeof updateSetupStateSchema>;

export const uploadLogoSchema = z
  .object({
    filename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(150),
    sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024),
  })
  .strict();
export type UploadLogoInput = z.infer<typeof uploadLogoSchema>;

export const sendCredentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    name: z.string().trim().min(1).max(255),
    password: z.string().trim().min(1).max(128),
    roleName: z.string().trim().min(1).max(100),
  })
  .strict();
export type SendCredentialsInput = z.infer<typeof sendCredentialsSchema>;
