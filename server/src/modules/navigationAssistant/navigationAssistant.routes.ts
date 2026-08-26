import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "@/middlewares/authenticate";
import { validateBody } from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { navigationAssistantHandler } from "@/modules/navigationAssistant/navigationAssistant.controller";
import { navigationAssistantBodySchema } from "@/modules/navigationAssistant/navigationAssistant.validator";

const navigationAssistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? "unknown",
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many assistant requests, please try again later." },
  },
});

export const navigationAssistantRouter: Router = Router();

// Authenticate first so the limiter is keyed by the trusted user identity.
navigationAssistantRouter.use(authenticate);
navigationAssistantRouter.post(
  "/navigation",
  navigationAssistantLimiter,
  validateBody(navigationAssistantBodySchema),
  asyncHandler(navigationAssistantHandler),
);
