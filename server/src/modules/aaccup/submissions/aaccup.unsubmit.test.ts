import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  tx: { aaccupSubmission: { updateMany: vi.fn(), update: vi.fn() }, document: { findFirst: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn((fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx)) } }));
vi.mock("./aaccup.submissions.repository", () => ({ findById: vi.fn() }));
vi.mock("@/modules/audit/audit.service", () => ({ writeAudit: vi.fn(), writeAuditInTransaction: vi.fn() }));
vi.mock("@/modules/notifications/notifications.service", () => ({ notifyUser: vi.fn(), notifyUsers: vi.fn() }));
vi.mock("@/modules/requirements/requirement.runtime", () => ({ assertRequirementUploadValid: vi.fn(), resolveRequirementAssignmentForArea: vi.fn() }));
vi.mock("@/modules/workflow/workflow.engine", () => ({ bindWorkflowInstance: vi.fn(), evaluateWorkflowAction: vi.fn(), recordWorkflowAction: vi.fn(), scopesForAaccupSubmission: vi.fn(), withdrawEntityWorkflow: vi.fn() }));
vi.mock("@/modules/aaccup/tasks/aaccup.tasks.service", () => ({ syncTaskProgressForRequirement: vi.fn() }));
import * as repo from "./aaccup.submissions.repository";
import { unsubmitSubmission, reviewSubmission } from "./aaccup.submissions.service";
import { writeAuditInTransaction } from "@/modules/audit/audit.service";
import { withdrawEntityWorkflow, evaluateWorkflowAction } from "@/modules/workflow/workflow.engine";
const actor = { id: "owner", permissions: ["aaccup.submission.create"] };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.findById).mockResolvedValue({ id: "submission", submittedById: "owner", status: "PENDING", isCurrent: true } as never);
  mocks.tx.aaccupSubmission.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.document.findFirst.mockResolvedValue(null);
});
describe("owner evidence withdrawal", () => {
  it("soft-retires own pending evidence and records an atomic audit", async () => {
    expect(await unsubmitSubmission("submission", actor)).toEqual({ id: "submission", unsubmitted: true });
    expect(mocks.tx.aaccupSubmission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ submittedBy: "owner", deletedAt: null, status: { in: ["PENDING", "NEEDS_REVISION"] } }),
      data: expect.objectContaining({ isCurrent: false, deletedAt: expect.any(Date) }),
    }));
    expect(withdrawEntityWorkflow).toHaveBeenCalled();
    expect(writeAuditInTransaction).toHaveBeenCalled();
  });
  it("rejects approved evidence", async () => {
    vi.mocked(repo.findById).mockResolvedValue({ submittedById: "owner", status: "APPROVED" } as never);
    await expect(unsubmitSubmission("submission", actor)).rejects.toThrow("Approved evidence is locked");
    expect(mocks.tx.aaccupSubmission.updateMany).not.toHaveBeenCalled();
  });
  it("returns an archive-filed document to the owner's repository root", async () => {
    mocks.tx.document.findFirst.mockResolvedValue({ id: "file", folder: { ownerId: null } });
    await unsubmitSubmission("submission", actor);
    expect(mocks.tx.document.update).toHaveBeenCalledWith({ where: { id: "file" }, data: { folderId: null } });
  });
  it("rejects evidence owned by another account, including managers", async () => {
    await expect(unsubmitSubmission("submission", { id: "admin", permissions: [...actor.permissions, "aaccup.manage"] })).rejects.toThrow("your own");
  });
  it("requires submission permission", async () => {
    await expect(unsubmitSubmission("submission", { ...actor, permissions: [] })).rejects.toThrow("Missing permission");
  });
  it("rejects a concurrent approval without cancelling its workflow", async () => {
    mocks.tx.aaccupSubmission.updateMany.mockResolvedValue({ count: 0 });
    await expect(unsubmitSubmission("submission", actor)).rejects.toThrow("already reviewed or unsubmitted");
    expect(withdrawEntityWorkflow).not.toHaveBeenCalled(); expect(writeAuditInTransaction).not.toHaveBeenCalled();
  });
  it("does not approve evidence that was concurrently unsubmitted", async () => {
    mocks.tx.aaccupSubmission.updateMany.mockResolvedValue({ count: 0 });
    await expect(reviewSubmission("submission", { decision: "APPROVED" }, { id: "admin", permissions: ["aaccup.submission.review"] })).rejects.toThrow("unsubmitted");
    expect(evaluateWorkflowAction).not.toHaveBeenCalled(); expect(mocks.tx.aaccupSubmission.update).not.toHaveBeenCalled();
  });
});
