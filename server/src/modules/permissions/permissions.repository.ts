import { prisma } from "@/lib/prisma";
import type { RoleName } from "@prisma/client";

// =============================================================================
// URS-DMS — permissions repository (read-only data access)
// =============================================================================

export async function loadCodesByRoleId(roleId: string): Promise<string[]> {
  const rows = await prisma.permission.findMany({
    where: { roles: { some: { roleId } } },
    select: { code: true },
  });
  return rows.map((r) => r.code);
}

export async function loadCodesByRoleName(roleName: RoleName): Promise<string[]> {
  const rows = await prisma.permission.findMany({
    where: { roles: { some: { role: { name: roleName } } } },
    select: { code: true },
  });
  return rows.map((r) => r.code);
}

export async function findRoleByName(
  name: RoleName,
): Promise<{ id: string; name: RoleName } | null> {
  return prisma.role.findUnique({
    where: { name },
    select: { id: true, name: true },
  });
}

export async function findRoleById(id: string): Promise<{ id: string; name: RoleName } | null> {
  return prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
}

export async function listAllRoles(): Promise<
  { id: string; name: RoleName; description: string | null }[]
> {
  return prisma.role.findMany({
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
}
