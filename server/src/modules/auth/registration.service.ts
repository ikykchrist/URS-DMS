import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";
import { hashPassword } from "@/modules/auth/auth.password";
import { sendEmail } from "@/modules/email/email.service";
import { writeAudit } from "@/modules/audit/audit.service";
import { AUDIT_ACTIONS } from "@/config/constants";
import { ConflictError, NotFoundError, TokenExpiredError, TokenInvalidError } from "@/utils/errors";
import type { RegistrationInput } from "@/modules/auth/auth.validator";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function registrationUrl(token: string): string {
  const baseUrl = env.PUBLIC_APP_URL ?? env.CLIENT_URL[0] ?? "http://localhost:5173";
  return `${baseUrl.replace(/\/$/, "")}/register?token=${encodeURIComponent(token)}`;
}

export async function createInvitation(email: string, invitedById?: string | null): Promise<{ email: string; expiresAt: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) throw new ConflictError("Email already has an account");

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.registrationInvite.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.registrationInvite.create({
    data: { email: normalizedEmail, tokenHash: hashToken(token), expiresAt, ...(invitedById ? { invitedById } : {}) },
  });

  await sendEmail({
    to: normalizedEmail,
    subject: "URS-DMS registration invitation",
    body: `<p>You have been invited to create an account in URS-DMS.</p><p><a href="${registrationUrl(token)}">Complete your registration</a></p><p>This link expires in 24 hours and can only be used once.</p>`,
  });
  return { email: normalizedEmail, expiresAt: expiresAt.toISOString() };
}

export async function requestInvitation(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (user) return;

  const inviter = await prisma.user.findFirst({
    where: { status: "ACTIVE", role: { name: { in: ["ROOT", "ADMINISTRATOR"] } } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!inviter) return;
  await createInvitation(normalizedEmail, inviter.id);
}

async function getInvite(token: string) {
  const invite = await prisma.registrationInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.usedAt) throw new TokenInvalidError("This registration link is invalid or has already been used");
  if (invite.expiresAt.getTime() <= Date.now()) throw new TokenExpiredError("This registration link has expired");
  return invite;
}

export async function getRegistrationOptions() {
  const [colleges, departments] = await Promise.all([
    prisma.college.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true }, orderBy: { displayOrder: "asc" } }),
    prisma.department.findMany({ where: { deletedAt: null, collegeId: { not: null } }, select: { id: true, name: true, code: true, collegeId: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  return { colleges, departments };
}

export async function validateRegistrationToken(token: string): Promise<{ email: string; expiresAt: string }> {
  const invite = await getInvite(token);
  return { email: invite.email, expiresAt: invite.expiresAt.toISOString() };
}

export async function register(input: RegistrationInput, ipAddress: string | null, userAgent: string | null) {
  const invite = await getInvite(input.token);
  if (invite.email !== input.email.trim().toLowerCase()) throw new TokenInvalidError("This invitation belongs to a different email address");

  const [emailTaken, employeeTaken, department] = await Promise.all([
    prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } }),
    prisma.user.findUnique({ where: { employeeId: input.employeeId }, select: { id: true } }),
    prisma.department.findFirst({ where: { id: input.departmentId, collegeId: input.collegeId, deletedAt: null }, select: { id: true } }),
  ]);
  if (emailTaken) throw new ConflictError("Email already has an account");
  if (employeeTaken) throw new ConflictError("Employee or student ID is already in use");
  if (!department) throw new NotFoundError("Selected department was not found in the selected campus");

  const role = await prisma.role.findUnique({ where: { name: "FACULTY" }, select: { id: true } });
  if (!role) throw new NotFoundError("Default registration role is not configured");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        employeeId: input.employeeId,
        email: invite.email,
        passwordHash,
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        suffix: input.suffix || null,
        roleId: role.id,
        departmentId: input.departmentId,
        status: "ACTIVE",
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    await tx.registrationInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return created;
  });

  await writeAudit({
    action: AUDIT_ACTIONS.USER_CREATED,
    userId: user.id,
    entity: "user",
    entityId: user.id,
    newValue: { source: "registration_invite", email: user.email, departmentId: input.departmentId },
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
  });
  return user;
}
