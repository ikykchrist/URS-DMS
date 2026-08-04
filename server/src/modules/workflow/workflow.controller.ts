import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/workflow/workflow.service";
import { performWorkflowAction, overrideWorkflowInstance } from "@/modules/workflow/workflow.engine";
import type {
  AssignWorkflowDefinitionBody,
  CreateWorkflowDefinitionBody,
  CreateWorkflowStepBody,
  CreateWorkflowTransitionBody,
  ListWorkflowAssignmentsQuery,
  ListWorkflowDefinitionsQuery,
  ListWorkflowHistoryQuery,
  ListWorkflowInstancesQuery,
  OverrideWorkflowInstanceBody,
  PerformWorkflowActionBody,
  PublishWorkflowDefinitionBody,
  RollbackWorkflowDefinitionBody,
  UpdateWorkflowDefinitionBody,
  UpdateWorkflowStepBody,
  UpdateWorkflowTransitionBody,
} from "@/modules/workflow/workflow.validator";

function actor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listDefinitionsHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listDefinitions(
    actor(req),
    req.query as unknown as ListWorkflowDefinitionsQuery,
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function createDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createDefinition(actor(req), req.body as CreateWorkflowDefinitionBody));
}

export async function getDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getDefinition(actor(req), req.params.id!));
}

export async function updateDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateDefinition(actor(req), req.params.id!, req.body as UpdateWorkflowDefinitionBody),
  );
}

export async function archiveDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.archiveDefinition(actor(req), req.params.id!));
}

export async function restoreDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.restoreDefinition(actor(req), req.params.id!));
}

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.listVersions(actor(req), req.params.id!));
}

export async function listHistoryHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listHistory(
    actor(req),
    req.query as unknown as ListWorkflowHistoryQuery,
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function listAssignmentsHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.listAssignments(actor(req), req.query as unknown as ListWorkflowAssignmentsQuery),
  );
}

export async function assignDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendCreated(
    res,
    await service.assignDefinition(
      actor(req),
      req.params.id!,
      req.body as AssignWorkflowDefinitionBody,
    ),
  );
}

export async function unassignHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.unassign(actor(req), req.params.id!));
}

export async function createStepHandler(req: Request, res: Response): Promise<void> {
  sendCreated(res, await service.createStep(actor(req), req.params.id!, req.body as CreateWorkflowStepBody));
}

export async function updateStepHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateStep(
      actor(req),
      req.params.id!,
      req.params.stepId!,
      req.body as UpdateWorkflowStepBody,
    ),
  );
}

export async function archiveStepHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.archiveStep(actor(req), req.params.id!, req.params.stepId!));
}

export async function restoreStepHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.restoreStep(actor(req), req.params.id!, req.params.stepId!));
}

export async function createTransitionHandler(req: Request, res: Response): Promise<void> {
  sendCreated(
    res,
    await service.createTransition(
      actor(req),
      req.params.id!,
      req.body as CreateWorkflowTransitionBody,
    ),
  );
}

export async function updateTransitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.updateTransition(
      actor(req),
      req.params.id!,
      req.params.transitionId!,
      req.body as UpdateWorkflowTransitionBody,
    ),
  );
}

export async function archiveTransitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.archiveTransition(actor(req), req.params.id!, req.params.transitionId!),
  );
}

export async function restoreTransitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.restoreTransition(actor(req), req.params.id!, req.params.transitionId!),
  );
}

export async function validateDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.validateDefinition(actor(req), req.params.id!));
}

export async function publishDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.publishDefinition(actor(req), req.params.id!, req.body as PublishWorkflowDefinitionBody),
  );
}

export async function rollbackDefinitionHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await service.rollbackDefinition(
      actor(req),
      req.params.id!,
      req.body as RollbackWorkflowDefinitionBody,
    ),
  );
}

export async function listInstancesHandler(req: Request, res: Response): Promise<void> {
  const result = await service.listInstances(
    actor(req),
    req.query as unknown as ListWorkflowInstancesQuery,
  );
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getInstanceHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await service.getInstanceView(actor(req), req.params.id!));
}

export async function performActionHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as PerformWorkflowActionBody;
  const result = await performWorkflowAction({
    entityType: req.params.entityType as never,
    entityId: req.params.entityId!,
    actionCode: body.actionCode,
    actor: actor(req),
    note: body.note,
  });
  if (!result.performed) {
    sendSuccess(res, { performed: false, message: "No workflow is assigned to this entity" });
    return;
  }
  sendSuccess(res, result);
}

export async function overrideInstanceHandler(req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await overrideWorkflowInstance({
      instanceId: req.params.id!,
      action: (req.body as OverrideWorkflowInstanceBody).action,
      actor: actor(req),
      note: (req.body as OverrideWorkflowInstanceBody).note,
    }),
  );
}
