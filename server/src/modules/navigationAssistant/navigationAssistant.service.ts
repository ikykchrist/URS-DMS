import { env } from "@/config/env";
import { ServiceUnavailableError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import {
  audienceForRole,
  navigationKnowledgeFor,
  roleBoundaryResponse,
  type NavigationAudience,
} from "@/modules/navigationAssistant/navigationAssistant.knowledge";
import { navigationActionsFor, type NavigationAction } from "@/modules/navigationAssistant/navigationAssistant.actions";
import type { RoleName } from "@prisma/client";

const SYSTEM_INSTRUCTION = "You are the URS-DMS Navigation Assistant. Your job is to help the authenticated user understand how to navigate and use URS-DMS. Use only the provided URS-DMS navigation knowledge and the user's authorized role context. Keep answers concise, practical, and easy to follow. Never invent pages, buttons, routes, permissions, or features. Never instruct a user to access functionality outside their role. If functionality is unavailable to the role, explain that briefly. You are guidance-only. You do not perform destructive or administrative actions. You do not read private documents, PDFs, submissions, audit records, or database records.";
const REQUEST_TIMEOUT_MS = 15_000;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

function providerConfig(): { apiKey: string; apiUrl: string; model: string } | null {
  const apiKey = env.ASSISTANT_API_KEY ?? env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    apiUrl: env.ASSISTANT_API_URL ?? (env.ASSISTANT_API_KEY ? GROQ_API_URL : DEEPSEEK_API_URL),
    model: env.ASSISTANT_MODEL ?? env.DEEPSEEK_MODEL,
  };
}

function localResponse(prompt: string, audience: NavigationAudience = "USER", actions: NavigationAction[] = []): string {
  const text = prompt.toLowerCase();
  if (/document|file|upload|folder|preview|download/.test(text)) {
    return "Open My Documents to upload, organize, preview, or download your files. Use New Folder to organize items and Recycle Bin to restore deleted files.";
  }
  if (/aaccup|iso|accreditation|requirement|submission/.test(text)) {
    return audience === "USER"
      ? "Open the AACCUP group, choose AACCUP or ISO, then open the appropriate Area to review requirements and submit evidence."
      : "Open the AACCUP group, choose the accreditation set, then open an Area to manage requirements and review submitted evidence.";
  }
  if (/request/.test(text)) {
    return audience === "USER" ? "Open My Requests to create and track document requests." : "Open Requests to review pending document requests.";
  }
  if (/notification/.test(text)) return "Open Notifications to review system events and follow available links to the related item.";
  if (/profile|password|account|session/.test(text)) return "Open Profile or Account & Security to update your supported account details, password, and active sessions.";
  if (/user management|manage users|add user/.test(text) && audience !== "USER") return "Open User Management to view and manage accounts permitted by your role.";
  if (/requirement builder/.test(text) && audience === "ROOT") return "Open Root Console, then Requirement Builder to manage the universal accreditation requirement templates.";
  if (actions.length > 0) return `Use ${actions.map((action) => action.label).join(" or ")} to continue.`;
  return "I can help you find URS-DMS pages and explain how to use Documents, Requests, AACCUP or ISO, Notifications, Profile, and the tools authorized for your role.";
}

function safeProviderErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") return `status_${status}`;
  }
  return error instanceof Error ? error.name : "unknown_error";
}

/** Generate one navigation-assistant response without persisting context. */
export async function generateResponse(prompt: string): Promise<string> {
  return generateProviderResponse(prompt, SYSTEM_INSTRUCTION, "USER", [], prompt);
}

export interface NavigationResponseInput {
  message: string;
  /** Trusted server-side role. Never accept this value directly from a client. */
  role: RoleName;
}

export interface NavigationResponse {
  message: string;
  actions: NavigationAction[];
}

export async function generateNavigationResponse(input: NavigationResponseInput): Promise<NavigationResponse> {
  const normalizedMessage = input.message.trim();
  const audience = audienceForRole(input.role);
  const guarded = roleBoundaryResponse(audience, normalizedMessage);
  if (guarded) return { message: guarded, actions: [] };

  const prompt = `Authorized role audience: ${audience}\n\nCurrent URS-DMS navigation knowledge:\n${navigationKnowledgeFor(audience)}\n\nUser question: ${normalizedMessage}`;
  const actions = navigationActionsFor(audience, normalizedMessage);
  const message = await generateProviderResponse(prompt, `${SYSTEM_INSTRUCTION}\n\nThe trusted role audience for this request is ${audience}. Do not reveal or provide instructions from another audience's knowledge.`, audience, actions, normalizedMessage);
  return { message, actions };
}

async function generateProviderResponse(prompt: string, systemInstruction: string, audience: NavigationAudience, actions: NavigationAction[], fallbackPrompt: string): Promise<string> {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    throw new ServiceUnavailableError("The navigation assistant received an empty prompt.");
  }
  const provider = providerConfig();
  if (!provider) return localResponse(fallbackPrompt, audience, actions);

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: normalizedPrompt },
        ],
        max_tokens: 200,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw Object.assign(new Error("assistant_provider_error"), { status: response.status });
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("assistant_empty_response");
    return text;
  } catch (error) {
    logger.warn("Navigation assistant request failed", { code: safeProviderErrorCode(error) });
    return localResponse(fallbackPrompt, audience, actions);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export const navigationAssistantSystemInstruction = SYSTEM_INSTRUCTION;

export type { NavigationAudience };
