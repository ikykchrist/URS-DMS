import { prisma } from "@/lib/prisma";
import { ensureBucket } from "@/lib/storage";
import { env } from "@/config/env";
import { ForbiddenError } from "@/utils/errors";
import {
  configCacheStats,
  recentConfigurationChanges,
} from "@/modules/root/root.config.service";
import type { ConfigurationHistoryView } from "@/modules/root/root.config.types";

// =============================================================================
// URS-DMS — Root · Platform Overview service (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Aggregates the Platform Overview dashboard cards for the Root Console:
// Platform Status / Configuration Version / Active Modules / Storage Usage /
// Database Status / MinIO Status / API Status / Queue Status / Recent
// Configuration Changes. The DB + MinIO probes mirror the health endpoint
// (`modules/health`) so the console and the ops probe report the same facts.
// Read-only — no audit entries (project convention, AI_CONTEXT §8).
// =============================================================================

export interface Actor {
  id: string;
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface PlatformOverview {
  platform: {
    status: "ok" | "degraded";
    uptimeSeconds: number;
    environment: string;
    version: string;
    timestamp: string;
  };
  configuration: {
    totalConfigs: number;
    totalVersions: number;
    currentVersion: number;
    lastUpdated: string | null;
    cache: { size: number; ttlMs: number };
  };
  activeModules: { module: string; permissionCount: number }[];
  storage: {
    totalDocuments: number;
    totalBytes: string;
    archivedDocuments: number;
  };
  database: { status: "up" | "down"; latencyMs: number };
  minio: { status: "up" | "down"; bucket: string; exists: boolean };
  api: { status: "up"; version: string; routesMounted: string };
  queue: {
    emailPending: number;
    emailFailed: number;
    emailTotal: number;
  };
  recentChanges: ConfigurationHistoryView[];
}

function assertCanAccess(actor: Actor): void {
  if (!actor.permissions.includes("root.access")) {
    throw new ForbiddenError("You do not have access to the Root Console");
  }
}

export async function getPlatformOverview(actor: Actor): Promise<PlatformOverview> {
  assertCanAccess(actor);

  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let minioOk = false;
  try {
    await ensureBucket();
    minioOk = true;
  } catch {
    minioOk = false;
  }

  const [
    configCount,
    versionCount,
    maxVersion,
    lastConfigUpdate,
    modules,
    docCounts,
    emailCounts,
    recent,
  ] = await Promise.all([
    prisma.configuration.count({ where: { deletedAt: null } }),
    prisma.configurationVersion.count(),
    prisma.configuration.aggregate({ _max: { version: true } }),
    prisma.configuration.aggregate({ _max: { updatedAt: true } }),
    prisma.permission.groupBy({
      by: ["module"],
      _count: { _all: true },
      orderBy: { module: "asc" },
    }),
    prisma.document.groupBy({
      by: ["deletedAt"],
      _count: { _all: true },
    }),
    prisma.emailMessage.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    recentConfigurationChanges(5),
  ]);

  const liveDocs =
    docCounts.find((d) => d.deletedAt === null)?._count._all ?? docCounts.reduce((s, d) => s + d._count._all, 0);
  const archivedDocs =
    docCounts.find((d) => d.deletedAt !== null)?._count._all ?? 0;

  // sizeBytes is BigInt — summed in SQL, serialized as string (AI_CONTEXT §6).
  const bytes = await prisma.documentVersion.aggregate({
    _sum: { sizeBytes: true },
  });

  const status = dbOk && minioOk ? "ok" : "degraded";

  return {
    platform: {
      status,
      uptimeSeconds: Math.round(process.uptime() * 100) / 100,
      environment: process.env.NODE_ENV ?? "development",
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
    },
    configuration: {
      totalConfigs: configCount,
      totalVersions: versionCount,
      currentVersion: maxVersion._max.version ?? 0,
      lastUpdated: lastConfigUpdate._max.updatedAt?.toISOString() ?? null,
      cache: configCacheStats(),
    },
    activeModules: modules.map((m) => ({ module: m.module, permissionCount: m._count._all })),
    storage: {
      totalDocuments: liveDocs,
      totalBytes: (bytes._sum.sizeBytes ?? 0n).toString(),
      archivedDocuments: archivedDocs,
    },
    database: { status: dbOk ? "up" : "down", latencyMs: dbLatencyMs },
    minio: { status: minioOk ? "up" : "down", bucket: env.MINIO_BUCKET, exists: minioOk },
    api: {
      status: "up",
      version: process.env.npm_package_version ?? "1.0.0",
      routesMounted: "/api/v1 (root, admin, auth, documents, aaccup, ...)",
    },
    queue: {
      emailPending:
        (emailCounts.find((e) => e.status === "PENDING")?._count._all ?? 0) +
        (emailCounts.find((e) => e.status === "SENDING")?._count._all ?? 0),
      emailFailed: emailCounts.find((e) => e.status === "FAILED")?._count._all ?? 0,
      emailTotal: emailCounts.reduce((s, e) => s + e._count._all, 0),
    },
    recentChanges: recent,
  };
}
