import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// =============================================================================
// Workflow Builder — repository (dumb Prisma wrappers; business rules live in
// workflow.service.ts / workflow.engine.ts).
// =============================================================================

export type WorkflowDefinitionRow = Prisma.WorkflowDefinitionGetPayload<{
  include: {
    createdByUser: { select: { firstName: true; lastName: true } };
    updatedByUser: { select: { firstName: true; lastName: true } };
    _count: { select: { steps: true; transitions: true; assignments: true; instances: true } };
  };
}>;

export type WorkflowStepRow = Prisma.WorkflowStepGetPayload<Record<string, never>>;
export type WorkflowTransitionRow = Prisma.WorkflowTransitionGetPayload<Record<string, never>>;
export type WorkflowAssignmentRow = Prisma.WorkflowAssignmentGetPayload<Record<string, never>>;
export type WorkflowVersionRow = Prisma.WorkflowVersionGetPayload<{
  include: {
    changedBy: { select: { firstName: true; lastName: true } };
    definition: { select: { name: true } };
  };
}>;
export type WorkflowHistoryRow = Prisma.WorkflowHistoryGetPayload<{
  include: { actor: { select: { firstName: true; lastName: true } } };
}>;

export function listDefinitions(args: Prisma.WorkflowDefinitionFindManyArgs): Promise<WorkflowDefinitionRow[]> {
  return prisma.workflowDefinition.findMany(args) as Promise<WorkflowDefinitionRow[]>;
}

export function countDefinitions(args: Prisma.WorkflowDefinitionCountArgs): Promise<number> {
  return prisma.workflowDefinition.count(args);
}

export function findDefinition(id: string): Promise<WorkflowDefinitionRow | null> {
  return prisma.workflowDefinition.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { firstName: true, lastName: true } },
      updatedByUser: { select: { firstName: true, lastName: true } },
      _count: { select: { steps: true, transitions: true, assignments: true, instances: true } },
    },
  }) as Promise<WorkflowDefinitionRow | null>;
}

export function findDefinitionByCode(code: string): Promise<{ id: string } | null> {
  return prisma.workflowDefinition.findFirst({ where: { code }, select: { id: true } });
}

export function listSteps(definitionId: string): Promise<WorkflowStepRow[]> {
  return prisma.workflowStep.findMany({
    where: { definitionId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  }) as Promise<WorkflowStepRow[]>;
}

export function findStep(definitionId: string, stepId: string): Promise<WorkflowStepRow | null> {
  return prisma.workflowStep.findFirst({
    where: { id: stepId, definitionId },
  }) as Promise<WorkflowStepRow | null>;
}

export function listTransitions(definitionId: string): Promise<WorkflowTransitionRow[]> {
  return prisma.workflowTransition.findMany({
    where: { definitionId },
    orderBy: [{ sortOrder: "asc" }, { actionCode: "asc" }],
  }) as Promise<WorkflowTransitionRow[]>;
}

export function findTransition(definitionId: string, transitionId: string): Promise<WorkflowTransitionRow | null> {
  return prisma.workflowTransition.findFirst({
    where: { id: transitionId, definitionId },
  }) as Promise<WorkflowTransitionRow | null>;
}

export function listAssignments(args: Prisma.WorkflowAssignmentFindManyArgs): Promise<WorkflowAssignmentRow[]> {
  return prisma.workflowAssignment.findMany(args) as Promise<WorkflowAssignmentRow[]>;
}

export function listVersions(definitionId: string): Promise<WorkflowVersionRow[]> {
  return prisma.workflowVersion.findMany({
    where: { definitionId },
    orderBy: { version: "desc" },
    include: {
      changedBy: { select: { firstName: true, lastName: true } },
      definition: { select: { name: true } },
    },
  }) as Promise<WorkflowVersionRow[]>;
}

export function findVersion(definitionId: string, version: number): Promise<WorkflowVersionRow | null> {
  return prisma.workflowVersion.findFirst({
    where: { definitionId, version },
    include: {
      changedBy: { select: { firstName: true, lastName: true } },
      definition: { select: { name: true } },
    },
  }) as Promise<WorkflowVersionRow | null>;
}

export function listHistory(args: Prisma.WorkflowHistoryFindManyArgs): Promise<WorkflowHistoryRow[]> {
  return prisma.workflowHistory.findMany(args) as Promise<WorkflowHistoryRow[]>;
}

export function countHistory(args: Prisma.WorkflowHistoryCountArgs): Promise<number> {
  return prisma.workflowHistory.count(args);
}

export function listInstances(args: Prisma.WorkflowInstanceFindManyArgs): Promise<Prisma.WorkflowInstanceGetPayload<Record<string, never>>[]> {
  return prisma.workflowInstance.findMany(args) as Promise<Prisma.WorkflowInstanceGetPayload<Record<string, never>>[]>;
}

export function countInstances(args: Prisma.WorkflowInstanceCountArgs): Promise<number> {
  return prisma.workflowInstance.count(args);
}

export function findInstance(id: string): Promise<Prisma.WorkflowInstanceGetPayload<Record<string, never>> | null> {
  return prisma.workflowInstance.findUnique({ where: { id } }) as Promise<
    Prisma.WorkflowInstanceGetPayload<Record<string, never>> | null
  >;
}
