import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {
  aaccupArea: { findFirst: vi.fn() }, requirementAssignment: { findMany: vi.fn() },
} }));
vi.mock("@/modules/aaccup/tasks/aaccup.task-automation.service", () => ({ archiveAutomatedTasksForAreaTemplate: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { invalidateRequirementResolutionCache, resolveRequirementAssignmentForArea } from "./requirement.runtime";

beforeEach(() => {
  vi.clearAllMocks(); invalidateRequirementResolutionCache();
  vi.mocked(prisma.aaccupArea.findFirst).mockResolvedValue({ id: "area", areaSet: "AACCUP", programId: "program" } as Awaited<ReturnType<typeof prisma.aaccupArea.findFirst>>);
});
describe("explicit area template resolution", () => {
  it("does not resolve templates to an area without an explicit attachment", async () => {
    vi.mocked(prisma.requirementAssignment.findMany).mockResolvedValue([]);
    expect(await resolveRequirementAssignmentForArea("area")).toBeNull();
    expect(prisma.requirementAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      OR: [{ targetType: "AACCUP_AREA", targetId: "area" }],
      template: { deletedAt: null, status: "ACTIVE", areaSet: "AACCUP" },
    }) }));
  });
  it("resolves the area attachment with its template version", async () => {
    vi.mocked(prisma.requirementAssignment.findMany).mockResolvedValue([{ id: "assignment", templateId: "template", targetType: "AACCUP_AREA", targetId: "area", dueDate: null, template: { version: 3 } }] as unknown as Awaited<ReturnType<typeof prisma.requirementAssignment.findMany>>);
    expect(await resolveRequirementAssignmentForArea("area")).toMatchObject({ id: "assignment", templateId: "template", templateVersion: 3 });
  });
});
