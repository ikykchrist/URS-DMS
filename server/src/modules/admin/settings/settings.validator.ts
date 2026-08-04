import { z } from "zod";

// =============================================================================
// URS-DMS — Admin · System Settings validators (Sprint 7.1)
// -----------------------------------------------------------------------------
// Only the PATCH body is user-controlled. A GET requests no input. Settings
// are a singleton (no `:id` parameter), so there is no params schema.
// =============================================================================

// allowedFileTypes items are validated as a trimmed lowercase alphanumeric
// extension without a leading dot ("pdf", "docx", …) so callers can round-trip
// the array without normalisation drift.
const fileTypeItem = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9.-]*$/, "File type must be an extension like 'pdf' or 'docx'");

export const updateSettingsSchema = z
  .object({
    applicationName: z.string().trim().min(1).max(255).optional(),
    // Validate as a string and convert to BigInt in the service. Strings are
    // the wire format for BigInt (AI_CONTEXT §6) and avoid JS numeric
    // precision loss for very large quotas.
    maxUploadSizeBytes: z
      .string()
      .trim()
      .regex(/^\d+$/, "maxUploadSizeBytes must be a non-negative integer string")
      .optional(),
    allowedFileTypes: z.array(fileTypeItem).max(100).optional(),
    sessionTimeoutMinutes: z.coerce.number().int().min(1).max(10080).optional(),
    defaultPaginationSize: z.coerce.number().int().min(1).max(200).optional(),
    maintenanceMode: z.boolean().optional(),
    storageThresholdWarning: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
