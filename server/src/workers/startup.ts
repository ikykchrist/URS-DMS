// =============================================================================
// URS-DMS — BullMQ worker processes (Sprint 8.5)
// Each worker handles one queue. Register all workers at server startup.
// Generated ZIPs expire after ZIP_EXPIRATION_SECONDS.
// =============================================================================

import { createWorker, registerWorker, QUEUE_NAMES } from "@/lib/queue";
import { processFolderCopyJob } from "@/workers/folderCopy.worker";
import { processFolderZipJob } from "@/workers/folderZip.worker";
import { processEmailJob } from "@/workers/email.worker";
import { processMaintenanceJob } from "@/workers/maintenance.worker";
import { env } from "@/config/env";

export function startAllWorkers(): void {
  registerWorker(
    QUEUE_NAMES.FOLDER_COPY,
    createWorker(QUEUE_NAMES.FOLDER_COPY, processFolderCopyJob, env.WORKER_CONCURRENCY),
  );

  registerWorker(
    QUEUE_NAMES.FOLDER_ZIP,
    createWorker(QUEUE_NAMES.FOLDER_ZIP, processFolderZipJob, 1),
  );

  registerWorker(
    QUEUE_NAMES.EMAIL_DELIVERY,
    createWorker(QUEUE_NAMES.EMAIL_DELIVERY, processEmailJob, 2),
  );

  registerWorker(
    QUEUE_NAMES.MAINTENANCE,
    createWorker(QUEUE_NAMES.MAINTENANCE, processMaintenanceJob, 1),
  );
}
