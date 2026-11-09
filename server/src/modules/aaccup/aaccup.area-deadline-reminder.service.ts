import { Prisma, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/modules/notifications/notifications.service";
import { logger } from "@/utils/logger";

type AreaReminder = { key: string; type: NotificationType; label: string };

function utcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function areaReminderFor(dueDate: Date, now: Date): AreaReminder | null {
  const days = Math.floor((utcDay(dueDate) - utcDay(now)) / 86_400_000);
  if (days === 90) return { key: "DUE_3_MONTHS", type: "AACCUP_AREA_DUE_IN_3_MONTHS", label: "in 3 months" };
  if (days === 30) return { key: "DUE_1_MONTH", type: "AACCUP_AREA_DUE_IN_1_MONTH", label: "in 1 month" };
  if (days === 7) return { key: "DUE_7_DAYS", type: "AACCUP_AREA_DUE_IN_7_DAYS", label: "in 7 days" };
  if (days === 3) return { key: "DUE_3_DAYS", type: "AACCUP_AREA_DUE_IN_3_DAYS", label: "in 3 days" };
  return null;
}

async function recipientsForArea(area: { campusId: string | null; collegeId: string | null; programId: string | null }) {
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE", deletedAt: null,
      OR: [
        ...(area.programId ? [{ programId: area.programId }] : []),
        ...(area.collegeId ? [{ collegeId: area.collegeId, programId: null }] : []),
        { role: { permissions: { some: { permission: { code: "aaccup.manage" } } } } },
      ],
    },
    select: { id: true },
  });
  return [...new Set(users.map((user) => user.id))];
}

export async function runAreaDeadlineReminderSweep(now = new Date()): Promise<number> {
  const areas = await prisma.aaccupArea.findMany({
    where: { deletedAt: null, status: "ACTIVE", dueDate: { not: null } },
    select: { id: true, name: true, areaSet: true, dueDate: true, campusId: true, collegeId: true, programId: true },
  });
  let sent = 0;
  for (const area of areas) {
    if (!area.dueDate) continue;
    const reminder = areaReminderFor(area.dueDate, now);
    if (!reminder) continue;
    for (const userId of await recipientsForArea(area)) {
      try {
        await prisma.aaccupAreaDeadlineReminder.create({ data: { areaId: area.id, userId, reminderKey: reminder.key } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
      await notifyUser(userId, reminder.type, {
        title: `${area.areaSet} area deadline ${reminder.label}`,
        message: `“${area.name}” and all required files are due ${reminder.label}.`,
        entity: "aaccup_area", entityId: area.id,
        actionUrl: `/user/${area.areaSet === "ISO" ? "iso" : "aaccup"}?area=${encodeURIComponent(area.id)}`,
        metadata: { areaSet: area.areaSet, dueDate: area.dueDate.toISOString(), reminderKey: reminder.key },
      });
      sent += 1;
    }
  }
  return sent;
}

let timer: NodeJS.Timeout | null = null;
export function startAreaDeadlineReminderWorker(options?: { intervalMs?: number }): void {
  if (timer || process.env.NODE_ENV === "test") return;
  const tick = () => void runAreaDeadlineReminderSweep().catch((error) => logger.error("[aaccup:area-deadlines] sweep failed", { err: error instanceof Error ? error.message : String(error) }));
  tick();
  timer = setInterval(tick, options?.intervalMs ?? 60_000);
  timer.unref?.();
}
