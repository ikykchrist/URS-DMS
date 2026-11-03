import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createTestFolder, createTestUser, type TestUser } from "@/__tests__/helpers";
import * as sharing from "@/modules/folders/folderSharing.service";

const stamp = `share-smoke-${randomUUID().slice(0, 8)}`;
const userIds: string[] = [];
const programIds: string[] = [];
const collegeIds: string[] = [];
let campusId = "";

async function scopedUser(suffix: string, scope: { campusId: string; collegeId: string; programId: string }): Promise<TestUser> {
  const user = await createTestUser("FACULTY", `${stamp}-${suffix}`);
  userIds.push(user.id);
  await prisma.user.update({ where: { id: user.id }, data: scope });
  return user;
}

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.folder.deleteMany({ where: { ownerId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.program.deleteMany({ where: { id: { in: programIds } } });
  await prisma.college.deleteMany({ where: { id: { in: collegeIds } } });
  if (campusId) await prisma.campus.delete({ where: { id: campusId } });
});

describe("folder sharing scope", () => {
  it("limits direct recipients to campus scope and dynamically shares with the entire program", async () => {
    const campus = await prisma.campus.create({ data: { name: `${stamp} Campus`, code: `${stamp}-campus` } });
    campusId = campus.id;
    const [collegeA, collegeB] = await Promise.all([
      prisma.college.create({ data: { name: `${stamp} College A`, code: `${stamp}-college-a`, campusId } }),
      prisma.college.create({ data: { name: `${stamp} College B`, code: `${stamp}-college-b`, campusId } }),
    ]);
    collegeIds.push(collegeA.id, collegeB.id);
    const [programA, programB] = await Promise.all([
      prisma.program.create({ data: { name: `${stamp} Program A`, code: `${stamp}-program-a`, campusId, collegeId: collegeA.id } }),
      prisma.program.create({ data: { name: `${stamp} Program B`, code: `${stamp}-program-b`, campusId, collegeId: collegeB.id } }),
    ]);
    programIds.push(programA.id, programB.id);

    const owner = await scopedUser("owner", { campusId, collegeId: collegeA.id, programId: programA.id });
    const sameProgram = await scopedUser("same-program", { campusId, collegeId: collegeA.id, programId: programA.id });
    const sameCollege = await scopedUser("same-college", { campusId, collegeId: collegeA.id, programId: programA.id });
    const sameCampus = await scopedUser("same-campus", { campusId, collegeId: collegeB.id, programId: programB.id });
    const outsideCampus = await createTestUser("FACULTY", `${stamp}-outside-campus`);
    userIds.push(outsideCampus.id);

    expect((await sharing.listShareableUsers(owner.id, "CAMPUS")).map((user) => user.id)).toEqual(expect.arrayContaining([sameProgram.id, sameCollege.id, sameCampus.id]));
    expect((await sharing.listShareableUsers(owner.id, "CAMPUS")).map((user) => user.id)).not.toContain(outsideCampus.id);
    expect((await sharing.listShareableUsers(owner.id, "COLLEGE")).map((user) => user.id)).toEqual(expect.arrayContaining([sameProgram.id, sameCollege.id]));
    expect((await sharing.listShareableUsers(owner.id, "COLLEGE")).map((user) => user.id)).not.toContain(sameCampus.id);
    expect((await sharing.listShareableUsers(owner.id, "PROGRAM")).map((user) => user.id)).toEqual(expect.arrayContaining([sameProgram.id, sameCollege.id]));

    const folder = await createTestFolder(owner.id, null, `${stamp} Folder`);
    await sharing.shareFolder(folder.id, owner.id, { recipientType: "USER", userIds: [sameCampus.id], permission: "EDITOR" });
    expect(await sharing.resolveFolderAccess(sameCampus.id, folder.id)).toBe("EDITOR");
    await expect(sharing.shareFolder(folder.id, owner.id, { recipientType: "USER", userIds: [outsideCampus.id], permission: "VIEWER" })).rejects.toThrow("campus");

    await sharing.shareFolder(folder.id, owner.id, { recipientType: "PROGRAM", programId: programA.id, permission: "VIEWER" });
    expect(await sharing.resolveFolderAccess(sameProgram.id, folder.id)).toBe("VIEWER");
    expect((await sharing.listSharedWithMe(sameProgram.id)).map((shared) => shared.id)).toContain(folder.id);

    const newProgramMember = await scopedUser("joined-after-share", { campusId, collegeId: collegeA.id, programId: programA.id });
    expect(await sharing.resolveFolderAccess(newProgramMember.id, folder.id)).toBe("VIEWER");
  });
});
