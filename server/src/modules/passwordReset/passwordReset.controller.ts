import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/passwordReset/passwordReset.service";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@/modules/passwordReset/passwordReset.validator";

// =============================================================================
// URS-DMS — password recovery controller (Sprint 8.2, thin)
// =============================================================================

export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as ForgotPasswordInput;
  const clientOrigin = (req.get("origin") || req.get("referer") || "").replace(/\/+$/, "");
  const result = await service.requestPasswordReset(
    input,
    clientOrigin,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, result);
}

export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as ResetPasswordInput;
  const result = await service.resetPassword(
    input,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, result);
}

export async function devResetLinkHandler(req: Request, res: Response): Promise<void> {
  const email = String((req.query as { email?: string }).email ?? "");
  const result = await service.getDevResetLink(email);
  if (!result) {
    sendSuccess(res, { token: null });
    return;
  }
  sendSuccess(res, result);
}
