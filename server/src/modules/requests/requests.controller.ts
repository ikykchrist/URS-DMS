import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/requests/requests.service";
import type {
  CreateRequestInput,
  ListRequestsQuery,
  DecideRequestInput,
} from "@/modules/requests/requests.validator";

// =============================================================================
// URS-DMS — requests controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listRequestsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListRequestsQuery;
  const result = await service.listRequests(query, toActor(req));
  sendSuccess(res, result.items);
}

export async function getRequestHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const request = await service.getRequest(id, toActor(req));
  sendSuccess(res, request);
}

export async function createRequestHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateRequestInput;
  const request = await service.createRequest(input, toActor(req));
  sendCreated(res, request);
}

export async function approveRequestHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as DecideRequestInput;
  const request = await service.decideRequest(id, "APPROVED", input, toActor(req));
  sendSuccess(res, request);
}

export async function rejectRequestHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as DecideRequestInput;
  const request = await service.decideRequest(id, "REJECTED", input, toActor(req));
  sendSuccess(res, request);
}

export async function fulfillRequestHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const input = req.body as DecideRequestInput;
  const request = await service.decideRequest(id, "FULFILLED", input, toActor(req));
  sendSuccess(res, request);
}

export async function cancelRequestHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const request = await service.cancelRequest(id, toActor(req));
  sendSuccess(res, request);
}
