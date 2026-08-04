// =============================================================================
// URS-DMS — AACCUP requirement domain shapes
// =============================================================================

export interface AaccupRequirementListItem {
  id: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  title: string;
  description: string | null;
  documentCode: string;
  category: string | null;
  priority: string | null;
  isRequired: boolean;
  status: string;
  displayOrder: number;
  sourceNodeId: string | null;
  sourceAssignmentId: string | null;
  sourceTemplateId: string | null;
  sourceTemplateVersion: number | null;
  nodeType: "SECTION" | "REQUIREMENT" | "SUB_REQUIREMENT" | "SUPPORTING_DOCUMENT" | null;
  validations: Array<{
    id: string;
    type:
      | "FILE_TYPE"
      | "FILE_SIZE"
      | "PAGE_COUNT"
      | "EXPIRATION_DATE"
      | "NAMING_CONVENTION"
      | "METADATA";
    config: unknown;
    message: string | null;
    severity: "ERROR" | "WARNING";
  }>;
  createdBy: string;
  createdByName: string;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AaccupRequirementDetail extends AaccupRequirementListItem {
  deletedAt: Date | null;
}
