// =============================================================================
// URS-DMS — AACCUP approved-package export planner tests (pure, no DB)
// Covers exact historical-version resolution from the submission snapshot,
// area-folder sanitization, per-folder deduplication, and collision handling.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  buildExportPlan,
  resolveExactDocumentVersion,
  type ExportArea,
  type ExportSubmission,
  type ExportVersionCandidate,
} from "@/modules/aaccup/submissions/aaccup.export-plan";

const areaA: ExportArea = { id: "area-a", code: "A1", name: "Area One", areaSet: "AACCUP" };
const areaB: ExportArea = { id: "area-b", code: "I1", name: "Area/Two", areaSet: "ISO" };

function version(
  id: string,
  documentId: string,
  overrides: Partial<ExportVersionCandidate> = {},
): ExportVersionCandidate {
  return {
    id,
    documentId,
    versionNumber: Number(id.replace(/\D/g, "")) || 1,
    objectKey: `docs/${id}`,
    filename: `${id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: BigInt(100),
    checksum: `sha-${id}`,
    ...overrides,
  };
}

function submission(
  id: string,
  overrides: Partial<ExportSubmission> = {},
): ExportSubmission {
  const documentId = overrides.documentId ?? `doc-${id.replace(/^s-?/, "")}`
  const versionNumber = documentId.replace(/^doc-/, "")
  return {
    id,
    documentId,
    submittedAt: new Date("2026-01-01T00:00:00Z"),
    snapshotFilename: `v${versionNumber}.pdf`,
    snapshotMimeType: "application/pdf",
    snapshotSizeBytes: BigInt(100),
    snapshotChecksum: `sha-v${versionNumber}`,
    requirement: {
      id: `req-${id}`,
      documentCode: `CODE-${id}`,
      title: `Requirement ${id}`,
      area: areaA,
    },
    ...overrides,
  }
}

describe("resolveExactDocumentVersion", () => {
  const candidates = [
    version("v1", "doc-1", { versionNumber: 1 }),
    version("v2", "doc-1", { versionNumber: 2, filename: "revised.pdf" }),
  ];

  it("matches by checksum first (exact snapshot)", () => {
    const result = resolveExactDocumentVersion(
      { documentId: "doc-1", snapshotChecksum: "sha-v1", snapshotFilename: "revised.pdf", snapshotMimeType: null, snapshotSizeBytes: null },
      candidates,
    );
    expect(result?.id).toBe("v1");
  });

  it("falls back to filename + size when checksum does not match", () => {
    const result = resolveExactDocumentVersion(
      { documentId: "doc-1", snapshotChecksum: null, snapshotFilename: "revised.pdf", snapshotMimeType: null, snapshotSizeBytes: BigInt(100) },
      candidates,
    );
    expect(result?.id).toBe("v2");
  });

  it("falls back to mime + size when filename is unknown", () => {
    const doc1 = version("v1", "doc-1", { mimeType: "application/pdf" });
    const doc2 = version("v2", "doc-1", { mimeType: "application/msword" });
    const result = resolveExactDocumentVersion(
      { documentId: "doc-1", snapshotChecksum: null, snapshotFilename: null, snapshotMimeType: "application/msword", snapshotSizeBytes: BigInt(100) },
      [doc1, doc2],
    );
    expect(result?.id).toBe("v2");
  });

  it("returns null when no version matches the snapshot", () => {
    const result = resolveExactDocumentVersion(
      { documentId: "doc-1", snapshotChecksum: "sha-missing", snapshotFilename: "ghost.pdf", snapshotMimeType: null, snapshotSizeBytes: BigInt(999) },
      candidates,
    );
    expect(result).toBeNull();
  });
});

describe("buildExportPlan", () => {
  it("groups approved submissions into one sanitized folder per area", () => {
    const plan = buildExportPlan(
      [areaA, areaB],
      [
        submission("s1", { documentId: "doc-1", requirement: { ...submission("s1").requirement, area: areaA } }),
        submission("s2", { documentId: "doc-2", requirement: { ...submission("s2").requirement, area: areaB } }),
      ],
      [version("v1", "doc-1"), version("v2", "doc-2")],
    );
    expect(plan.dirs.map((d) => d.path)).toEqual(["Area One/", "Area-Two/"]);
    expect(plan.files.map((f) => f.path)).toEqual(["Area One/v1.pdf", "Area-Two/v2.pdf"]);
    expect(plan.fileCount).toBe(2);
    expect(plan.skipped).toBe(0);
  });

  it("sanitizes hostile area names (slashes, non-ASCII)", () => {
    const evil: ExportArea = { id: "area-e", code: "E1", name: "Evil\\Area/Name–", areaSet: "CERT" };
    const plan = buildExportPlan(
      [evil],
      [submission("s1", { documentId: "doc-1", requirement: { ...submission("s1").requirement, area: evil } })],
      [version("v1", "doc-1")],
    );
    expect(plan.dirs[0]?.path).toBe("Evil-Area-Name_/");
  });

  it("dedupes the same object within an area folder, keeping the oldest submission", () => {
    const older = submission("s1", { documentId: "doc-1", submittedAt: new Date("2026-01-01T00:00:00Z") });
    const newer = submission("s2", {
      documentId: "doc-1",
      submittedAt: new Date("2026-02-01T00:00:00Z"),
      requirement: { ...older.requirement, id: "req-s2" },
    });
    const plan = buildExportPlan([areaA], [newer, older], [version("v1", "doc-1")]);
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0]?.path).toBe("Area One/v1.pdf");
    expect(plan.files[0]?.time.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(plan.skipped).toBe(0);
  });

  it("keeps the same object in different area folders", () => {
    const inA = submission("s1", { documentId: "doc-1", requirement: { ...submission("s1").requirement, area: areaA } });
    const inB = submission("s2", {
      documentId: "doc-1",
      requirement: { ...submission("s1").requirement, id: "req-s2", area: areaB },
    });
    const plan = buildExportPlan([areaA, areaB], [inA, inB], [version("v1", "doc-1")]);
    expect(plan.files.map((f) => f.path)).toEqual(["Area One/v1.pdf", "Area-Two/v1.pdf"]);
  });

  it("disambiguates filename collisions inside a folder", () => {
    const s1 = submission("s1", { documentId: "doc-1" });
    const s2 = submission("s2", {
      documentId: "doc-2",
      requirement: { ...s1.requirement, id: "req-s2" },
    });
    const plan = buildExportPlan(
      [areaA],
      [s1, s2],
      [
        version("v1", "doc-1", { filename: "report.pdf" }),
        version("v2", "doc-2", { filename: "report.pdf" }),
      ],
    );
    expect(plan.files.map((f) => f.path)).toEqual(["Area One/report.pdf", "Area One/report-2.pdf"]);
  });

  it("counts unresolvable submissions as skipped", () => {
    const plan = buildExportPlan(
      [areaA],
      [submission("s1", { documentId: "doc-1", snapshotChecksum: "sha-old" })],
      [
        version("v1", "doc-1", {
          checksum: "sha-new",
          filename: "renamed.pdf",
          sizeBytes: BigInt(500),
        }),
      ],
    );
    expect(plan.files).toHaveLength(0);
    expect(plan.skipped).toBe(1);
    expect(plan.dirs.map((d) => d.path)).toEqual(["Area One/"]);
  });

  it("sorts file entries oldest-first", () => {
    const late = submission("s-late", { documentId: "doc-2", submittedAt: new Date("2026-03-01T00:00:00Z") });
    const early = submission("s-early", { documentId: "doc-1", submittedAt: new Date("2026-01-01T00:00:00Z") });
    const plan = buildExportPlan(
      [areaA],
      [late, early],
      [version("v1", "doc-1"), version("v2", "doc-2")],
    );
    expect(plan.files.map((f) => f.time.toISOString())).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-03-01T00:00:00.000Z",
    ]);
  });
});
