import { env } from "@/config/env";
import { AUDIT_ACTIONS } from "@/config/constants";
import { logger } from "@/utils/logger";
import { writeAudit } from "@/modules/audit/audit.service";
import type { EmailMessageInput } from "@/modules/email/email.types";
import {
  claimDueMessages,
  enqueueMessages,
  markFailed,
  markSent,
} from "@/modules/email/email.repository";
import { getEmailProvider } from "@/modules/email/email.providers";

// =============================================================================
// URS-DMS — Email service (Sprint 7.3)
// -----------------------------------------------------------------------------
// Public surface:
//   * sendEmail(input)  — persist + kick a processing pass (fire-and-forget).
//   * processQueue(n)   — claim due rows, deliver via the configured provider,
//                         settle SENT / FAILED. Idempotent; safe to call
//                         anywhere (route handlers, worker tick).
//   * startEmailWorker()— periodic in-process drain (guarded singleton).
//
// Delivery semantics: at-least-once. A message that fails delivery is NOT
// lost — it returns to PENDING with an exponential backoff (30s, 1m, 2m, ...
// capped at 30min) until `maxAttempts` is exhausted, at which point it lands
// in terminal FAILED and is surfaced via the `email.failed` audit action.
// EMAIL_SENT / EMAIL_FAILED audit entries carry the recipient + subject so
// the Audit Center can trace outbound mail without leaking bodies.
//
// The in-process worker is the Sprint 1 delivery mechanism; the durable queue
// is designed so a future background worker (separate process) can take over
// by running the same claim logic — no contract change needed.
// =============================================================================

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 30 * 60 * 1000;

function nextBackoffDelayMs(attempts: number): number {
  // attempts = the attempt count AFTER this failure (1-based).
  return Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_CAP_MS);
}

export async function sendEmail(input: EmailMessageInput): Promise<void> {
  await enqueueMessages([input], getEmailProvider().name);
  // Sprint 8.5 — kick BullMQ worker as primary delivery path; fallback to
  // in-process processQueue for development environments without Redis.
  try {
    const { enqueue, QUEUE_NAMES } = await import("@/lib/queue");
    await enqueue(QUEUE_NAMES.EMAIL_DELIVERY, { batchSize: 10 });
  } catch {
    void processQueue().catch((err) => {
      logger.error("[email] immediate processing pass failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

export async function processQueue(batchSize = 10): Promise<number> {
  const provider = getEmailProvider();
  const claimed = await claimDueMessages(batchSize);
  if (claimed.length === 0) return 0;

  for (const row of claimed) {
    try {
      await provider.send({
        to: row.to,
        subject: row.subject,
        body: row.body,
      });
      await markSent(row.id);
      void writeAudit({
        action: AUDIT_ACTIONS.EMAIL_SENT,
        entity: "email_message",
        entityId: row.id,
        newValue: { to: row.to, subject: row.subject },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = row.attempts + 1;
      const terminal = attempts >= row.maxAttempts;
      const nextAttemptAt = terminal
        ? null
        : new Date(Date.now() + nextBackoffDelayMs(attempts));
      await markFailed(row.id, message, nextAttemptAt);
      if (terminal) {
        logger.error("[email] message failed permanently", {
          id: row.id,
          to: row.to,
          subject: row.subject,
          err: message,
        });
        void writeAudit({
          action: AUDIT_ACTIONS.EMAIL_FAILED,
          entity: "email_message",
          entityId: row.id,
          newValue: { to: row.to, subject: row.subject, attempts, error: message },
        });
      } else {
        logger.warn("[email] transient delivery failure, will retry", {
          id: row.id,
          to: row.to,
          subject: row.subject,
          attempts,
          nextAttemptAt,
          err: message,
        });
      }
    }
  }
  return claimed.length;
}

// -----------------------------------------------------------------------------
// In-process worker
// -----------------------------------------------------------------------------
let workerTimer: NodeJS.Timeout | null = null;

export function startEmailWorker(options?: {
  intervalMs?: number;
  batchSize?: number;
}): void {
  if (workerTimer) return;
  if (env.NODE_ENV === "test") return;
  const { intervalMs = 15_000, batchSize = 10 } = options ?? {};
  workerTimer = setInterval(() => {
    void processQueue(batchSize).catch((err) => {
      logger.error("[email:worker] tick failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }, intervalMs);
  workerTimer.unref?.();
}
