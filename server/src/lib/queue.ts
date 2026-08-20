import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import { getRedis } from "@/lib/redis";
import { logger } from "@/utils/logger";

export const QUEUE_NAMES = {
  FOLDER_COPY: "urs-folder-copy",
  FOLDER_ZIP: "urs-folder-zip",
  EMAIL_DELIVERY: "urs-email-delivery",
  MAINTENANCE: "urs-maintenance",
  DOCUMENT_THUMBNAIL: "urs-document-thumbnail",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
    queues.set(name, q);
  }
  return q;
}

export async function enqueue<T = Record<string, unknown>>(
  name: QueueName,
  data: T,
  opts?: JobsOptions,
): Promise<{ id: string; name: string }> {
  const q = getQueue(name);
  const job = await q.add(name, data, opts);
  return { id: job.id ?? "", name: job.name };
}

export function createWorker<T = Record<string, unknown>>(
  name: QueueName,
  processor: Processor<T>,
  concurrency = 3,
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: getRedis(),
    concurrency,
    autorun: true,
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  });

  worker.on("completed", (job) => {
    logger.info(`[queue:${name}] job completed`, { jobId: job.id });
  });
  worker.on("failed", (job, err) => {
    logger.error(`[queue:${name}] job failed`, {
      jobId: job?.id,
      err: err.message,
      attempts: job?.attemptsMade,
    });
  });

  return worker;
}

export async function getQueueMetrics(name: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const q = getQueue(name);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

const workers = new Map<QueueName, Worker>();

export function registerWorker<T = Record<string, unknown>>(
  name: QueueName,
  worker: Worker<T>,
): void {
  const existing = workers.get(name);
  if (existing) {
    void existing.close();
  }
  workers.set(name, worker);
}

export async function shutdownQueues(): Promise<void> {
  for (const [name, w] of workers) {
    logger.info(`[queue] closing worker: ${name}`);
    await w.close();
  }
  workers.clear();
  for (const [name, q] of queues) {
    logger.info(`[queue] closing queue: ${name}`);
    await q.close();
  }
  queues.clear();
}
