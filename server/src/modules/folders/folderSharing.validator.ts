import { z } from "zod";

export const folderShareSchema = z.object({
  recipientType: z.enum(["USER", "PROGRAM"]),
  userIds: z.array(z.string().uuid()).max(100).optional(),
  programId: z.string().uuid().optional(),
  permission: z.enum(["VIEWER", "EDITOR"]),
}).superRefine((value, ctx) => {
  if (value.recipientType === "USER" && (!value.userIds || value.userIds.length === 0)) ctx.addIssue({ code: "custom", path: ["userIds"], message: "Select at least one user" });
  if (value.recipientType === "PROGRAM" && !value.programId) ctx.addIssue({ code: "custom", path: ["programId"], message: "Select a program" });
});
export type FolderShareInput = z.infer<typeof folderShareSchema>;

export const folderShareUpdateSchema = z.object({ permission: z.enum(["VIEWER", "EDITOR"]) }).strict();
export type FolderShareUpdateInput = z.infer<typeof folderShareUpdateSchema>;

export const shareableUsersQuerySchema = z.object({
  scope: z.enum(["CAMPUS", "COLLEGE", "PROGRAM"]).default("CAMPUS"),
});
export type ShareableUsersQuery = z.infer<typeof shareableUsersQuerySchema>;
