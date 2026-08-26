import { generateNavigationResponse } from "@/modules/navigationAssistant/navigationAssistant.service";

async function main(): Promise<void> {
  const response = await generateNavigationResponse({
    message: "Where can I upload a document? Reply briefly.",
    role: "FACULTY",
  });
  console.log(response.message);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Gemini smoke test failed.";
  console.error(message);
  process.exitCode = 1;
});
