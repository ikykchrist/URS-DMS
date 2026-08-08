import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — folders domain shapes
// =============================================================================

export interface FolderListItem {
  id: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  ownerId: string | null;
  color: string | null;
  icon: string | null;
  documentCount: number;
  childCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderDetail extends FolderListItem {
  deletedAt: Date | null;
  parent: { id: string; name: string } | null;
}

export type FolderWithRelations = Prisma.FolderGetPayload<{
  select: typeof folderSelect;
}>;

// -----------------------------------------------------------------------------
// Sprint 7.4.3 — resolved repository structure (Folder Builder integration)
// -----------------------------------------------------------------------------

export interface ResolvedFolderNode {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  level: number;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  children: ResolvedFolderNode[];
}

export interface ResolvedFolderStructure {
  /** template — structure comes from an assigned Folder Builder template. */
  source: "template" | "legacy" | "none";
  template: {
    id: string;
    name: string;
    code: string;
    icon: string | null;
    color: string | null;
  } | null;
  assignment: {
    id: string;
    targetType: string;
    targetId: string | null;
  } | null;
  tree: ResolvedFolderNode[];
  /** legacy flat folders, present when source is "legacy" (no assignment). */
  legacyFolders: FolderListItem[];
}

export const folderSelect = {
  id: true,
  name: true,
  color: true,
  icon: true,
  parentId: true,
  departmentId: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  parent: { select: { id: true, name: true } },
  children: { select: { id: true }, where: { deletedAt: null } },
  documents: { select: { id: true }, where: { deletedAt: null } },
};
