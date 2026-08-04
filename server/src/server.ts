import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { ensureBucket } from "@/lib/storage";
import { startEmailWorker } from "@/modules/email/email.service";
import { startRootSessionWatcher } from "@/modules/root/root.session";

// =============================================================================
// URS-DMS — server bootstrap with graceful shutdown.
// =============================================================================

async function boot(): Promise<void> {
  // Ensure MinIO bucket exists before serving traffic. Fail fast if storage
  // is unrecoverable — uploads/downloads cannot function without a bucket.
  try {
    await ensureBucket();
    logger.info(`MinIO bucket "${env.MINIO_BUCKET}" ready`);
  } catch (err) {
    logger.error("MinIO bucket bootstrap failed — aborting boot", {
      err: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

void boot()
  .then(() => {
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`URS-DMS server listening on port ${env.PORT} (${env.NODE_ENV})`);
    });

    // Sprint 7.3 — drain the durable email queue in-process (PENDING → SENT).
    // Guarded singleton; a future background worker can take over without a
    // contract change (see modules/email/email.service.ts).
    startEmailWorker();

    // Sprint 7.4.1 — audit ROOT session lifecycle (root.login / root.logout)
    // without touching the auth module (AI_CONTEXT §10): an in-process watcher
    // observes the Session table for ROOT users. See modules/root/root.session.ts.
    startRootSessionWatcher();

    const shutdown = (signal: string): void => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close((err) => {
        if (err) {
          logger.error("Error during server close", { err: err.message });
          process.exit(1);
        }
        process.exit(0);
      });

      // Force-kill after 10s
      setTimeout(() => {
        logger.warn("Forcing shutdown after 10s timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  })
  .catch((err) => {
    logger.error("Boot failed", { err: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });

// =============================================================================
// Global process handlers — attached synchronously so rejections raised
// during boot() are still caught.
// =============================================================================
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { err: err.message, stack: err.stack });
  process.exit(1);
});
