import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import { generateNavigationResponse } from "@/modules/navigationAssistant/navigationAssistant.service";
import type { NavigationAssistantBody } from "@/modules/navigationAssistant/navigationAssistant.validator";

export async function navigationAssistantHandler(req: Request, res: Response): Promise<void> {
  const { message } = req.body as NavigationAssistantBody;
  const response = await generateNavigationResponse({
    message,
    // Role comes from authenticate middleware, never from the request body.
    role: req.auth!.roleName,
  });
  sendSuccess(res, response);
}
