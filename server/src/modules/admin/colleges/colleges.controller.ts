import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/admin/colleges/colleges.service";
import type {
  CollegeListQuery,
  CreateCollegeBody,
  UpdateCollegeBody,
} from "@/modules/admin/colleges/colleges.validator";

// =============================================================================
// URS-DMS — Admin · Colleges controller (thin)
// =============================================================================
// Controllers stay thin: they build an `Actor` from `req.auth` + `req.context`
// and delegate to the service. No business logic, no Prisma access.
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listCollegesHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as CollegeListQuery;
  const result = await service.listColleges(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getCollegeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const college = await service.getCollege(id, toActor(req));
  sendSuccess(res, college);
}

export async function createCollegeHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateCollegeBody;
  const college = await service.createCollege(input, toActor(req));
  sendCreated(res, college);
}

export async function updateCollegeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as UpdateCollegeBody;
  const college = await service.updateCollege(id, input, toActor(req));
  sendSuccess(res, college);
}

export async function archiveCollegeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const college = await service.archiveCollege(id, toActor(req));
  sendSuccess(res, college);
}

export async function restoreCollegeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const college = await service.restoreCollege(id, toActor(req));
  sendSuccess(res, college);
}
