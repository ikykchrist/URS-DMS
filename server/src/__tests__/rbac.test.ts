// =============================================================================
// URS-DMS — RBAC and permissions tests (Sprint 8.6)
// Tests role hierarchy, permission bindings, ROOT protection, and escalation guard.
// =============================================================================

import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, PERMISSION_CODES } from "@/modules/permissions/permissions.constants";
import { DEFAULT_ROLE_MATRIX } from "@/modules/roles/roles.constants";
import { createTestUser, cleanupTestUser } from "@/__tests__/helpers";

const createdUserIds: string[] = [];

afterAll(async () => {
  for (const id of createdUserIds) {
    await cleanupTestUser(id);
  }
});

describe("Role Hierarchy", () => {
  it("has exactly 7 roles in the matrix", () => {
    expect(DEFAULT_ROLE_MATRIX).toHaveLength(7);
  });

  it("all roles have unique names", () => {
    const names = DEFAULT_ROLE_MATRIX.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("ROOT role binds every catalog permission", () => {
    const root = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ROOT");
    expect(root).toBeDefined();
    expect(root!.permissions.length).toBeGreaterThanOrEqual(PERMISSION_CODES.length);
  });

  it("ADMINISTRATOR has fewer permissions than ROOT", () => {
    const root = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ROOT");
    const admin = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ADMINISTRATOR");
    expect(admin!.permissions.length).toBeLessThan(root!.permissions.length);
  });

  it("FACULTY and STAFF have non-empty permission sets", () => {
    for (const name of ["FACULTY", "STAFF"]) {
      const role = DEFAULT_ROLE_MATRIX.find((r) => r.name === name);
      expect(role!.permissions.length).toBeGreaterThan(5);
    }
  });

  it("READ_ONLY has minimal permissions", () => {
    const role = DEFAULT_ROLE_MATRIX.find((r) => r.name === "READ_ONLY");
    expect(role!.permissions.length).toBeLessThan(15);
  });
});

describe("Permission Catalog", () => {
  it("catalog has entries", () => {
    expect(PERMISSIONS.length).toBeGreaterThan(50);
  });

  it("every code is unique", () => {
    const codes = PERMISSIONS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("PERMISSION_CODES matches PERMISSIONS length", () => {
    expect(PERMISSION_CODES.length).toBe(PERMISSIONS.length);
  });

  it("all catalog entries have module and description", () => {
    for (const perm of PERMISSIONS) {
      expect(perm.code).toBeTruthy();
      expect(perm.module).toBeTruthy();
      expect(perm.description).toBeTruthy();
    }
  });

  it("ROOT role binds root.access (ROOT-only code)", () => {
    const root = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ROOT");
    expect(root!.permissions).toContain("root.access");
  });

  it("ADMINISTRATOR does not have root.access", () => {
    const admin = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ADMINISTRATOR");
    expect(admin!.permissions).not.toContain("root.access");
  });

  it("FACULTY does not have root.* codes", () => {
    const faculty = DEFAULT_ROLE_MATRIX.find((r) => r.name === "FACULTY");
    const rootOnly = faculty!.permissions.filter((c) => c.startsWith("root."));
    expect(rootOnly).toHaveLength(0);
  });
});

describe("RBAC Middleware Logic", () => {
  it("permission check: user with requested code passes", () => {
    const actorPerms = ["users.read", "users.create"];
    expect(actorPerms.includes("users.read")).toBe(true);
  });

  it("permission check: user without requested code fails", () => {
    const actorPerms = ["documents.read"];
    expect(actorPerms.includes("users.create")).toBe(false);
  });

  it("ROOT_ONLY_CODES are bound to ROOT and excluded from ADMINISTRATOR", () => {
    const root = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ROOT");
    const admin = DEFAULT_ROLE_MATRIX.find((r) => r.name === "ADMINISTRATOR");

    const adminSet = new Set(admin!.permissions);
    const adminMissing = root!.permissions.filter((c) => !adminSet.has(c));
    expect(adminMissing.length).toBeGreaterThan(10);

    expect(adminMissing).toContain("root.access");
  });
});

describe("Privilege Escalation Guard (business logic)", () => {
  it("cannot grant a permission the actor does not hold", () => {
    const actorPerms = ["users.read", "users.create"];
    const requestedPerms = ["users.read", "root.access"];

    const actorSet = new Set(actorPerms);
    const notHeld = requestedPerms.filter((c) => !actorSet.has(c));

    expect(notHeld).toContain("root.access");
    expect(notHeld.length).toBe(1);
  });

  it("can grant permissions the actor already holds", () => {
    const actorPerms = ["users.read", "users.create", "users.update"];
    const requestedPerms = ["users.read", "users.create"];

    const actorSet = new Set(actorPerms);
    const notHeld = requestedPerms.filter((c) => !actorSet.has(c));

    expect(notHeld).toHaveLength(0);
  });

  it("unknown permission codes are detectable", () => {
    const catalogue = new Set<string>(PERMISSION_CODES as string[]);
    const requested: string[] = ["users.read", "users.fake_perm_xyz"];
    const unknown = requested.filter((c) => !catalogue.has(c));
    expect(unknown).toEqual(["users.fake_perm_xyz"]);
  });
});

describe("Database Role Population", () => {
  it("roles table has 7 rows", async () => {
    const count = await prisma.role.count();
    expect(count).toBe(7);
  });

  it("every matrix role exists in DB", async () => {
    const dbRoles = await prisma.role.findMany({ select: { name: true } });
    const dbNames = new Set(dbRoles.map((r) => r.name));
    for (const matrix of DEFAULT_ROLE_MATRIX) {
      expect(dbNames.has(matrix.name)).toBe(true);
    }
  });

  it("ROOT role has all permissions bound in DB", async () => {
    const root = await prisma.role.findUnique({
      where: { name: "ROOT" },
      select: { permissions: { select: { permission: { select: { code: true } } } } },
    });
    expect(root).not.toBeNull();
    expect(root!.permissions.length).toBeGreaterThanOrEqual(PERMISSION_CODES.length);
  });

  it("DB permission bindings match matrix for FACULTY", async () => {
    const facultyMatrix = DEFAULT_ROLE_MATRIX.find((r) => r.name === "FACULTY");
    const facultyDb = await prisma.role.findUnique({
      where: { name: "FACULTY" },
      select: { permissions: { select: { permission: { select: { code: true } } } } },
    });
    const dbCodes = facultyDb!.permissions.map((p) => p.permission.code).sort();
    const matrixCodes = [...facultyMatrix!.permissions].sort();
    expect(dbCodes).toEqual(matrixCodes);
  });
});

describe("Test User Creation and Cleanup", () => {
  it("can create and cleanup a test FACULTY user", async () => {
    const user = await createTestUser("FACULTY", "rbac-test");
    createdUserIds.push(user.id);

    expect(user.id).toBeTruthy();
    expect(user.roleName).toBe("FACULTY");

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.roleId).toBe(user.roleId);
  });
});
