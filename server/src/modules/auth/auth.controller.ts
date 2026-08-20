import type { Request, Response } from "express";
import * as service from "@/modules/auth/auth.service";
import { clearRefreshCookie, setRefreshCookie } from "@/modules/auth/auth.cookies";
import { sendSuccess } from "@/utils/apiResponse";
import * as registration from "@/modules/auth/registration.service";

// =============================================================================
// URS-DMS — auth controller (thin layer)
// =============================================================================

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { identifier, password } = req.body as { identifier: string; password: string };
  const result = await service.login(
    identifier,
    password,
    req.context.ipAddress,
    req.context.userAgent,
  );
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, result, 200);
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { refreshToken?: string };
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies ?? {};
  const cookieToken = cookies.urs_refresh_token;
  const result = await service.refresh(
    body.refreshToken,
    cookieToken,
    req.context.ipAddress,
    req.context.userAgent,
  );
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, result, 200);
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { refreshToken?: string };
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies ?? {};
  const cookieToken = cookies.urs_refresh_token;
  await service.logout(
    body.refreshToken,
    cookieToken,
    req.auth?.userId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  clearRefreshCookie(res);
  sendSuccess(res, { success: true });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const user = await service.getCurrentUser(req.auth!.userId);
  sendSuccess(res, user);
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };
  await service.changePassword(
    req.auth!.userId,
    currentPassword,
    newPassword,
    req.context.ipAddress,
    req.context.userAgent,
  );
  // After password change, the user's current session was also revoked.
  clearRefreshCookie(res);
  sendSuccess(res, { success: true });
}

export async function registrationOptionsHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await registration.getRegistrationOptions());
}

export async function validateRegistrationTokenHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await registration.validateRegistrationToken(req.body.token));
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const user = await registration.register(req.body, req.context.ipAddress, req.context.userAgent);
  sendSuccess(res, user, 201);
}

export async function requestRegistrationHandler(req: Request, res: Response): Promise<void> {
  await registration.requestInvitation(req.body.email);
  sendSuccess(res, { message: "If the address is eligible, a registration link will be sent shortly." });
}

export async function listSessionsHandler(req: Request, res: Response): Promise<void> {
  const sessions = await service.listSessions(req.auth!.userId, req.auth!.sessionId);
  sendSuccess(res, { sessions });
}

export async function revokeSessionHandler(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.params as { sessionId: string };
  await service.revokeSession(
    req.auth!.userId,
    sessionId,
    req.auth!.sessionId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, { success: true });
}

export async function revokeOtherSessionsHandler(req: Request, res: Response): Promise<void> {
  const revoked = await service.revokeOtherSessions(
    req.auth!.userId,
    req.auth!.sessionId,
    req.context.ipAddress,
    req.context.userAgent,
  );
  sendSuccess(res, { success: true, revoked });
}
