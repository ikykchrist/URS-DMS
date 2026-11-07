// =============================================================================
// URS-DMS — AACCUP domain shapes
// =============================================================================

export interface AaccupAreaListItem {
  id: string;
  areaNumber: number;
  code: string;
  name: string;
  description: string | null;
  campusId: string | null;
  campusName: string | null;
  collegeId: string | null;
  collegeName: string | null;
  programId: string | null;
  programName: string | null;
  accreditationCycleId: string | null;
  accreditationCycleName: string | null;
  areaSet: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AaccupAreaDetail extends AaccupAreaListItem {
  deletedAt: Date | null;
  createdByName: string;
  updatedByName: string | null;
}
