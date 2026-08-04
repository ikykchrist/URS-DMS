// =============================================================================
// URS-DMS — AACCUP submission domain shapes
// =============================================================================

export interface AaccupSubmissionListItem {
  id: string;
  requirementId: string;
  requirementTitle: string;
  requirementDocumentCode: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  documentId: string;
  documentTitle: string;
  submittedById: string;
  submittedByName: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  status: string;
  remarks: string | null;
  isCurrent: boolean;
  submittedAt: Date;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AaccupSubmissionDetail extends AaccupSubmissionListItem {
  deletedAt: Date | null;
}
