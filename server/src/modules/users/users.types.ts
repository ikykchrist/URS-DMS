import type { UserStatus } from "@prisma/client";

// =============================================================================
// URS-DMS — users domain shapes (NOT request input shapes — those live in users.validator.ts)
// =============================================================================

export interface UserListItem {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  status: UserStatus;
  roleId: string;
  role: string;
  departmentId: string | null;
  lastLogin: Date | null;
  createdAt: Date;
}

export interface UserDetail extends UserListItem {
  updatedAt: Date;
  deletedAt: Date | null;
}
