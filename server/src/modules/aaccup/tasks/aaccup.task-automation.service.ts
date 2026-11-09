import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { notifyUsers } from "@/modules/notifications/notifications.service";
import { writeAudit } from "@/modules/audit/audit.service";
import * as taskRepo from "@/modules/aaccup/tasks/aaccup.tasks.repository";

interface SharedTaskInput {
  areaId: string;
  assignmentId: string;
  templateId: string;
  dueDate: Date | null;
  actorId: string;
}

async function notifyTaskAudience(taskId: string, title: string, programId: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        { programId },
        { role: { permissions: { some: { permission: { code: "aaccup.manage" } } } } },
      ],
    },
    select: { id: true },
  });
  await notifyUsers(users.map((user) => user.id), "AACCUP_TASK_ASSIGNED", {
    title: "New accreditation task assigned",
    message: `Complete the required evidence for "${title}" before the deadline.`,
    entity: "aaccup_task",
    entityId: taskId,
    actionUrl: `/user/aaccup?tab=tasks&highlight=${encodeURIComponent(taskId)}`,
  });
}

/** Creates or updates exactly one shared task for an area/template assignment. */
export async function ensureSharedTaskForArea(input: SharedTaskInput): Promise<void> {
  const [area, template] = await Promise.all([
    prisma.aaccupArea.findFirst({
      where: { id: input.areaId, deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true, programId: true },
    }),
    prisma.requirementTemplate.findFirst({
      where: { id: input.templateId, deletedAt: null, status: "ACTIVE" },
      select: { id: true, name: true },
    }),
  ]);
  if (!area?.programId || !template) return;

  const title = `Complete ${template.name} requirements — ${area.name}`;
  const existing = await prisma.aaccupTask.findFirst({
    where: {
      areaId: input.areaId,
      sourceAssignmentId: input.assignmentId,
      deletedAt: null,
    },
    select: { id: true, title: true, dueDate: true, status: true },
  });

  if (existing) {
    await prisma.aaccupTask.update({
      where: { id: existing.id },
      data: { title, dueDate: input.dueDate, updatedBy: input.actorId },
    });
    return;
  }

  const task = await taskRepo.create({
    areaId: input.areaId,
    title,
    description: `Shared task for all active users in the assigned program. Evidence must be approved before the task can be completed.`,
    category: "requirement-template",
    priority: "MEDIUM",
    dueDate: input.dueDate,
    requirementId: null,
    requirementTemplateId: input.templateId,
    sourceAssignmentId: input.assignmentId,
    assigneeType: "PROGRAM",
    assigneeId: area.programId,
    assigneeLabel: "Program members",
    createdBy: input.actorId,
  });

  await writeAudit({
    action: AUDIT_ACTIONS.AACCUP_TASK_CREATED,
    userId: input.actorId,
    entity: "aaccup_task",
    entityId: task.id,
    newValue: { automated: true, areaId: input.areaId, templateId: input.templateId, assignmentId: input.assignmentId },
  });
  await notifyTaskAudience(task.id, title, area.programId);
}

/** Archives only automated tasks that no longer resolve from the assignment. */
export async function archiveAutomatedTasksForAreaTemplate(
  areaId: string,
  templateId: string,
  assignmentId: string | null,
  actorId: string,
): Promise<void> {
  const stale = await prisma.aaccupTask.findMany({
    where: {
      areaId,
      requirementTemplateId: templateId,
      sourceAssignmentId: assignmentId ? { not: assignmentId } : { not: null },
      deletedAt: null,
    },
    select: { id: true, status: true },
  });
  if (stale.length === 0) return;
  await prisma.aaccupTask.updateMany({
    where: { id: { in: stale.map((task) => task.id) } },
    data: { deletedAt: new Date(), updatedBy: actorId },
  });
}
