import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/utils/errors";
import * as repo from "@/modules/root/root.config.repository";
import { cacheGet, cacheSet, cacheInvalidateAll, cacheStats } from "@/modules/root/root.config.cache";
import type {
  ConfigurationCategoryView,
  ConfigurationHistoryView,
  ConfigurationValue,
  ConfigurationVersionView,
  ConfigurationView,
  ListResult,
} from "@/modules/root/root.config.types";
import type {
  ListConfigurationsQuery,
  ListHistoryQuery,
  RollbackConfigurationBody,
  UpdateConfigurationsBody,
} from "@/modules/root/root.config.validator";

// =============================================================================
// URS-DMS — Root · Configuration Engine service (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Business logic + RBAC re-checks (defence in depth — the route layer's
// `requirePermission(...)` is the first gate; the service re-asserts the same
// permission so a wiring mistake at the route layer can never bypass RBAC).
//
// RBAC model (matches the catalog in permissions.constants.ts):
//   - root.access                → every /root endpoint (platform overview)
//   - root.configuration.read    → list / category / history reads
//   - root.configuration.update  → PATCH / DELETE / restore
//   - root.configuration.rollback→ POST /rollback
//
// Versioning model:
//   * `Configuration.version` is the CURRENT version number. Every mutation
//     (update / rollback) bumps it by one and appends a ConfigurationVersion
//     snapshot + a ConfigurationHistory row in one transaction, so the two
//     tables can never drift.
//   * Delete / restore are soft (deletedAt) and do NOT bump the version —
//     restoring returns the same version number the entry had before delete.
//
// Caching: reads go through a 60s TTL in-process cache; every mutation
// invalidates the whole cache (the engine holds tens of keys — flush is
// cheaper than key-level tracking). `getConfigValue` is the internal accessor
// future consumers use instead of hardcoding system settings.
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// RBAC re-asserts (defence in depth)
// ---------------------------------------------------------------------------
function assertCanRead(actor: Actor): void {
  if (!actor.permissions.includes("root.configuration.read")) {
    throw new ForbiddenError("You do not have access to the configuration engine");
  }
}
function assertCanUpdate(actor: Actor): void {
  if (!actor.permissions.includes("root.configuration.update")) {
    throw new ForbiddenError("You do not have permission to modify configurations");
  }
}
function assertCanRollback(actor: Actor): void {
  if (!actor.permissions.includes("root.configuration.rollback")) {
    throw new ForbiddenError("You do not have permission to roll back configurations");
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------
function toView(row: repo.ConfigurationRow): ConfigurationView {
  return {
    id: row.id,
    category: { code: row.category.code, name: row.category.name },
    key: row.key,
    name: row.name,
    description: row.description,
    value: row.value,
    valueType: row.valueType,
    status: row.status,
    version: row.version,
    isSystem: row.isSystem,
    createdBy: row.createdBy,
    createdByName: row.createdByUser
      ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim()
      : null,
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByUser
      ? `${row.updatedByUser.firstName} ${row.updatedByUser.lastName}`.trim()
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function inferValueType(v: ConfigurationValue): ConfigurationView["valueType"] {
  if (typeof v === "string") return "STRING";
  if (typeof v === "number") return "NUMBER";
  if (typeof v === "boolean") return "BOOLEAN";
  if (Array.isArray(v)) return "LIST";
  return "JSON";
}

function toHistoryView(row: repo.ConfigurationHistoryRow): ConfigurationHistoryView {
  return {
    id: row.id,
    configurationId: row.configurationId,
    configurationKey: row.configuration.key,
    configurationName: row.configuration.name,
    categoryCode: row.configuration.category.code,
    action: row.action,
    oldValue: row.oldValue,
    newValue: row.newValue,
    versionFrom: row.versionFrom,
    versionTo: row.versionTo,
    actorId: row.actorId,
    actorName: row.actor ? `${row.actor.firstName} ${row.actor.lastName}`.trim() : null,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

// Full live configuration set, cached. The cache entry is the raw repository
// rows (not the wire view) so the in-memory filters below can paginate and
// filter without touching Prisma on cache hits.
const CACHE_KEY = "config:all";

async function getAllLiveRows(): Promise<repo.ConfigurationRow[]> {
  const cached = cacheGet<repo.ConfigurationRow[]>(CACHE_KEY);
  if (cached) return cached;
  const { items } = await repo.listConfigurations({}, 1, 1000);
  cacheSet(CACHE_KEY, items);
  return items;
}

export async function listConfigurations(
  query: ListConfigurationsQuery,
  actor: Actor,
): Promise<ListResult<ConfigurationView>> {
  assertCanRead(actor);
  const rows = await getAllLiveRows();
  let filtered = rows;
  if (query.category) {
    filtered = filtered.filter((r) => r.category.code === query.category);
  }
  if (query.status) {
    filtered = filtered.filter((r) => r.status === query.status);
  }
  if (query.q) {
    const t = query.q.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.key.toLowerCase().includes(t) ||
        r.name.toLowerCase().includes(t) ||
        (r.description ?? "").toLowerCase().includes(t),
    );
  }
  const total = filtered.length;
  const start = (query.page - 1) * query.pageSize;
  const items = filtered.slice(start, start + query.pageSize).map(toView);
  return {
    items,
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  };
}

export async function listCategories(actor: Actor): Promise<ConfigurationCategoryView[]> {
  assertCanRead(actor);
  return repo.listLiveCategories();
}

export async function getConfiguration(key: string, actor: Actor): Promise<ConfigurationView> {
  assertCanRead(actor);
  const row = await repo.findByKey(key);
  if (!row) throw new NotFoundError("Configuration not found");
  return toView(row);
}

// ---------------------------------------------------------------------------
// Update (bulk PATCH)
// ---------------------------------------------------------------------------
export async function updateConfigurations(
  input: UpdateConfigurationsBody,
  actor: Actor,
): Promise<ConfigurationView[]> {
  assertCanUpdate(actor);
  const updated: ConfigurationView[] = [];
  for (const item of input.items) {
    const existing = await repo.findByKey(item.key);
    if (!existing) throw new NotFoundError(`Configuration "${item.key}" not found`);
    if (existing.deletedAt) {
      throw new BadRequestError(`Configuration "${item.key}" is deleted; restore it before updating`);
    }

    const value = item.value as PrismaJsonValue;
    const valueType = inferValueType(item.value);
    const nextVersion = existing.version + 1;

    const row = await prisma.$transaction((tx) =>
      repo.updateValueInTx(tx, {
        id: existing.id,
        value,
        version: nextVersion,
        changeNote: item.changeNote ?? null,
        actorId: actor.id,
        updatedById: actor.id,
        action: "UPDATED",
        oldValue: existing.value,
        versionFrom: existing.version,
      }),
    );

    await writeAudit({
      action: AUDIT_ACTIONS.CONFIG_UPDATED,
      userId: actor.id,
      entity: "configuration",
      entityId: existing.id,
      oldValue: { key: existing.key, value: existing.value, version: existing.version },
      newValue: { key: existing.key, value, version: nextVersion, valueType },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    updated.push(toView(row));
  }
  cacheInvalidateAll();
  return updated;
}

// ---------------------------------------------------------------------------
// Delete / restore (soft)
// ---------------------------------------------------------------------------
export async function deleteConfiguration(key: string, actor: Actor): Promise<ConfigurationView> {
  assertCanUpdate(actor);
  const existing = await repo.findByKey(key);
  if (!existing) throw new NotFoundError("Configuration not found");
  if (existing.deletedAt) {
    throw new BadRequestError("Configuration is already deleted");
  }
  // Seed-owned entries are protected — they keep the platform defaults intact
  // even after an accidental manual wipe of the engine.
  if (existing.isSystem) {
    throw new ForbiddenError(`Configuration "${key}" is seed-owned and cannot be deleted`);
  }

  const row = await repo.setDeleted(existing.id, new Date(), actor.id, "DELETED");

  await writeAudit({
    action: AUDIT_ACTIONS.CONFIG_DELETED,
    userId: actor.id,
    entity: "configuration",
    entityId: existing.id,
    oldValue: { key: existing.key, value: existing.value, version: existing.version },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  cacheInvalidateAll();
  return toView(row);
}

export async function restoreConfiguration(key: string, actor: Actor): Promise<ConfigurationView> {
  assertCanUpdate(actor);
  const existing = await repo.findByKey(key, true);
  if (!existing) throw new NotFoundError("Configuration not found");
  if (!existing.deletedAt) {
    throw new BadRequestError("Configuration is not deleted");
  }

  const row = await repo.setDeleted(existing.id, existing.deletedAt, actor.id, "RESTORED");

  await writeAudit({
    action: AUDIT_ACTIONS.CONFIG_RESTORED,
    userId: actor.id,
    entity: "configuration",
    entityId: existing.id,
    oldValue: { key: existing.key, deletedAt: existing.deletedAt },
    newValue: { key: existing.key, value: row.value, version: row.version },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  cacheInvalidateAll();
  return toView(row);
}

// ---------------------------------------------------------------------------
// Version history + rollback
// ---------------------------------------------------------------------------
export async function listVersions(key: string, actor: Actor): Promise<ConfigurationVersionView[]> {
  assertCanRead(actor);
  const existing = await repo.findByKey(key, true);
  if (!existing) throw new NotFoundError("Configuration not found");
  const versions = await repo.listVersions(existing.id);
  return versions.map((v) => ({
    id: v.id,
    configurationKey: existing.key,
    configurationName: existing.name,
    version: v.version,
    value: v.value,
    changeNote: v.changeNote,
    changedBy: v.changedById,
    changedByName: v.changedBy ? `${v.changedBy.firstName} ${v.changedBy.lastName}`.trim() : null,
    createdAt: v.createdAt,
  }));
}

export async function listHistory(
  query: ListHistoryQuery,
  actor: Actor,
): Promise<ListResult<ConfigurationHistoryView>> {
  assertCanRead(actor);
  const where: Prisma.ConfigurationHistoryWhereInput = {};
  if (query.key) {
    const config = await repo.findByKey(query.key, true);
    if (!config) throw new NotFoundError("Configuration not found");
    where.configurationId = config.id;
  }
  if (query.action) where.action = query.action;
  if (query.actorId) where.actorId = query.actorId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  const { items, total } = await repo.listHistory(where, query.page, query.pageSize);
  return {
    items: items.map(toHistoryView),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
  };
}

export async function rollbackConfiguration(
  input: RollbackConfigurationBody,
  actor: Actor,
): Promise<ConfigurationView> {
  assertCanRollback(actor);
  const existing = await repo.findByKey(input.key);
  if (!existing) throw new NotFoundError("Configuration not found");
  if (existing.deletedAt) {
    throw new BadRequestError("Configuration is deleted; restore it before rolling back");
  }
  if (input.toVersion >= existing.version) {
    throw new BadRequestError(
      `toVersion must be lower than the current version (${existing.version})`,
    );
  }

  const snapshot = await repo.findVersion(existing.id, input.toVersion);
  if (!snapshot) throw new NotFoundError(`Version ${input.toVersion} of "${input.key}" not found`);

  const nextVersion = existing.version + 1;
  const row = await prisma.$transaction((tx) =>
    repo.updateValueInTx(tx, {
      id: existing.id,
      value: snapshot.value,
      version: nextVersion,
      changeNote: input.changeNote ?? `Rolled back to version ${input.toVersion}`,
      actorId: actor.id,
      updatedById: actor.id,
      action: "ROLLED_BACK",
      oldValue: existing.value,
      versionFrom: existing.version,
    }),
  );

  await writeAudit({
    action: AUDIT_ACTIONS.CONFIG_ROLLED_BACK,
    userId: actor.id,
    entity: "configuration",
    entityId: existing.id,
    oldValue: { key: existing.key, value: existing.value, version: existing.version },
    newValue: { key: existing.key, value: snapshot.value, version: nextVersion, rolledBackTo: input.toVersion },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  cacheInvalidateAll();
  return toView(row);
}

// ---------------------------------------------------------------------------
// Internal accessor — the "never hardcode system settings" path.
// Future consumers (e.g. the upload limiter, maintenance-mode gate) read
// platform values from here instead of duplicating constants.
// ---------------------------------------------------------------------------
export async function getConfigValue(key: string): Promise<ConfigurationValue | null> {
  const rows = await getAllLiveRows();
  const row = rows.find((r) => r.key === key);
  return row ? row.value : null;
}

export function configCacheStats(): { size: number; ttlMs: number } {
  return cacheStats();
}

export async function recentConfigurationChanges(limit: number): Promise<ConfigurationHistoryView[]> {
  const rows = await repo.recentHistory(limit);
  return rows.map(toHistoryView);
}

type PrismaJsonValue = Parameters<typeof repo.updateValueInTx>[1]["value"];
