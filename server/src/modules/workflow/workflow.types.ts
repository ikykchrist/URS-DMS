import type { Prisma } from "@prisma/client";

export type WorkflowDefinitionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type WorkflowEntityType = "DOCUMENT_REQUEST" | "AACCUP_SUBMISSION" | "DOCUMENT";
export type WorkflowStepType = "START" | "TASK" | "REVIEW" | "APPROVAL" | "END";
export type WorkflowStepStatus = "ACTIVE" | "INACTIVE";
export type WorkflowChangeType =
  | "CREATED"
  | "UPDATED"
  | "VALIDATED"
  | "PUBLISHED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "ARCHIVED"
  | "RESTORED"
  | "ROLLED_BACK";
export type WorkflowInstanceStatus = "RUNNING" | "COMPLETED" | "TERMINATED";
export type WorkflowStepInstanceStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "SKIPPED";
export type WorkflowTargetType =
  | "UNIVERSITY"
  | "COLLEGE"
  | "DEPARTMENT"
  | "PROGRAM"
  | "OFFICE"
  | "AACCUP_AREA"
  | "ACCREDITATION_CYCLE";

export interface WorkflowDefinitionView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entityType: WorkflowEntityType;
  status: WorkflowDefinitionStatus;
  version: number;
  metadata: Prisma.JsonValue | null;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  stepCount: number;
  transitionCount: number;
  assignmentCount: number;
  instanceCount: number;
}

export interface WorkflowStepView {
  id: string;
  definitionId: string;
  code: string;
  name: string;
  description: string | null;
  type: WorkflowStepType;
  roleName: string | null;
  permissionCode: string | null;
  sortOrder: number;
  metadata: Prisma.JsonValue | null;
  status: WorkflowStepStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkflowTransitionView {
  id: string;
  definitionId: string;
  fromStepId: string;
  toStepId: string;
  actionCode: string;
  requiredPermission: string | null;
  metadata: Prisma.JsonValue | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkflowAssignmentView {
  id: string;
  definitionId: string;
  definitionName: string;
  targetType: WorkflowTargetType;
  targetId: string | null;
  targetName: string;
  priority: number;
  createdAt: Date;
}

export interface WorkflowVersionView {
  id: string;
  definitionId: string;
  definitionName: string;
  version: number;
  changeType: WorkflowChangeType;
  data: Prisma.JsonValue;
  changeNote: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface WorkflowHistoryView {
  id: string;
  definitionId: string;
  action: WorkflowChangeType;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface WorkflowDefinitionDetail extends WorkflowDefinitionView {
  steps: WorkflowStepView[];
  transitions: WorkflowTransitionView[];
  assignments: WorkflowAssignmentView[];
}

export interface WorkflowStepInstanceView {
  id: string;
  instanceId: string;
  stepId: string;
  stepCode: string;
  stepName: string;
  stepType: WorkflowStepType;
  status: WorkflowStepInstanceStatus;
  activatedAt: Date | null;
  completedAt: Date | null;
  actorId: string | null;
  actorName: string | null;
  note: string | null;
}

export interface WorkflowActionView {
  id: string;
  instanceId: string;
  stepId: string;
  stepCode: string;
  actionCode: string;
  fromStepId: string | null;
  toStepId: string | null;
  actorId: string | null;
  actorName: string | null;
  note: string | null;
  createdAt: Date;
}

export interface WorkflowInstanceView {
  id: string;
  definitionId: string;
  definitionName: string;
  definitionCode: string;
  version: number;
  entityType: WorkflowEntityType;
  entityId: string;
  status: WorkflowInstanceStatus;
  currentStepId: string | null;
  currentStepCode: string | null;
  currentStepName: string | null;
  currentStepType: WorkflowStepType | null;
  startedById: string | null;
  startedByName: string | null;
  startedAt: Date;
  completedAt: Date | null;
  stepInstances: WorkflowStepInstanceView[];
  actions: WorkflowActionView[];
  allowedActions: string[];
}

export interface WorkflowValidationIssue {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
  checksRun: number;
}

export interface WorkflowListResult<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// Snapshot stored inside workflow_versions.data — the immutable published
// shape that runtime instances execute against.
export interface WorkflowSnapshotStep {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: WorkflowStepType;
  roleName: string | null;
  permissionCode: string | null;
  sortOrder: number;
}

export interface WorkflowSnapshotTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  actionCode: string;
  requiredPermission: string | null;
  sortOrder: number;
}

export interface WorkflowSnapshot {
  name: string;
  code: string;
  description: string | null;
  entityType: WorkflowEntityType;
  version: number;
  steps: WorkflowSnapshotStep[];
  transitions: WorkflowSnapshotTransition[];
  assignments: {
    id: string;
    targetType: WorkflowTargetType;
    targetId: string | null;
    priority: number;
  }[];
}
