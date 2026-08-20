import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody } from "@/middlewares/validate";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { authLimiter } from "@/middlewares/rateLimiter";
import { changePasswordSchema, loginSchema, refreshSchema, registrationRequestSchema, registrationSchema, registrationTokenSchema } from "@/modules/auth/auth.validator";
import {
  changePasswordHandler,
  listSessionsHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  revokeOtherSessionsHandler,
  revokeSessionHandler,
  registrationOptionsHandler,
  validateRegistrationTokenHandler,
  registerHandler,
  requestRegistrationHandler,
} from "@/modules/auth/auth.controller";

// =============================================================================
// URS-DMS — auth routes
//   POST /api/v1/auth/login       — public, rate-limited (5/15min)
//   POST /api/v1/auth/refresh     — public (refresh-token protected)
//   POST /api/v1/auth/logout      — public (idempotent)
//   GET  /api/v1/auth/me          — authenticated
//   POST /api/v1/auth/change-password — authenticated (users.self.update)
// =============================================================================

export const authRouter: Router = Router();

authRouter.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(loginHandler));

authRouter.post("/refresh", authLimiter, validateBody(refreshSchema), asyncHandler(refreshHandler));

authRouter.get("/registration-options", asyncHandler(registrationOptionsHandler));
authRouter.post("/registration/validate", authLimiter, validateBody(registrationTokenSchema), asyncHandler(validateRegistrationTokenHandler));
authRouter.post("/registration", authLimiter, validateBody(registrationSchema), asyncHandler(registerHandler));
authRouter.post("/registration/request", authLimiter, validateBody(registrationRequestSchema), asyncHandler(requestRegistrationHandler));

authRouter.post("/logout", asyncHandler(logoutHandler));

authRouter.get("/me", authenticate, asyncHandler(meHandler));

authRouter.post(
  "/change-password",
  authenticate,
  requirePermission("users.self.update"),
  validateBody(changePasswordSchema),
  asyncHandler(changePasswordHandler),
);

authRouter.get("/sessions", authenticate, asyncHandler(listSessionsHandler));

authRouter.post(
  "/sessions/:sessionId/kill",
  authenticate,
  asyncHandler(revokeSessionHandler),
);

authRouter.post(
  "/sessions/kill-all",
  authenticate,
  asyncHandler(revokeOtherSessionsHandler),
);
