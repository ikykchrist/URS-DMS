// =============================================================================
// URS-DMS — AACCUP task domain shapes
// =============================================================================

export interface AaccupTaskListItem {
  id: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  areaSet: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  dueDate: Date | null;
  requirementId: string | null;
  requirementTitle: string | null;
  requirementCode: string | null;
  assigneeType: "USER" | "DEPARTMENT";
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

export interface AaccupTaskDetail extends AaccupTaskListItem {
  deletedAt: Date | null;
}