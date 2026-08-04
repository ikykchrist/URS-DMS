import { prisma } from "@/lib/prisma";
import type { ConfigurationAction, ConfigurationValueType, Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — Root · Configuration Engine repository (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Pure data access. All live-row queries filter `deletedAt: null`; the
// restore flow explicitly passes `includeDeleted = true`. The engine tables
// mirror the soft-delete convention on every other transactional model.
//
// The update path (updateValue + appendVersion + appendHistory) is wrapped in
// a single `$transaction` by the service so `Configuration.version` can never
// drift from the `configuration_versions` table.
// =============================================================================

export interface ConfigurationRow {
  id: string;
  categoryId: string;
  key: string;
  name: string;
  description: string | null;
  value: Prisma.JsonValue;
  valueType: "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "LIST";
  status: "ACTIVE" | "INACTIVE";
  version: number;
  isSystem: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category: { code: string; name: string };
  createdByUser: { firstName: string; lastName: string } | null;
  updatedByUser: { firstName: string; lastName: string } | null;
}

const LIVE: Prisma.ConfigurationWhereInput = { deletedAt: null };

export async function findCategoryByCode(
  code: string,
  includeDeleted = false,
): Promise<{ id: string; code: string; name: string; isSystem: boolean } | null> {
  return prisma.configurationCategory.findFirst({
    where: includeDeleted ? { code } : { code, deletedAt: null },
    select: { id: true, code: true, name: true, isSystem: true },
  });
}

export async function listLiveCategories(): Promise<
  {
    id: string;
    code: string;
    name: string;
    description: string | null;
    displayOrder: number;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[]
> {
  return prisma.configurationCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      displayOrder: true,
      isSystem: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

const configurationSelect = {
  id: true,
  categoryId: true,
  key: true,
  name: true,
  description: true,
  value: true,
  valueType: true,
  status: true,
  version: true,
  isSystem: true,
  createdBy: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  category: { select: { code: true, name: true } },
  createdByUser: { select: { firstName: true, lastName: true } },
  updatedByUser: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ConfigurationSelect;

export async function listConfigurations(
  where: Prisma.ConfigurationWhereInput,
  page: number,
  pageSize: number,
): Promise<{ items: ConfigurationRow[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.configuration.findMany({
      where: { ...LIVE, ...where },
      orderBy: [{ category: { displayOrder: "asc" } }, { key: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: configurationSelect,
    }),
    prisma.configuration.count({ where: { ...LIVE, ...where } }),
  ]);
  return { items: items as ConfigurationRow[], total };
}

export async function findByKey(
  key: string,
  includeDeleted = false,
): Promise<ConfigurationRow | null> {
  const row = await prisma.configuration.findFirst({
    where: includeDeleted ? { key } : { key, ...LIVE },
    select: configurationSelect,
  });
  return row as unknown as ConfigurationRow | null;
}

export async function createConfiguration(data: {
  categoryId: string;
  key: string;
  name: string;
  description: string | null;
  value: Prisma.JsonValue;
  valueType: ConfigurationValueType;
  isSystem: boolean;
  createdById: string | null;
  actorId: string | null;
}): Promise<ConfigurationRow> {
  const row = await prisma.configuration.create({
    data: {
      categoryId: data.categoryId,
      key: data.key,
      name: data.name,
      description: data.description,
      value: data.value as Prisma.InputJsonValue,
      valueType: data.valueType,
      isSystem: data.isSystem,
      version: 1,
      createdBy: data.createdById,
      updatedBy: data.createdById,
      versions: {
        create: {
          version: 1,
          value: data.value as Prisma.InputJsonValue,
          changeNote: "Initial value",
          changedById: data.actorId,
        },
      },
      history: {
        create: {
          action: "CREATED",
          newValue: data.value as Prisma.InputJsonValue,
          versionTo: 1,
          actorId: data.actorId,
        },
      },
    },
    select: configurationSelect,
  });
  return row as unknown as ConfigurationRow;
}

export interface UpdateTx {
  id: string;
  value: Prisma.JsonValue;
  version: number;
  changeNote: string | null;
  actorId: string | null;
  updatedById: string | null;
  action: ConfigurationAction;
  oldValue: Prisma.JsonValue | null;
  versionFrom: number | null;
}

export async function updateValueInTx(
  tx: Prisma.TransactionClient,
  input: UpdateTx,
): Promise<ConfigurationRow> {
  const row = await tx.configuration.update({
    where: { id: input.id },
    data: {
      value: input.value as Prisma.InputJsonValue,
      version: input.version,
      updatedBy: input.updatedById,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: configurationSelect,
  });
  await tx.configurationVersion.create({
    data: {
      configurationId: input.id,
      version: input.version,
      value: input.value as Prisma.InputJsonValue,
      changeNote: input.changeNote,
      changedById: input.actorId,
    },
  });
  await tx.configurationHistory.create({
    data: {
      configurationId: input.id,
      action: input.action,
      oldValue: (input.oldValue ?? null) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      newValue: input.value as Prisma.InputJsonValue,
      versionFrom: input.versionFrom,
      versionTo: input.version,
      actorId: input.actorId,
    },
  });
  return row as unknown as ConfigurationRow;
}

export async function setDeleted(
  id: string,
  deletedAt: Date,
  actorId: string,
  action: "DELETED" | "RESTORED",
): Promise<ConfigurationRow> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.configuration.update({
      where: { id },
      data: {
        deletedAt: action === "DELETED" ? deletedAt : null,
        updatedBy: actorId,
      },
      select: configurationSelect,
    });
    await tx.configurationHistory.create({
      data: {
        configurationId: id,
        action,
        versionFrom: row.version,
        versionTo: row.version,
        actorId,
      },
    });
    return row as unknown as ConfigurationRow;
  });
}

export async function listVersions(configurationId: string): Promise<
  {
    id: string;
    version: number;
    value: Prisma.JsonValue;
    changeNote: string | null;
    changedById: string | null;
    changedBy: { firstName: string; lastName: string } | null;
    createdAt: Date;
  }[]
> {
  return prisma.configurationVersion.findMany({
    where: { configurationId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      value: true,
      changeNote: true,
      changedById: true,
      changedBy: { select: { firstName: true, lastName: true } },
      createdAt: true,
    },
  });
}

export async function findVersion(
  configurationId: string,
  version: number,
): Promise<{ value: Prisma.JsonValue; version: number } | null> {
  return prisma.configurationVersion.findUnique({
    where: { configurationId_version: { configurationId, version } },
    select: { value: true, version: true },
  });
}

export async function listHistory(
  where: Prisma.ConfigurationHistoryWhereInput,
  page: number,
  pageSize: number,
): Promise<{ items: ConfigurationHistoryRow[]; total: number }> {
  const historySelect = {
    id: true,
    configurationId: true,
    action: true,
    oldValue: true,
    newValue: true,
    versionFrom: true,
    versionTo: true,
    actorId: true,
    createdAt: true,
    configuration: {
      select: {
        key: true,
        name: true,
        category: { select: { code: true } },
      },
    },
    actor: { select: { firstName: true, lastName: true } },
  } satisfies Prisma.ConfigurationHistorySelect;

  const [items, total] = await Promise.all([
    prisma.configurationHistory.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: historySelect,
    }),
    prisma.configurationHistory.count({ where }),
  ]);
  return { items: items as unknown as ConfigurationHistoryRow[], total };
}

export interface ConfigurationHistoryRow {
  id: string;
  configurationId: string;
  action: ConfigurationAction;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  createdAt: Date;
  configuration: { key: string; name: string; category: { code: string } };
  actor: { firstName: string; lastName: string } | null;
}

export async function recentHistory(limit: number): Promise<ConfigurationHistoryRow[]> {
  const { items } = await listHistory({}, 1, limit);
  return items;
}
