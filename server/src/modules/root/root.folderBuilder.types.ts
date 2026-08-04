import type { Prisma } from "@prisma/client";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder types (Sprint 7.4.3)
// -----------------------------------------------------------------------------
// Wire shapes for the folder-builder engine: templates, tree nodes,
// assignments, version snapshots and history. Mirrors the Configuration
// Engine (version + snapshot + history) and Organization Engine
// (entity-config factory, shared row shape) conventions.
// =============================================================================

export interface FolderTemplateView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  icon: string | null;
  color: string | null;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  nodeCount: number;
  assignmentCount: number;
}

export interface FolderNodeView {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  level: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FolderTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  level: number;
  deletedAt: Date | null;
  children: FolderTreeNode[];
}

export interface FolderAssignmentView {
  id: string;
  templateId: string;
  templateName: string;
  targetType: "UNIVERSITY" | "COLLEGE" | "DEPARTMENT" | "PROGRAM" | "OFFICE" | "AACCUP_AREA";
  targetId: string | null;
  targetName: string | null;
  createdAt: Date;
}

export interface FolderTemplateDetail {
  template: FolderTemplateView;
  tree: FolderTreeNode[];
  assignments: FolderAssignmentView[];
}

export interface FolderVersionView {
  id: string;
  templateId: string;
  version: number;
  changeType: "CREATED" | "UPDATED" | "ASSIGNED" | "ARCHIVED" | "RESTORED" | "ROLLED_BACK";
  data: Prisma.JsonValue;
  changeNote: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: Date;
}

export interface FolderHistoryView {
  id: string;
  templateId: string;
  action: "CREATED" | "UPDATED" | "ASSIGNED" | "ARCHIVED" | "RESTORED" | "ROLLED_BACK";
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  versionFrom: number | null;
  versionTo: number | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: Date;
}

export interface ListResult {
  items: FolderTemplateView[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface ListHistoryResult {
  items: FolderHistoryView[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

// -----------------------------------------------------------------------------
// Snapshot payload — the FULL template state (fields + node tree + assignment
// scopes) so a rollback can replay the entire structure.
// -----------------------------------------------------------------------------
export interface FolderSnapshotNode {
  name: string;
  description: string | null;
  category: string | null;
  metadata: Prisma.JsonValue | null;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  children: FolderSnapshotNode[];
}

export interface FolderSnapshot {
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  icon: string | null;
  color: string | null;
  nodes: FolderSnapshotNode[];
  assignments: { targetType: string; targetId: string | null }[];
}
