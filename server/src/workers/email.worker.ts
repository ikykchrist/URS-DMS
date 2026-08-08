// =============================================================================
// URS-DMS — Email delivery worker (BullMQ, Sprint 8.5)
// Replaces the in-process setInterval poller in email.service.ts.
// The existing claimDueMessages / markSent / markFailed repository functions
// are reused directly. Each BullMQ job delivers one claimed message batch.
// =============================================================================

import type { Job } from "bullmq";
import { logger } from "@/utils/logger";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";
import { getEmailProvider } from "@/modules/email/email.providers";
import {
  claimDueMessages,
  markFailed,
  markSent,
} from "@/modules/email/email.repository";

export interface EmailJobData {
  batchSize: number;
}

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 30 * 60 * 1000;

function nextBackoffDelayMs(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_CAP_MS);
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<number> {
  const provider = getEmailProvider();
  const batchSize = job.data.batchSize ?? 10;
  const claimed = await claimDueMessages(batchSize);

  if (claimed.length === 0) return 0;

  for (const row of claimed) {
    try {
      await provider.send({ to: row.to, subject: row.subject, body: row.body });
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
        logger.error("[email:worker] message failed permanently", { id: row.id, to: row.to, err: message });
        void writeAudit({
          action: AUDIT_ACTIONS.EMAIL_FAILED,
          entity: "email_message",
          entityId: row.id,
          newValue: { to: row.to, subject: row.subject, attempts, error: message },
        });
      } else {
        logger.warn("[email:worker] transient failure, will retry", { id: row.id, to: row.to, attempts });
      }
    }
  }
  return claimed.length;
}
