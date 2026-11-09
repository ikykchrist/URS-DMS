import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/notifications/notifications.service";
import { logger } from "@/utils/logger";

type ReminderKind =
  | { key: "DUE_7_DAYS"; type: "AACCUP_TASK_DUE_SOON"; label: "in 7 days" }
  | { key: "DUE_3_DAYS"; type: "AACCUP_TASK_DUE_IN_3_DAYS"; label: "in 3 days" }
  | { key: "DUE_TOMORROW"; type: "AACCUP_TASK_DUE_TOMORROW"; label: "tomorrow" }
  | { key: "DUE_TODAY"; type: "AACCUP_TASK_DUE_TODAY"; label: "today" }
  | { key: string; type: "AACCUP_TASK_OVERDUE"; label: "overdue" };

function utcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function reminderFor(dueDate: Date, now: Date): ReminderKind | null {
  const days = Math.floor((utcDay(dueDate) - utcDay(now)) / 86_400_000);
  if (days < 0) {
    return { key: `OVERDUE_${now.toISOString().slice(0, 10)}`, type: "AACCUP_TASK_OVERDUE", label: "overdue" };
  }
  if (days === 0) return { key: "DUE_TODAY", type: "AACCUP_TASK_DUE_TODAY", label: "today" };
  if (days === 1) return { key: "DUE_TOMORROW", type: "AACCUP_TASK_DUE_TOMORROW", label: "tomorrow" };
  if (days <= 3) return { key: "DUE_3_DAYS", type: "AACCUP_TASK_DUE_IN_3_DAYS", label: "in 3 days" };
  if (days <= 7) return { key: "DUE_7_DAYS", type: "AACCUP_TASK_DUE_SOON", label: "in 7 days" };
  return null;
}

async function recipientsForTask(task: { assigneeType: string; assigneeId: string | null }): Promise<string[]> {
  if (!task.assigneeId) return [];
  if (task.assigneeType === "USER") return [task.assigneeId];
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        { programId: task.assigneeId },
        { role: { permissions: { some: { permission: { code: "aaccup.manage" } } } } },
      ],
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function runTaskReminderSweep(now = new Date()): Promise<number> {
  const tasks = await prisma.aaccupTask.findMany({
    where: {
      deletedAt: null,
      dueDate: { not: null },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      area: { deletedAt: null, status: "ACTIVE" },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeType: true,
      assigneeId: true,
      area: { select: { name: true, areaSet: true } },
    },
  });
  let sent = 0;
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const reminder = reminderFor(task.dueDate, now);
    if (!reminder) continue;
    const recipients = await recipientsForTask(task);
    for (const userId of recipients) {
      try {
        await prisma.aaccupTaskReminder.create({
          data: { taskId: task.id, userId, reminderKey: reminder.key },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
      await notifyUser(userId, reminder.type, {
        title: reminder.type === "AACCUP_TASK_OVERDUE" ? "Accreditation task overdue" : `Accreditation task due ${reminder.label}`,
        message: `"${task.title}" for ${task.area.name} is due ${reminder.label}. Complete and submit all required evidence.`,
        entity: "aaccup_task",
        entityId: task.id,
        actionUrl: `/user/aaccup?tab=tasks&highlight=${encodeURIComponent(task.id)}`,
        metadata: { areaSet: task.area.areaSet, dueDate: task.dueDate.toISOString(), reminderKey: reminder.key },
      });
      sent += 1;
    }
  }
  return sent;
}

let reminderTimer: NodeJS.Timeout | null = null;

export function startTaskReminderWorker(options?: { intervalMs?: number }): void {
  if (reminderTimer) return;
  if (process.env.NODE_ENV === "test") return;
  const intervalMs = options?.intervalMs ?? 60_000;
  const tick = () => {
    void runTaskReminderSweep().catch((error) => {
      logger.error("[aaccup:task-reminders] sweep failed", {
        err: error instanceof Error ? error.message : String(error),
      });
    });
  };
  tick();
  reminderTimer = setInterval(tick, intervalMs);
  reminderTimer.unref?.();
}
