// =============================================================================
// URS-DMS — Admin · System Settings domain shapes (Sprint 7.1)
// -----------------------------------------------------------------------------
// The settings table is a singleton (`id = "singleton"`). The "list"/"detail"
// shapes collapse to a single read shape; there is no list entry to paginate.
//
// `maxUploadSizeBytes` is a BigInt in the DB. It is serialized to a string in
// the JSON response body per the project's BigInt convention (AI_CONTEXT §6) —
// JS `number` is unsafe above 2^53, and a 100 MiB default comfortably fits in
// a JS number, but larger configured quotas would silently truncate. String
// is the safe default; clients parse with `BigInt(str)` or `Number(str)`.
// =============================================================================

export interface SystemSettingsView {
  applicationName: string;
  maxUploadSizeBytes: string;
  allowedFileTypes: string[];
  sessionTimeoutMinutes: number;
  defaultPaginationSize: number;
  maintenanceMode: boolean;
  storageThresholdWarning: number;
  updatedAt: Date;
  updatedById: string | null;
}
