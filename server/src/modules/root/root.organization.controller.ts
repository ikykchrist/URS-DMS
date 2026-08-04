import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as orgService from "@/modules/root/root.organization.service";
import type { OrgEntityConfig } from "@/modules/root/root.organization.types";
import type { ListOrganizationQuery } from "@/modules/root/root.organization.validator";

// =============================================================================
// URS-DMS — Root · Organization Management Engine controller (thin)
// -----------------------------------------------------------------------------
// Handlers are produced by factory functions bound to an entity config so one
// router definition serves all four entities (colleges / departments / offices
// / programs). Controllers stay thin: build an Actor from req.auth + req.context
// and delegate to the service. No business logic, no Prisma access.
// =============================================================================

function toActor(req: Request): orgService.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function getOrganizationTreeHandler(req: Request, res: Response): Promise<void> {
  const result = await orgService.getOrganizationTree(toActor(req));
  sendSuccess(res, result);
}

export function makeListHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ListOrganizationQuery;
    const result = await orgService.listRecords(cfg.name, query, toActor(req));
    sendSuccess(res, result.items, 200, result.meta);
  };
}

export function makeGetHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await orgService.getRecord(cfg.name, id, toActor(req));
    sendSuccess(res, result);
  };
}

export function makeCreateHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const result = await orgService.createRecord(cfg.name, req.body, toActor(req));
    sendCreated(res, result);
  };
}

export function makeUpdateHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await orgService.updateRecord(cfg.name, id, req.body, toActor(req));
    sendSuccess(res, result);
  };
}

export function makeArchiveHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await orgService.archiveRecord(cfg.name, id, toActor(req));
    sendSuccess(res, result);
  };
}

export function makeRestoreHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await orgService.restoreRecord(cfg.name, id, toActor(req));
    sendSuccess(res, result);
  };
}

export function makeListVersionsHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const result = await orgService.listVersions(cfg.name, id, toActor(req));
    sendSuccess(res, result);
  };
}

export function makeRollbackHandler(cfg: OrgEntityConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    const { version } = req.body as { version: number };
    const result = await orgService.rollbackRecord(cfg.name, id, version, toActor(req));
    sendSuccess(res, result);
  };
}
