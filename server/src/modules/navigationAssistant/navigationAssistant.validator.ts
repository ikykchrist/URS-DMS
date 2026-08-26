import { z } from "zod";

export const navigationAssistantBodySchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(1000, "Message is too long"),
  })
  .strict();

export type NavigationAssistantBody = z.infer<typeof navigationAssistantBodySchema>;
