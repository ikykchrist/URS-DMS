// =============================================================================
// URS-DMS — AACCUP domain shapes
// =============================================================================

export interface AaccupAreaListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
  accreditationCycleId: string | null;
  accreditationCycleName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AaccupAreaDetail extends AaccupAreaListItem {
  deletedAt: Date | null;
  createdByName: string;
  updatedByName: string | null;
}
