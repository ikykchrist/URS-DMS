import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody } from "@/middlewares/validate";
import { authLimiter } from "@/middlewares/rateLimiter";
import { forgotPasswordSchema, resetPasswordSchema } from "@/modules/passwordReset/passwordReset.validator";
import {
  forgotPasswordHandler,
  resetPasswordHandler,
  devResetLinkHandler,
} from "@/modules/passwordReset/passwordReset.controller";

export const passwordResetRouter: Router = Router();

passwordResetRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler),
);

passwordResetRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);

passwordResetRouter.get("/dev/reset-link", asyncHandler(devResetLinkHandler));
