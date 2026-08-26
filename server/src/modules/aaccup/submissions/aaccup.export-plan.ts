// =============================================================================
// URS-DMS — AACCUP approved-package export planner (pure logic, no I/O)
// Maps APPROVED + current submissions for the selected areas onto a streaming
// ZIP plan: one folder per area (sanitized name), each file resolved to the
// exact submitted DocumentVersion via the immutable submission snapshot
// (checksum → filename+size → mime+size), deduped per area folder with
// collision-safe file names. Pure so it can be unit-tested without a database.
// =============================================================================

import { sanitizeZipSegment } from "@/lib/zipStream";

export interface ExportArea {
  id: string;
  code: string;
  name: string;
  areaSet: string;
}

export interface ExportSubmission {
  id: string;
  documentId: string;
  submittedAt: Date;
  snapshotFilename: string | null;
  snapshotMimeType: string | null;
  snapshotSizeBytes: bigint | null;
  snapshotChecksum: string | null;
  requirement: {
    id: string;
    documentCode: string;
    title: string;
    area: ExportArea;
  };
}

export interface ExportVersionCandidate {
  id: string;
  documentId: string;
  versionNumber: number;
  objectKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
}

export interface ExportPlanDir {
  path: string;
  time: Date;
}

export interface ExportPlanFile {
  path: string;
  objectKey: string;
  size: number;
  time: Date;
}

export interface ExportPlan {
  dirs: ExportPlanDir[];
  files: ExportPlanFile[];
  fileCount: number;
  skipped: number;
}

type Snapshot = Pick<
  ExportSubmission,
  "documentId" | "snapshotFilename" | "snapshotMimeType" | "snapshotSizeBytes" | "snapshotChecksum"
>;

/**
 * Resolve the exact historical DocumentVersion that was submitted, matching
 * against the immutable submission snapshot. Checksum is the strongest signal;
 * filename + size and mime + size are fallbacks for legacy rows. Candidates
 * should be ordered newest-first so duplicate matches (identical bytes) resolve
 * to the later upload — the bytes are the same either way.
 */
export function resolveExactDocumentVersion(
  snapshot: Snapshot,
  versions: ExportVersionCandidate[],
): ExportVersionCandidate | null {
  if (snapshot.snapshotChecksum) {
    const byChecksum = versions.find((version) => version.checksum === snapshot.snapshotChecksum);
    if (byChecksum) return byChecksum;
  }
  if (snapshot.snapshotFilename && snapshot.snapshotSizeBytes != null) {
    const byFilename = versions.find(
      (version) =>
        version.filename === snapshot.snapshotFilename &&
        version.sizeBytes === snapshot.snapshotSizeBytes,
    );
    if (byFilename) return byFilename;
  }
  if (snapshot.snapshotMimeType && snapshot.snapshotSizeBytes != null) {
    return (
      versions.find(
        (version) =>
          version.mimeType === snapshot.snapshotMimeType &&
          version.sizeBytes === snapshot.snapshotSizeBytes,
      ) ?? null
    );
  }
  return null;
}

/** First-fit unique name inside a folder: "a.pdf", "a-2.pdf", ... */
function uniqueName(used: Set<string>, base: string): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  for (let i = 2; ; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

/**
 * Build the ZIP plan for the given areas and their approved submissions.
 * - One folder per selected area (sanitized title, fallback to code).
 * - Files are the exact submitted DocumentVersion per submission.
 * - Duplicate objects within the same area folder are kept once (oldest
 *   submission wins); the same object may appear in different area folders.
 * - Unresolvable submissions (no matching version) are counted as skipped.
 * Submissions are ordered oldest-first for deterministic output.
 */
export function buildExportPlan(
  areas: ExportArea[],
  submissions: ExportSubmission[],
  versions: ExportVersionCandidate[],
): ExportPlan {
  const versionsByDocument = new Map<string, ExportVersionCandidate[]>();
  for (const version of versions) {
    const bucket = versionsByDocument.get(version.documentId) ?? [];
    bucket.push(version);
    versionsByDocument.set(version.documentId, bucket);
  }

  // Folder name per selected area, collision-safe across sets.
  const folderByAreaId = new Map<string, string>();
  const usedFolders: string[] = [];
  const usedFolderNames = new Set<string>();
  for (const area of areas) {
    const base = sanitizeZipSegment(area.name) || sanitizeZipSegment(area.code) || "area";
    let folder = base;
    let suffix = 2;
    while (usedFolderNames.has(folder)) folder = `${base}-${suffix++}`;
    usedFolderNames.add(folder);
    usedFolders.push(folder);
    folderByAreaId.set(area.id, folder);
  }

  const areaTimes = new Map<string, Date>();
  const usedNamesByFolder = new Map<string, Set<string>>();
  const seenObjectsByFolder = new Map<string, Set<string>>();
  const files: ExportPlanFile[] = [];
  let skipped = 0;

  const ordered = [...submissions].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  for (const submission of ordered) {
    const folder = folderByAreaId.get(submission.requirement.area.id);
    if (!folder) {
      skipped++;
      continue;
    }
    const version = resolveExactDocumentVersion(
      submission,
      versionsByDocument.get(submission.documentId) ?? [],
    );
    if (!version) {
      skipped++;
      continue;
    }
    let seen = seenObjectsByFolder.get(folder);
    if (!seen) {
      seen = new Set();
      seenObjectsByFolder.set(folder, seen);
    }
    if (seen.has(version.objectKey)) continue;
    seen.add(version.objectKey);

    const usedNames = usedNamesByFolder.get(folder) ?? new Set<string>();
    const baseName =
      sanitizeZipSegment(version.filename) ||
      (submission.requirement.documentCode ? `document-${sanitizeZipSegment(submission.requirement.documentCode)}` : "document");
    files.push({
      path: `${folder}/${uniqueName(usedNames, baseName)}`,
      objectKey: version.objectKey,
      size: Number(version.sizeBytes),
      time: submission.submittedAt,
    });
    usedNamesByFolder.set(folder, usedNames);

    const currentTime = areaTimes.get(folder);
    if (!currentTime || submission.submittedAt > currentTime) {
      areaTimes.set(folder, submission.submittedAt);
    }
  }

  const dirs: ExportPlanDir[] = usedFolders.map((folder) => ({
    path: `${folder}/`,
    time: areaTimes.get(folder) ?? new Date(0),
  }));

  return { dirs, files, fileCount: files.length, skipped };
}
