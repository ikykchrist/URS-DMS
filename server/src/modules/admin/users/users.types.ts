import type { UserStatus, RoleName } from "@prisma/client";

// =============================================================================
// URS-DMS — Admin · Users domain shapes (Sprint 7.2)
// -----------------------------------------------------------------------------
// Wire view of a user for the admin surface. Sensitive fields are NEVER
// returned — `passwordHash` and refresh tokens stay in the DB. The list and
// detail shapes collapse to the same view (the admin user detail just adds
// `updatedAt` + `deletedAt`).
// =============================================================================

export interface AdminUserListItem {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  status: UserStatus;
  roleId: string;
  roleName: RoleName;
  departmentId: string | null;
  departmentName: string | null;
  collegeId: string | null;        // Derived via department → college (FK chain)
  collegeName: string | null;
  mustChangePassword: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  avatarSeed: string | null;       // Deterministic DiceBear seed — placeholder avatar
  profilePhotoKey: string | null;  // MinIO key when the user uploaded a photo
  photoUrl: string | null;         // Presigned download URL (filled by the service)
}

export type AdminUserDetail = AdminUserListItem;
