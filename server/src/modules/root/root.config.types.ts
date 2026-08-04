// =============================================================================
// URS-DMS — Root · Configuration Engine domain shapes (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Wire views for the Configuration Engine. `Configuration.value` is a JSONB
// column in the DB; it is surfaced as `unknown` so STRING/NUMBER/BOOLEAN/
// JSON/LIST values all round-trip without narrowing (clients validate against
// `valueType`). BigInts do not appear here — the engine never stores sizes as
// BigInt (numbers are plain JSON numbers, matching the SystemSetting
// conventions for upload limits).
// =============================================================================

export type ConfigurationValue = unknown;

export interface ConfigurationCategoryView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationView {
  id: string;
  category: { code: string; name: string };
  key: string;
  name: string;
  description: string | null;
  value: ConfigurationValue;
  valueType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "LIST";
  status: "ACTIVE" | "INACTIVE";
  version: number;
  isSystem: boolean;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationVersionView {
  id: string;
  configurationKey: string;
  configurationName: string;
  version: number;
  value: ConfigurationValue;
  changeNote: string | null;
  changedBy: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export type ConfigurationHistoryAction =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "RESTORED"
  | "ROLLED_BACK";

export interface ConfigurationHistoryView {
  id: string;
  configurationId: string;
  configurationKey: string;
  configurationName: string;
  categoryCode: string;
  action: ConfigurationHistoryAction;
  oldValue: ConfigurationValue | null;
  newValue: ConfigurationValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface ListResult<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
