import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ensureBucket } from "@/lib/storage";
import { redisHealth } from "@/lib/redis";
import { getQueueMetrics, QUEUE_NAMES } from "@/lib/queue";
import { env } from "@/config/env";
import { sendSuccess } from "@/utils/apiResponse";

// =============================================================================
// URS-DMS — health route (Sprint 8.5: added Redis + BullMQ)
// =============================================================================

export const healthRouter: Router = Router();

healthRouter.get("/", async (_req, res, next) => {
  try {
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
    let minioBucketExists = false;
    try {
      await ensureBucket();
      minioOk = true;
      minioBucketExists = true;
    } catch {
      minioOk = false;
      minioBucketExists = false;
    }

    const redis = await redisHealth();

    let queueMetrics: Record<string, unknown> = {};
    try {
      const [copy, zip, email, maint] = await Promise.all([
        getQueueMetrics(QUEUE_NAMES.FOLDER_COPY).catch(() => null),
        getQueueMetrics(QUEUE_NAMES.FOLDER_ZIP).catch(() => null),
        getQueueMetrics(QUEUE_NAMES.EMAIL_DELIVERY).catch(() => null),
        getQueueMetrics(QUEUE_NAMES.MAINTENANCE).catch(() => null),
      ]);
      queueMetrics = {
        folderCopy: copy ?? { status: "unavailable" },
        folderZip: zip ?? { status: "unavailable" },
        emailDelivery: email ?? { status: "unavailable" },
        maintenance: maint ?? { status: "unavailable" },
      };
    } catch {
      queueMetrics = { status: "unavailable" };
    }

    const status = dbOk && minioOk && redis.status === "up" ? "ok" : "degraded";
    sendSuccess(
      res,
      {
        status,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? "development",
        uptime: Math.round(process.uptime() * 100) / 100,
        services: {
          database: { status: dbOk ? "up" : "down", latencyMs: dbLatencyMs },
          minio: {
            status: minioOk ? "up" : "down",
            bucket: env.MINIO_BUCKET,
            exists: minioBucketExists,
          },
          redis,
        },
        queues: queueMetrics,
        memory: {
          rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
      },
      200,
      { version: process.env.npm_package_version ?? "1.0.0" },
    );
  } catch (err) {
    next(err);
  }
});
