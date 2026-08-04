import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "@/utils/apiResponse";
import * as configService from "@/modules/root/root.config.service";
import * as overviewService from "@/modules/root/root.overview.service";
import type {
  ListConfigurationsQuery,
  ListHistoryQuery,
  RollbackConfigurationBody,
  UpdateConfigurationsBody,
} from "@/modules/root/root.config.validator";

// =============================================================================
// URS-DMS — Root controller (thin)
// =============================================================================
// Controllers stay thin: they build an `Actor` from `req.auth` + `req.context`
// and delegate to the service. No business logic, no Prisma access.
// =============================================================================

function toActor(req: Request): configService.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

// ---------------------------------------------------------------------------
// Platform overview
// ---------------------------------------------------------------------------
export async function getOverviewHandler(req: Request, res: Response): Promise<void> {
  const result = await overviewService.getPlatformOverview(toActor(req));
  sendSuccess(res, result);
}

// ---------------------------------------------------------------------------
// Configuration engine
// ---------------------------------------------------------------------------
export async function listConfigurationsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListConfigurationsQuery;
  const result = await configService.listConfigurations(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function listCategoriesHandler(req: Request, res: Response): Promise<void> {
  const result = await configService.listCategories(toActor(req));
  sendSuccess(res, result);
}

export async function getCategoryConfigurationsHandler(req: Request, res: Response): Promise<void> {
  const { category } = req.params as { category: string };
  const result = await configService.listConfigurations(
    { category, page: 1, pageSize: 200 },
    toActor(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function updateConfigurationsHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateConfigurationsBody;
  const result = await configService.updateConfigurations(input, toActor(req));
  sendSuccess(res, result);
}

export async function deleteConfigurationHandler(req: Request, res: Response): Promise<void> {
  const { key } = req.params as { key: string };
  await configService.deleteConfiguration(key, toActor(req));
  sendNoContent(res);
}

export async function restoreConfigurationHandler(req: Request, res: Response): Promise<void> {
  const { key } = req.params as { key: string };
  const result = await configService.restoreConfiguration(key, toActor(req));
  sendSuccess(res, result);
}

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  const { key } = req.params as { key: string };
  const result = await configService.listVersions(key, toActor(req));
  sendSuccess(res, result);
}

export async function listHistoryHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListHistoryQuery;
  const result = await configService.listHistory(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function rollbackConfigurationHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as RollbackConfigurationBody;
  const result = await configService.rollbackConfiguration(input, toActor(req));
  sendSuccess(res, result);
}
