import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachmentUploadSchema, createBugReportSchema } from "./bugReports.validator";

vi.mock("./bugReports.repository", () => ({ create: vi.fn(), findById: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/storage", () => ({ statObject: vi.fn(), presignUpload: vi.fn(), presignDownload: vi.fn() }));
vi.mock("@/modules/audit/audit.service", () => ({ writeAudit: vi.fn() }));

import * as repo from "./bugReports.repository";
import * as storage from "@/lib/storage";
import { createBugReport, downloadAttachment } from "./bugReports.service";

const input = { tab: "Dashboard", description: "The page does not load." };
const attachment = { objectKey: "documents/bug-reports-owner/11111111-1111-4111-8111-111111111111/screenshot.png", filename: "screenshot.png" };

beforeEach(() => vi.clearAllMocks());

describe("bug report attachments", () => {
  it("keeps attachment optional and rejects unsafe or oversized upload metadata", () => {
    expect(createBugReportSchema.safeParse(input).success).toBe(true);
    const valid = { filename: "screenshot.png", mimeType: "image/png", sizeBytes: 100 };
    expect(attachmentUploadSchema.safeParse(valid).success).toBe(true);
    for (const invalid of [{ ...valid, filename: "../file.png" }, { ...valid, mimeType: "text/html" }, { ...valid, sizeBytes: 5 * 1024 * 1024 + 1 }]) {
      expect(attachmentUploadSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it("rejects another user's object before reading storage or creating a report", async () => {
    await expect(createBugReport({ ...input, attachment }, { id: "other" })).rejects.toThrow("Invalid report attachment");
    expect(storage.statObject).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects an oversized stored object even when upload metadata was valid", async () => {
    vi.mocked(storage.statObject).mockResolvedValue({ size: 6 * 1024 * 1024, contentType: "image/png", etag: "etag" });
    await expect(createBugReport({ ...input, attachment }, { id: "owner" })).rejects.toThrow("up to 5 MB");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("persists the verified attachment with the report", async () => {
    vi.mocked(storage.statObject).mockResolvedValue({ size: 100, contentType: "image/png", etag: "etag" });
    vi.mocked(repo.create).mockResolvedValue({ id: "report", tab: input.tab, attachmentKey: attachment.objectKey } as Awaited<ReturnType<typeof repo.create>>);
    await createBugReport({ ...input, attachment }, { id: "owner" });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ reporterId: "owner", attachmentKey: attachment.objectKey, attachmentName: attachment.filename }));
  });

  it("does not mint a download token for a report without an attachment", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(downloadAttachment("missing")).rejects.toThrow("not found");
    expect(storage.presignDownload).not.toHaveBeenCalled();
  });
});
