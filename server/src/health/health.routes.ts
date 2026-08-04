import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ensureBucket } from "@/lib/storage";
import { env } from "@/config/env";
import { sendSuccess } from "@/utils/apiResponse";

// =============================================================================
// URS-DMS — health route
// Sprint 1 contract: { status, timestamp, environment, uptime, services }
// Reports both database and MinIO status. "degraded" if any dependency is down.
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

    // MinIO probe: best-effort ensureBucket(). Idempotent, so safe on every
    // health check. Reports the bucket name + existence flag.
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

    const status = dbOk && minioOk ? "ok" : "degraded";
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
        },
      },
      200,
      { version: process.env.npm_package_version ?? "1.0.0" },
    );
  } catch (err) {
    next(err);
  }
});
