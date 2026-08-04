import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/dashboard/dashboard.service";

// =============================================================================
// URS-DMS — dashboard controller (thin)
// Read-only endpoints; no audit entries per dashboard spec.
// =============================================================================

export async function overviewHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getOverview();
  sendSuccess(res, data);
}

export async function documentsHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getDocumentStats();
  sendSuccess(res, data);
}

export async function usersHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getUserStats();
  sendSuccess(res, data);
}

export async function requestsHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getRequestStats();
  sendSuccess(res, data);
}

export async function aaccupHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getAaccupStats();
  sendSuccess(res, data);
}

export async function storageHandler(_req: Request, res: Response): Promise<void> {
  const data = await service.getStorageStats();
  sendSuccess(res, data);
}
