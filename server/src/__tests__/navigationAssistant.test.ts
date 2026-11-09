import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    DEEPSEEK_MODEL: "deepseek-chat",
    ASSISTANT_API_KEY: undefined,
    ASSISTANT_API_URL: undefined,
    ASSISTANT_MODEL: undefined,
    NODE_ENV: "test",
    LOG_LEVEL: "error",
  },
}));

describe("navigation assistant service", () => {
  it("uses local guidance when no remote provider is configured", async () => {
    const { generateResponse } = await import("@/modules/navigationAssistant/navigationAssistant.service");
    await expect(generateResponse("Where are my documents?")).resolves.toContain("My Documents");
  });

  it("rejects empty prompts without calling a provider", async () => {
    const { generateResponse } = await import("@/modules/navigationAssistant/navigationAssistant.service");
    await expect(generateResponse("   ")).rejects.toMatchObject({ status: 503 });
  });

  it("routes local request questions to request guidance", async () => {
    const { generateResponse } = await import("@/modules/navigationAssistant/navigationAssistant.service");
    await expect(generateResponse("How do I track my request?")).resolves.toContain("My Requests");
  });
});
