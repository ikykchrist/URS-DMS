import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody, validateQuery } from "@/middlewares/validate";
import rateLimit from "express-rate-limit";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  devResetLinkQuerySchema,
} from "@/modules/passwordReset/passwordReset.validator";
import {
  devResetLinkHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "@/modules/passwordReset/passwordReset.controller";

// =============================================================================
// URS-DMS — password recovery routes (Sprint 8.2)
// Mounted on /auth by routes/index.ts (after the frozen authRouter, which
// does not define these paths). Rate-limited per IP with a SEPARATE instance
// so reset-request hammering can never lock the login/refresh buckets.
// NOTE: the authLimiter's `skip: res.statusCode < 400` hook evaluates before
// the handler (statusCode is always 200 at that point) and therefore never
// counts — this limiter intentionally counts EVERY request instead.
// The dev reset-link endpoint is hard-disabled outside NODE_ENV=development.
// =============================================================================

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many reset requests, please try again later." },
  },
});

export const passwordResetRouter: Router = Router();

passwordResetRouter.post(
  "/forgot-password",
  resetLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler),
);

passwordResetRouter.post(
  "/reset-password",
  resetLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);

// DEVELOPMENT ONLY — see passwordReset.service.ts getDevResetLink.
passwordResetRouter.get(
  "/dev/reset-link",
  validateQuery(devResetLinkQuerySchema),
  asyncHandler(devResetLinkHandler),
);
