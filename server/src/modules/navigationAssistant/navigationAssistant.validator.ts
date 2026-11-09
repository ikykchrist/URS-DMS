import { z } from "zod";

export const navigationAssistantHistoryTurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1, "History turn cannot be empty").max(1200, "History turn is too long"),
  })
  .strict();

export const navigationAssistantBodySchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(1000, "Message is too long"),
    /** Prior turns for conversational context. Bounded so a request cannot grow unbounded. */
    history: z.array(navigationAssistantHistoryTurnSchema).max(12, "Too many history turns").optional(),
  })
  .strict();

export type NavigationAssistantBody = z.infer<typeof navigationAssistantBodySchema>;
