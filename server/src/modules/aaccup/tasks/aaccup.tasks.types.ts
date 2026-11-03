// =============================================================================
// URS-DMS — AACCUP task domain shapes
// =============================================================================

export interface AaccupTaskListItem {
  id: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  areaSet: string;
  campusId: string | null;
  collegeId: string | null;
  programId: string | null;
  title: string;
  description: string | null;
  category: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "NEEDS_REVISION" | "COMPLETED" | "CANCELLED";
  dueDate: Date | null;
  requirementId: string | null;
  requirementTitle: string | null;
  requirementCode: string | null;
  requirementTemplateId: string | null;
  requirementTemplateName: string | null;
  requirementTemplateVersion: number | null;
  sourceAssignmentId: string | null;
  requirementProgress: TaskRequirementProgress[];
  assigneeType: "USER" | "PROGRAM";
  assigneeId: string | null;
  assigneeLabel: string | null;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRequirementProgress {
  id: string;
  title: string;
  documentCode: string;
  isRequired: boolean;
  submissionStatus: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_REVISION" | null;
  submittedAt: Date | null;
}

export interface AaccupTaskDetail extends AaccupTaskListItem {
  deletedAt: Date | null;
}
