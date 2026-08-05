// =============================================================================
// URS-DMS — Dynamic Form Builder domain shapes
// =============================================================================

import type { FormChangeType, FormFieldType, FormStatus } from "@prisma/client";

export interface FormFieldView {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  description: string | null;
  placeholder: string | null;
  required: boolean;
  defaultValue: unknown;
  options: Array<{ label: string; value: string }>;
  validation: Record<string, unknown> | null;
  helpText: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormAssignmentView {
  id: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  priority: number;
  createdAt: Date;
}

export interface FormTemplateListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: FormStatus;
  version: number;
  fieldCount: number;
  assignmentCount: number;
  createdByName: string;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormTemplateDetail extends FormTemplateListItem {
  fields: FormFieldView[];
  assignments: FormAssignmentView[];
  deletedAt: Date | null;
}

export interface FormVersionView {
  id: string;
  version: number;
  changeType: FormChangeType;
  changeNote: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface FormHistoryView {
  id: string;
  action: FormChangeType;
  oldValue: unknown;
  newValue: unknown;
  versionFrom: number | null;
  versionTo: number | null;
  actorName: string | null;
  createdAt: Date;
}

export interface FormPreviewView {
  template: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    version: number;
  };
  fields: FormFieldView[];
  assignments: FormAssignmentView[];
}
