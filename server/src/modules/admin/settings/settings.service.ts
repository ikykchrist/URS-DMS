import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { ForbiddenError } from "@/utils/errors";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { SystemSettingsView } from "@/modules/admin/settings/settings.types";
import type { UpdateSettingsBody } from "@/modules/admin/settings/settings.validator";

// =============================================================================
// URS-DMS — Admin · System Settings service (Sprint 7.1)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-checks. The SystemSetting table is a singleton
// (PK `id = "singleton"`), so the read endpoint upserts the row with the
// schema defaults on first read — never 404s. The update endpoint patches
// only the supplied fields and stamps `updatedById`.
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - admin.settings.read    → get settings
//   - admin.settings.update → patch settings
// Mutations are ADMINISTRATOR-only; the QAO role is granted the read code so
// the existing dashboard scope keeps working.
// =============================================================================

const SETTING_ID = "singleton";

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("admin.settings.read")) {
    throw new ForbiddenError("You do not have access to system settings");
  }
}

function assertCanUpdate(actor: Actor): void {
  if (!actor.permissions.includes("admin.settings.update")) {
    throw new ForbiddenError("You do not have permission to update system settings");
  }
}

// Maps a Prisma row to the wire view. `maxUploadSizeBytes` is a BigInt and
// must serialized as a string per AI_CONTEXT §6.
function toView(row: {
  applicationName: string;
  maxUploadSizeBytes: bigint;
  allowedFileTypes: string[];
  sessionTimeoutMinutes: number;
  defaultPaginationSize: number;
  maintenanceMode: boolean;
  storageThresholdWarning: number;
  updatedById: string | null;
  updatedAt: Date;
}): SystemSettingsView {
  return {
    applicationName: row.applicationName,
    maxUploadSizeBytes: row.maxUploadSizeBytes.toString(),
    allowedFileTypes: row.allowedFileTypes,
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    defaultPaginationSize: row.defaultPaginationSize,
    maintenanceMode: row.maintenanceMode,
    storageThresholdWarning: row.storageThresholdWarning,
    updatedById: row.updatedById,
    updatedAt: row.updatedAt,
  };
}

// -----------------------------------------------------------------------------
// getSettings — upsert-on-read so the singleton always exists.
// -----------------------------------------------------------------------------
export async function getSettings(actor: Actor): Promise<SystemSettingsView> {
  assertCanRead(actor);

  // Upsert guarantees the singleton row exists with the schema defaults even
  // on a freshly-migrated DB where the seed has not created it yet. The
  // `update: {}` is a no-op when the row exists. This is intentionally NOT a
  // separate repository — settings is a single-row table read centrally.
  const row = await prisma.systemSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID },
    update: {},
    select: {
      applicationName: true,
      maxUploadSizeBytes: true,
      allowedFileTypes: true,
      sessionTimeoutMinutes: true,
      defaultPaginationSize: true,
      maintenanceMode: true,
      storageThresholdWarning: true,
      updatedById: true,
      updatedAt: true,
    },
  });

  return toView(row);
}

// -----------------------------------------------------------------------------
// updateSettings — patches the supplied fields, stamps updatedById, audits.
// -----------------------------------------------------------------------------
export async function updateSettings(
  input: UpdateSettingsBody,
  actor: Actor,
): Promise<SystemSettingsView> {
  assertCanUpdate(actor);

  // Read the current state first for the audit oldValue; do not upsert-on-read
  // here (the row should already exist; if it doesn't, getSettings will seed
  // it, and an update without a prior read is a genuine bug). Duplicate the
  // upsert so a missing singleton on first boot is still safe.
  const existing = await prisma.systemSetting.upsert({
    where: { id: SETTING_ID },
    create: { id: SETTING_ID },
    update: {},
    select: {
      applicationName: true,
      maxUploadSizeBytes: true,
      allowedFileTypes: true,
      sessionTimeoutMinutes: true,
      defaultPaginationSize: true,
      maintenanceMode: true,
      storageThresholdWarning: true,
      updatedById: true,
    },
  });

  const data: Prisma.SystemSettingUpdateInput = {
    updatedBy: { connect: { id: actor.id } },
  };
  if (input.applicationName !== undefined) data.applicationName = input.applicationName;
  if (input.maxUploadSizeBytes !== undefined) {
    data.maxUploadSizeBytes = BigInt(input.maxUploadSizeBytes);
  }
  if (input.allowedFileTypes !== undefined) data.allowedFileTypes = input.allowedFileTypes;
  if (input.sessionTimeoutMinutes !== undefined) {
    data.sessionTimeoutMinutes = input.sessionTimeoutMinutes;
  }
  if (input.defaultPaginationSize !== undefined) {
    data.defaultPaginationSize = input.defaultPaginationSize;
  }
  if (input.maintenanceMode !== undefined) data.maintenanceMode = input.maintenanceMode;
  if (input.storageThresholdWarning !== undefined) {
    data.storageThresholdWarning = input.storageThresholdWarning;
  }

  const updated = await prisma.systemSetting.update({
    where: { id: SETTING_ID },
    data,
    select: {
      applicationName: true,
      maxUploadSizeBytes: true,
      allowedFileTypes: true,
      sessionTimeoutMinutes: true,
      defaultPaginationSize: true,
      maintenanceMode: true,
      storageThresholdWarning: true,
      updatedById: true,
      updatedAt: true,
    },
  });

  await writeAudit({
    action: AUDIT_ACTIONS.SETTINGS_UPDATED,
    userId: actor.id,
    entity: "system_settings",
    entityId: SETTING_ID,
    oldValue: {
      applicationName: existing.applicationName,
      maxUploadSizeBytes: existing.maxUploadSizeBytes.toString(),
      sessionTimeoutMinutes: existing.sessionTimeoutMinutes,
      maintenanceMode: existing.maintenanceMode,
    },
    newValue: {
      applicationName: updated.applicationName,
      maxUploadSizeBytes: updated.maxUploadSizeBytes.toString(),
      sessionTimeoutMinutes: updated.sessionTimeoutMinutes,
      maintenanceMode: updated.maintenanceMode,
    },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return toView(updated);
}
