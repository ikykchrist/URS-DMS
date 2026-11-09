import { Prisma, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser, notifyUsers } from "@/modules/notifications/notifications.service";
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

type AreaScope = { campusId: string | null; collegeId: string | null; programId: string | null };

export function affectedUserWhere(area: AreaScope) {
  return {
    status: "ACTIVE" as const,
    deletedAt: null,
    ...(area.campusId ? { campusId: area.campusId } : {}),
    ...(area.collegeId ? { collegeId: area.collegeId } : {}),
    ...(area.programId ? { programId: area.programId } : {}),
  };
}

export async function affectedUserIdsForArea(area: AreaScope): Promise<string[]> {
  const users = await prisma.user.findMany({ where: affectedUserWhere(area), select: { id: true } });
  return users.map((user) => user.id);
}

async function reminderRecipientsForArea(area: AreaScope) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        affectedUserWhere(area),
        { role: { permissions: { some: { permission: { code: "aaccup.manage" } } } } },
      ],
    },
    select: { id: true },
  });
  return [...new Set(users.map((user) => user.id))];
}

export async function announceAreaDeadline(area: AreaScope & { id: string; name: string; areaSet: string; dueDate: Date }): Promise<number> {
  const userIds = await affectedUserIdsForArea(area);
  if (userIds.length === 0) return 0;
  const deadline = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" }).format(area.dueDate);
  return notifyUsers(userIds, "AACCUP_AREA_DEADLINE_SET", {
    title: `${area.areaSet} area deadline set`,
    message: `“${area.name}” and all required files are due on ${deadline}.`,
    entity: "aaccup_area",
    entityId: area.id,
    actionUrl: `/user/${area.areaSet === "ISO" ? "iso" : "aaccup"}?area=${encodeURIComponent(area.id)}`,
    metadata: { areaSet: area.areaSet, dueDate: area.dueDate.toISOString() },
    email: {
      subject: `URS-DMS — ${area.areaSet} area deadline: ${area.name}`,
      body: `<p>The deadline for <strong>${area.name}</strong> and all required files is <strong>${deadline}</strong>.</p><p>Open URS-DMS to review the area requirements and submit the required evidence.</p>`,
    },
  });
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
    for (const userId of await reminderRecipientsForArea(area)) {
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
