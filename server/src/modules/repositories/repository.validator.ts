import { z } from "zod";

// =============================================================================
// URS-DMS — Personal repository validators
// =============================================================================

export const ownerIdParamSchema = z.object({ ownerId: z.string().uuid() });

export const emergencyAccessParamSchema = z.object({ id: z.string().uuid() });

export const grantEmergencyAccessSchema = z
  .object({
    adminId: z.string().uuid(),
    reason: z.string().trim().min(10).max(1000),
    durationMinutes: z.number().int().min(5).max(240).default(30),
  })
  .strict();
export type GrantEmergencyAccessInput = z.infer<typeof grantEmergencyAccessSchema>;

export const revokeEmergencyAccessSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type RevokeEmergencyAccessInput = z.infer<typeof revokeEmergencyAccessSchema>;
