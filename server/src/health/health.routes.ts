import { Router } from "express";
import { sendSuccess } from "@/utils/apiResponse";

// =============================================================================
// URS-DMS — health route (Sprint 8.5: added Redis + BullMQ)
// =============================================================================

export const healthRouter: Router = Router();

healthRouter.get("/", (_req, res) => {
  // Keep the public probe intentionally minimal. Detailed dependency, queue,
  // version, uptime, and memory information belongs in the authenticated
  // Root Console and must not be an unauthenticated reconnaissance oracle.
  sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() });
});
