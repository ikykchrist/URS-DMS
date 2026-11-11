import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { presignDownload } from "@/lib/storage";
import { authenticate, authenticateIncludingAccreditor } from "@/middlewares/authenticate";
import { requireRole } from "@/middlewares/authorize";
import { writeAudit } from "@/modules/audit/audit.service";
import { listApprovedEvidence, previewApprovedEvidence } from "./accreditor.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    permission: { findMany: vi.fn() },
    aaccupSubmission: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    documentVersion: { findFirst: vi.fn() },
  },
}));
vi.mock("@/modules/auth/auth.tokens", () => ({
  verifyAccessToken: () => ({ sessionId: "session", roleName: "ADMINISTRATOR" }),
}));
vi.mock("@/modules/audit/audit.service", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/storage", () => ({ presignDownload: vi.fn() }));
vi.mock("@/modules/documents/documents.service", () => ({
  getConvertedPreview: vi.fn().mockResolvedValue(null),
}));

describe("Accreditor access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      userId: "viewer", expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "viewer", roleId: "role", status: "ACTIVE", role: { name: "ACCREDITOR" },
    } as never);
  });

  const request = () => ({
    header: () => "Bearer token", originalUrl: "/api/v1/aaccup/areas", context: {},
  } as unknown as Request);
  const response = {} as Response;

  it("denies standard APIs using the current account role and audits the denial", async () => {
    const next = vi.fn();
    await authenticate(request(), response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ result: "DENIED", userId: "viewer" }));
    expect(prisma.permission.findMany).not.toHaveBeenCalled();
  });

  it("admits Accreditors to the viewer with no management permissions", async () => {
    const req = request();
    const next = vi.fn();
    await authenticateIncludingAccreditor(req, response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toMatchObject({ roleName: "ACCREDITOR", permissions: [] });
    await requireRole("ACCREDITOR")(req, response, next);
    expect(next).toHaveBeenLastCalledWith();
  });

  it("denies other roles access to the Accreditor endpoints", async () => {
    const req = request();
    req.auth = { userId: "staff", roleId: "role", sessionId: "session", roleName: "STAFF", permissions: [] };
    const next = vi.fn();
    await requireRole("ACCREDITOR")(req, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("filters both the approved evidence list and its count at the database", async () => {
    vi.mocked(prisma.aaccupSubmission.findMany).mockResolvedValue([]);
    vi.mocked(prisma.aaccupSubmission.count).mockResolvedValue(0);
    await listApprovedEvidence({ areaId: "area", page: 1, pageSize: 20 });
    const where = expect.objectContaining({
      status: "APPROVED", deletedAt: null, isCurrent: true,
      requirement: expect.objectContaining({ areaId: "area", area: expect.objectContaining({ status: "ACTIVE" }) }),
    });
    expect(prisma.aaccupSubmission.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(prisma.aaccupSubmission.count).toHaveBeenCalledWith({ where });
  });

  it("withholds preview URLs when no approved submission matches the ID", async () => {
    vi.mocked(prisma.aaccupSubmission.findFirst).mockResolvedValue(null);
    await expect(previewApprovedEvidence("unavailable", { userId: "viewer" })).rejects.toMatchObject({ status: 404 });
    expect(prisma.aaccupSubmission.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "unavailable", status: "APPROVED", isCurrent: true, deletedAt: null }),
    }));
    expect(presignDownload).not.toHaveBeenCalled();
  });

  it("previews and audits the approved snapshot rather than the latest upload", async () => {
    const submittedAt = new Date("2026-09-10T12:00:00Z");
    vi.mocked(prisma.aaccupSubmission.findFirst).mockResolvedValue({
      documentId: "document", snapshotChecksum: "approved-digest", snapshotSizeBytes: 100n,
      snapshotFilename: "evidence.pdf", snapshotMimeType: "application/pdf", submittedAt,
    } as never);
    vi.mocked(prisma.documentVersion.findFirst).mockResolvedValue({
      id: "approved-version", filename: "evidence.pdf", mimeType: "application/pdf", objectKey: "approved-object",
    } as never);
    vi.mocked(presignDownload).mockResolvedValue({
      url: "https://example.test/preview", expiresInSeconds: 60, objectKey: "approved-object",
    });
    await expect(previewApprovedEvidence("approved", { userId: "viewer" })).resolves.toMatchObject({
      filename: "evidence.pdf", mimeType: "application/pdf",
    });
    expect(prisma.documentVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        documentId: "document", checksum: "approved-digest", sizeBytes: 100n,
        filename: "evidence.pdf", mimeType: "application/pdf", uploadedAt: { lte: submittedAt },
      },
    }));
    expect(presignDownload).toHaveBeenCalledWith("approved-object", { inline: true });
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({
      userId: "viewer", entityId: "document", newValue: { submissionId: "approved", versionId: "approved-version" },
    }));
  });

  it("withholds preview URLs for legacy approvals without a version checksum", async () => {
    vi.mocked(prisma.aaccupSubmission.findFirst).mockResolvedValue({
      documentId: "document", snapshotChecksum: null, snapshotSizeBytes: 100n, submittedAt: new Date(),
    } as never);
    await expect(previewApprovedEvidence("legacy", { userId: "viewer" })).rejects.toMatchObject({ status: 404 });
    expect(prisma.documentVersion.findFirst).not.toHaveBeenCalled();
    expect(presignDownload).not.toHaveBeenCalled();
  });
});
