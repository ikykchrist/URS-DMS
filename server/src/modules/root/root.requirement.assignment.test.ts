import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tx: {
    requirementAssignment: { update: vi.fn(), findMany: vi.fn() },
    requirementTemplate: { updateMany: vi.fn(), findUnique: vi.fn() },
    requirementNode: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: vi.fn(async (callback: (tx: typeof mocks.tx) => Promise<unknown>) => callback(mocks.tx)),
  campus: { findMany: vi.fn().mockResolvedValue([]) }, college: { findMany: vi.fn().mockResolvedValue([]) },
  program: { findMany: vi.fn().mockResolvedValue([]) }, office: { findMany: vi.fn().mockResolvedValue([]) },
  aaccupArea: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: "area", areaSet: "AACCUP" }) }, accreditationCycle: { findMany: vi.fn().mockResolvedValue([]) },
} }));
vi.mock("./root.requirement.repository", () => ({
  findTemplateById: vi.fn(), findAssignmentByTarget: vi.fn(),
  listTemplateNodes: vi.fn(), listAssignments: vi.fn(), appendVersion: vi.fn(), appendHistory: vi.fn(),
}));
vi.mock("@/modules/requirements/requirement.runtime", () => ({
  invalidateRequirementResolutionCache: vi.fn(), refreshRequirementProjectionsForTemplateBestEffort: vi.fn(), refreshRequirementProjectionsForCycleBestEffort: vi.fn(),
}));
vi.mock("@/modules/audit/audit.service", () => ({ writeAudit: vi.fn() }));

import * as repo from "./root.requirement.repository";
import { assignTemplate, attachTemplateToArea } from "./root.requirement.service";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/modules/audit/audit.service";

const template = {
  id: "template", name: "QA", code: "QA", areaSet: "AACCUP", status: "ACTIVE", version: 7,
  _count: { nodes: 1, assignments: 1 }, validationCount: 0,
} as Awaited<ReturnType<typeof repo.findTemplateById>> & object;
const oldDeadline = new Date("2026-12-01T00:00:00Z");
const newDeadline = new Date("2026-12-02T00:00:00Z");
const actor = { id: "root", permissions: ["requirement.read", "requirement.assign"] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.findTemplateById).mockResolvedValue(template);
  vi.mocked(repo.findAssignmentByTarget).mockResolvedValue({ id: "assignment", templateId: "template", dueDate: oldDeadline } as Awaited<ReturnType<typeof repo.findAssignmentByTarget>>);
  vi.mocked(repo.listTemplateNodes).mockResolvedValue([]);
  vi.mocked(repo.listAssignments).mockResolvedValue([]);
  mocks.tx.requirementTemplate.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.requirementTemplate.findUnique.mockResolvedValue(template);
  mocks.tx.requirementNode.findMany.mockResolvedValue([]);
  mocks.tx.requirementAssignment.findMany.mockResolvedValue([{ id: "assignment", targetType: "UNIVERSITY", targetId: null, dueDate: newDeadline }]);
});

describe("assignment deadline changes", () => {
  it("versions and audits a deadline change on an existing assignment", async () => {
    await assignTemplate("template", { targetType: "AACCUP_AREA", targetId: "area", dueDate: newDeadline }, actor);
    expect(mocks.tx.requirementAssignment.update).toHaveBeenCalledWith({ where: { id: "assignment" }, data: { dueDate: newDeadline } });
    expect(repo.appendVersion).toHaveBeenCalledWith(mocks.tx, expect.objectContaining({ version: 8, changeType: "ASSIGNED", snapshot: expect.objectContaining({ assignments: [expect.objectContaining({ dueDate: newDeadline.toISOString() })] }) }));
    expect(repo.appendHistory).toHaveBeenCalled();
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ entityId: "assignment" }));
  });
  it("does not create a version for an unchanged deadline", async () => {
    await assignTemplate("template", { targetType: "AACCUP_AREA", targetId: "area", dueDate: oldDeadline }, actor);
    expect(mocks.tx.requirementAssignment.update).not.toHaveBeenCalled();
    expect(repo.appendVersion).not.toHaveBeenCalled();
  });
  it("rejects new organization-wide attachments", async () => {
    await expect(assignTemplate("template", { targetType: "UNIVERSITY" }, actor)).rejects.toThrow("specific accreditation area");
  });
  it("lets accreditation managers attach an active area template without Root permissions", async () => {
    vi.mocked(repo.listTemplateNodes).mockResolvedValue([{ id: "node", parentId: null, type: "REQUIREMENT", status: "ACTIVE" }] as Awaited<ReturnType<typeof repo.listTemplateNodes>>);
    await expect(attachTemplateToArea("area", "template", { id: "admin", permissions: ["aaccup.manage"] })).resolves.toBeUndefined();
  });
  it("rejects ordinary users and cross-set templates", async () => {
    await expect(attachTemplateToArea("area", "template", { id: "user", permissions: ["aaccup.read"] })).rejects.toThrow("accreditation managers");
    vi.mocked(prisma.aaccupArea.findFirst).mockResolvedValueOnce({ id: "area", areaSet: "ISO" } as Awaited<ReturnType<typeof prisma.aaccupArea.findFirst>>);
    await expect(attachTemplateToArea("area", "template", { id: "admin", permissions: ["aaccup.manage"] })).rejects.toThrow("accreditation set");
  });
});
