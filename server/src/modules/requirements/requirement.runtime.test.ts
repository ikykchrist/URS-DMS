import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {
  aaccupArea: { findFirst: vi.fn() }, requirementAssignment: { findMany: vi.fn() }, requirementTemplate: { findFirst: vi.fn() },
} }));
vi.mock("@/modules/aaccup/tasks/aaccup.task-automation.service", () => ({ archiveAutomatedTasksForAreaTemplate: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { invalidateRequirementResolutionCache, resolveRequirementAssignmentForArea } from "./requirement.runtime";

beforeEach(() => {
  vi.clearAllMocks(); invalidateRequirementResolutionCache();
  vi.mocked(prisma.aaccupArea.findFirst).mockResolvedValue({ id: "area", areaSet: "AACCUP", programId: "program" } as Awaited<ReturnType<typeof prisma.aaccupArea.findFirst>>);
});
describe("universal area template resolution", () => {
  it("uses the active set template when an area has no explicit attachment", async () => {
    vi.mocked(prisma.requirementAssignment.findMany).mockResolvedValue([]);
    vi.mocked(prisma.requirementTemplate.findFirst).mockResolvedValue({ id: "template", version: 4, assignments: [{ id: "universal", targetType: "UNIVERSITY", targetId: null, dueDate: null }] } as unknown as Awaited<ReturnType<typeof prisma.requirementTemplate.findFirst>>);
    expect(await resolveRequirementAssignmentForArea("area")).toMatchObject({ id: "universal", templateId: "template", templateVersion: 4 });
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
