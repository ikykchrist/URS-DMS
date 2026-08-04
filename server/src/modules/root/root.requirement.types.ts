import type { Prisma } from "@prisma/client";

export type RequirementTemplateStatusValue = "ACTIVE" | "INACTIVE";
export type RequirementNodeTypeValue =
  | "SECTION"
  | "REQUIREMENT"
  | "SUB_REQUIREMENT"
  | "SUPPORTING_DOCUMENT";
export type RequirementNodeStatusValue = "ACTIVE" | "INACTIVE";
export type RequirementTargetType =
  | "UNIVERSITY"
  | "COLLEGE"
  | "DEPARTMENT"
  | "PROGRAM"
  | "OFFICE"
  | "AACCUP_AREA"
  | "ACCREDITATION_CYCLE";
export type RequirementChangeTypeValue =
  | "CREATED"
  | "UPDATED"
  | "ASSIGNED"
  | "ARCHIVED"
  | "RESTORED"
  | "ROLLED_BACK";
export type RequirementValidationTypeValue =
  | "FILE_TYPE"
  | "FILE_SIZE"
  | "PAGE_COUNT"
  | "EXPIRATION_DATE"
  | "NAMING_CONVENTION"
  | "METADATA";
export type RequirementValidationSeverityValue = "ERROR" | "WARNING";

export interface RequirementTemplateView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  status: RequirementTemplateStatusValue;
  version: number;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  nodeCount: number;
  validationCount: number;
  assignmentCount: number;
}

export interface RequirementValidationView {
  id: string;
  nodeId: string;
  type: RequirementValidationTypeValue;
  config: Prisma.JsonValue;
  message: string | null;
  severity: RequirementValidationSeverityValue;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RequirementTreeNode {
  id: string;
  templateId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  helpText: string | null;
  type: RequirementNodeTypeValue;
  metadata: Prisma.JsonValue;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  level: number;
  status: RequirementNodeStatusValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  validations: RequirementValidationView[];
  children: RequirementTreeNode[];
}

export interface RequirementAssignmentView {
  id: string;
  templateId: string;
  templateName: string;
  targetType: RequirementTargetType;
  targetId: string | null;
  targetName: string | null;
  createdAt: Date;
}

export interface RequirementTemplateDetail {
  template: RequirementTemplateView;
  tree: RequirementTreeNode[];
  assignments: RequirementAssignmentView[];
}

export interface RequirementVersionView {
  id: string;
  templateId: string;
  version: number;
  changeType: RequirementChangeTypeValue;
  data: Prisma.JsonValue;
  changeNote: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface RequirementHistoryView {
  id: string;
  templateId: string;
  action: RequirementChangeTypeValue;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface RequirementSnapshotValidation {
  id: string;
  type: RequirementValidationTypeValue;
  config: Prisma.JsonValue;
  message: string | null;
  severity: RequirementValidationSeverityValue;
  enabled: boolean;
  sortOrder: number;
}

export interface RequirementSnapshotNode {
  id: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  helpText: string | null;
  type: RequirementNodeTypeValue;
  metadata: Prisma.JsonValue;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  level: number;
  status: RequirementNodeStatusValue;
  validations: RequirementSnapshotValidation[];
}

export interface RequirementSnapshot {
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  status: RequirementTemplateStatusValue;
  nodes: RequirementSnapshotNode[];
  assignments: Array<{
    id: string;
    targetType: RequirementTargetType;
    targetId: string | null;
  }>;
}

export interface AccreditationCycleView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UploadValidationIssue {
  ruleId: string;
  type: RequirementValidationTypeValue;
  message: string;
  severity: RequirementValidationSeverityValue;
}

export interface UploadValidationResult {
  valid: boolean;
  errors: UploadValidationIssue[];
  warnings: UploadValidationIssue[];
}

export interface ListResult<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
