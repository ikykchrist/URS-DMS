import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
import { areaAudienceScope, actorAreaScope } from "./aaccup.scope";
import { prisma } from "@/lib/prisma";

describe("accreditation audience boundaries", () => {
  const member = { campusId: "campus-a", collegeId: "college-a", programId: "program-a" };
  it("includes the exact program and the same college-wide audience", () => {
    expect(areaAudienceScope(member)).toEqual({ OR: [
      { programId: "program-a" },
      { programId: null, campusId: "campus-a", collegeId: "college-a" },
    ] });
  });
  it("requires both campus and college for college-wide access", () => {
    expect(areaAudienceScope({ ...member, campusId: null })).toEqual({ OR: [{ programId: "program-a" }] });
    expect(areaAudienceScope({ ...member, collegeId: null })).toEqual({ OR: [{ programId: "program-a" }] });
  });
  it("does not grant access to unscoped accounts", () => {
    expect(areaAudienceScope(null)).toEqual({ OR: [] });
    expect(areaAudienceScope({ campusId: null, collegeId: null, programId: null })).toEqual({ OR: [] });
  });
  it("allows college members without granting access to every program", () => {
    expect(areaAudienceScope({ ...member, programId: null })).toEqual({ OR: [
      { programId: null, campusId: "campus-a", collegeId: "college-a" },
    ] });
  });
  it("loads the audience from the authenticated account, not client scope", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(member as never);
    expect(await actorAreaScope("signed-in-user")).toEqual(areaAudienceScope(member));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "signed-in-user" }, select: { programId: true, campusId: true, collegeId: true },
    });
  });
});
