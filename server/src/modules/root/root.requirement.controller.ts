import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/root/root.requirement.service";
import type {
  AssignRequirementTemplateBody,
  CreateAccreditationCycleBody,
  CreateRequirementNodeBody,
  CreateRequirementTemplateBody,
  CreateRequirementValidationBody,
  ListAccreditationCyclesQuery,
  ListRequirementAssignmentsQuery,
  ListRequirementHistoryQuery,
  ListRequirementNodesQuery,
  ListRequirementTemplatesQuery,
  MoveRequirementNodeBody,
  RollbackRequirementTemplateBody,
  UpdateAccreditationCycleBody,
  UpdateRequirementNodeBody,
  UpdateRequirementTemplateBody,
  UpdateRequirementValidationBody,
} from "@/modules/root/root.requirement.validator";

function actor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listTemplatesHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listTemplates(
    req.query as unknown as ListRequirementTemplatesQuery,
    actor(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function createTemplateHandler(req: Request, res: Response): Promise<void> {
  sendCreated(
    res,
    await service.createTemplate(req.body as CreateRequirementTemplateBody, actor(req)),
  );
}

export async function getTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getTemplate(req.params.id!, actor(req)));
}

export async function updateTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateTemplate(
      req.params.id!,
      req.body as UpdateRequirementTemplateBody,
      actor(req),
    ),
  );
}

export async function archiveTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.archiveTemplate(req.params.id!, actor(req)));
}

export async function restoreTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.restoreTemplate(req.params.id!, actor(req)));
}

export async function listNodesHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.listNodes(
      req.params.id!,
      req.query as unknown as ListRequirementNodesQuery,
      actor(req),
    ),
  );
}

export async function createNodeHandler(req: Request, res: Response): Promise<void> {
  sendCreated(
    res,
    await service.createNode(req.params.id!, req.body as CreateRequirementNodeBody, actor(req)),
  );
}

export async function updateNodeHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateNode(
      req.params.id!,
      req.params.nodeId!,
      req.body as UpdateRequirementNodeBody,
      actor(req),
    ),
  );
}

export async function moveNodeHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.moveNode(
      req.params.id!,
      req.params.nodeId!,
      req.body as MoveRequirementNodeBody,
      actor(req),
    ),
  );
}

export async function archiveNodeHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.archiveNode(req.params.id!, req.params.nodeId!, actor(req)));
}

export async function restoreNodeHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.restoreNode(req.params.id!, req.params.nodeId!, actor(req)));
}

export async function createValidationHandler(req: Request, res: Response): Promise<void> {
  sendCreated(
    res,
    await service.createValidation(
      req.params.id!,
      req.params.nodeId!,
      req.body as CreateRequirementValidationBody,
      actor(req),
    ),
  );
}

export async function updateValidationHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateValidation(
      req.params.id!,
      req.params.nodeId!,
      req.params.validationId!,
      req.body as UpdateRequirementValidationBody,
      actor(req),
    ),
  );
}

export async function archiveValidationHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.archiveValidation(
      req.params.id!,
      req.params.nodeId!,
      req.params.validationId!,
      actor(req),
    ),
  );
}

export async function restoreValidationHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.restoreValidation(
      req.params.id!,
      req.params.nodeId!,
      req.params.validationId!,
      actor(req),
    ),
  );
}

export async function assignTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.assignTemplate(
      req.params.id!,
      req.body as AssignRequirementTemplateBody,
      actor(req),
    ),
  );
}

export async function listAssignmentsHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.listAssignments(
      req.query as unknown as ListRequirementAssignmentsQuery,
      actor(req),
    ),
  );
}

export async function unassignTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.unassignTemplate(req.params.id!, actor(req)));
}

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.listVersions(req.params.id!, actor(req)));
}

export async function listHistoryHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listHistory(
    req.query as unknown as ListRequirementHistoryQuery,
    actor(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function rollbackTemplateHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.rollbackTemplate(req.body as RollbackRequirementTemplateBody, actor(req)),
  );
}

export async function listCyclesHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listCycles(
    req.query as unknown as ListAccreditationCyclesQuery,
    actor(req),
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function createCycleHandler(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createCycle(req.body as CreateAccreditationCycleBody, actor(req)));
}

export async function updateCycleHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateCycle(req.params.id!, req.body as UpdateAccreditationCycleBody, actor(req)),
  );
}

export async function archiveCycleHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.archiveCycle(req.params.id!, actor(req)));
}

export async function restoreCycleHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.restoreCycle(req.params.id!, actor(req)));
}
