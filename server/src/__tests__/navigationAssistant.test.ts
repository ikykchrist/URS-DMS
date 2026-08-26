import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({
  env: {
    DEEPSEEK_API_KEY: undefined,
    DEEPSEEK_MODEL: "deepseek-chat",
    NODE_ENV: "test",
    LOG_LEVEL: "error",
  },
}));

describe("navigation assistant service", () => {
  it("fails gracefully when Gemini is not configured", async () => {
    const { generateResponse } = await import("@/modules/navigationAssistant/navigationAssistant.service");
    await expect(generateResponse("Where are my documents?")).rejects.toMatchObject({
      status: 503,
      message: "The navigation assistant is not configured.",
    });
  });

  it("rejects empty prompts without calling Gemini", async () => {
    const { generateResponse } = await import("@/modules/navigationAssistant/navigationAssistant.service");
    await expect(generateResponse("   ")).rejects.toMatchObject({ status: 503 });
  });
});
