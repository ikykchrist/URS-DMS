import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { asyncHandler } from "@/utils/asyncHandler";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  assignWorkflowDefinitionSchema,
  createWorkflowDefinitionSchema,
  createWorkflowStepSchema,
  createWorkflowTransitionSchema,
  listWorkflowAssignmentsQuerySchema,
  listWorkflowDefinitionsQuerySchema,
  listWorkflowHistoryQuerySchema,
  listWorkflowInstancesQuerySchema,
  overrideWorkflowInstanceSchema,
  performWorkflowActionSchema,
  publishWorkflowDefinitionSchema,
  rollbackWorkflowDefinitionSchema,
  runtimeEntityParamSchema,
  updateWorkflowDefinitionSchema,
  updateWorkflowStepSchema,
  updateWorkflowTransitionSchema,
  workflowAssignmentIdParamSchema,
  workflowDefinitionIdParamSchema,
  workflowInstanceIdParamSchema,
  workflowStepIdParamSchema,
  workflowTransitionIdParamSchema,
} from "@/modules/workflow/workflow.validator";
import {
  archiveDefinitionHandler,
  archiveStepHandler,
  archiveTransitionHandler,
  assignDefinitionHandler,
  createDefinitionHandler,
  createStepHandler,
  createTransitionHandler,
  getDefinitionHandler,
  getInstanceHandler,
  listAssignmentsHandler,
  listDefinitionsHandler,
  listHistoryHandler,
  listInstancesHandler,
  listVersionsHandler,
  overrideInstanceHandler,
  performActionHandler,
  publishDefinitionHandler,
  restoreDefinitionHandler,
  restoreStepHandler,
  restoreTransitionHandler,
  rollbackDefinitionHandler,
  unassignHandler,
  updateDefinitionHandler,
  updateStepHandler,
  updateTransitionHandler,
  validateDefinitionHandler,
} from "@/modules/workflow/workflow.controller";

// =============================================================================
// Sprint 7.4.5 — Workflow Builder management router.
// Mounted under /api/v1/root/workflows. The parent rootRouter already enforces
// authentication + the hard ROOT role gate; these routes add granular
// workflow.* permission gates (all ROOT-only via ROOT_ONLY_CODES).
// Fixed segments (/history, /assignments, /instances) are registered before
// the /:id wildcard so they can never be shadowed.
// =============================================================================

export const workflowRouter: Router = Router();

workflowRouter.get(
  "/history",
  requirePermission("workflow.read"),
  validateQuery(listWorkflowHistoryQuerySchema),
  asyncHandler(listHistoryHandler),
);
workflowRouter.get(
  "/assignments",
  requirePermission("workflow.read"),
  validateQuery(listWorkflowAssignmentsQuerySchema),
  asyncHandler(listAssignmentsHandler),
);
workflowRouter.delete(
  "/assignments/:id",
  requirePermission("workflow.assign"),
  validateParams(workflowAssignmentIdParamSchema),
  asyncHandler(unassignHandler),
);
workflowRouter.get(
  "/instances",
  requirePermission("workflow.read"),
  validateQuery(listWorkflowInstancesQuerySchema),
  asyncHandler(listInstancesHandler),
);
workflowRouter.get(
  "/instances/:id",
  requirePermission("workflow.read"),
  validateParams(workflowInstanceIdParamSchema),
  asyncHandler(getInstanceHandler),
);

workflowRouter.get(
  "/",
  requirePermission("workflow.read"),
  validateQuery(listWorkflowDefinitionsQuerySchema),
  asyncHandler(listDefinitionsHandler),
);
workflowRouter.post(
  "/",
  requirePermission("workflow.create"),
  validateBody(createWorkflowDefinitionSchema),
  asyncHandler(createDefinitionHandler),
);

workflowRouter.get(
  "/:id/versions",
  requirePermission("workflow.read"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(listVersionsHandler),
);
workflowRouter.post(
  "/:id/validate",
  requirePermission("workflow.validate"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(validateDefinitionHandler),
);
workflowRouter.post(
  "/:id/publish",
  requirePermission("workflow.publish"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(publishWorkflowDefinitionSchema),
  asyncHandler(publishDefinitionHandler),
);
workflowRouter.post(
  "/:id/rollback",
  requirePermission("workflow.rollback"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(rollbackWorkflowDefinitionSchema),
  asyncHandler(rollbackDefinitionHandler),
);
workflowRouter.post(
  "/:id/assignments",
  requirePermission("workflow.assign"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(assignWorkflowDefinitionSchema),
  asyncHandler(assignDefinitionHandler),
);
workflowRouter.get(
  "/:id/steps",
  requirePermission("workflow.read"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(getDefinitionHandler),
);
workflowRouter.post(
  "/:id/steps",
  requirePermission("workflow.create"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(createWorkflowStepSchema),
  asyncHandler(createStepHandler),
);
workflowRouter.patch(
  "/:id/steps/:stepId",
  requirePermission("workflow.update"),
  validateParams(workflowStepIdParamSchema),
  validateBody(updateWorkflowStepSchema),
  asyncHandler(updateStepHandler),
);
workflowRouter.delete(
  "/:id/steps/:stepId",
  requirePermission("workflow.archive"),
  validateParams(workflowStepIdParamSchema),
  asyncHandler(archiveStepHandler),
);
workflowRouter.post(
  "/:id/steps/:stepId/restore",
  requirePermission("workflow.restore"),
  validateParams(workflowStepIdParamSchema),
  asyncHandler(restoreStepHandler),
);
workflowRouter.post(
  "/:id/transitions",
  requirePermission("workflow.create"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(createWorkflowTransitionSchema),
  asyncHandler(createTransitionHandler),
);
workflowRouter.patch(
  "/:id/transitions/:transitionId",
  requirePermission("workflow.update"),
  validateParams(workflowTransitionIdParamSchema),
  validateBody(updateWorkflowTransitionSchema),
  asyncHandler(updateTransitionHandler),
);
workflowRouter.delete(
  "/:id/transitions/:transitionId",
  requirePermission("workflow.archive"),
  validateParams(workflowTransitionIdParamSchema),
  asyncHandler(archiveTransitionHandler),
);
workflowRouter.post(
  "/:id/transitions/:transitionId/restore",
  requirePermission("workflow.restore"),
  validateParams(workflowTransitionIdParamSchema),
  asyncHandler(restoreTransitionHandler),
);

workflowRouter.get(
  "/:id",
  requirePermission("workflow.read"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(getDefinitionHandler),
);
workflowRouter.patch(
  "/:id",
  requirePermission("workflow.update"),
  validateParams(workflowDefinitionIdParamSchema),
  validateBody(updateWorkflowDefinitionSchema),
  asyncHandler(updateDefinitionHandler),
);
workflowRouter.delete(
  "/:id",
  requirePermission("workflow.archive"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(archiveDefinitionHandler),
);
workflowRouter.post(
  "/:id/restore",
  requirePermission("workflow.restore"),
  validateParams(workflowDefinitionIdParamSchema),
  asyncHandler(restoreDefinitionHandler),
);

// =============================================================================
// Runtime router — mounted at /api/v1/workflows (NOT under /root, so
// reviewers can advance live instances). Permission gates: workflow.instance.*
// / workflow.action.perform / workflow.override (reviewer roles hold the first
// three; override is ROOT-only via ROOT_ONLY_CODES).
// =============================================================================

export const workflowRuntimeRouter: Router = Router();

workflowRuntimeRouter.use(authenticate);

workflowRuntimeRouter.get(
  "/instances",
  requirePermission("workflow.instance.read"),
  validateQuery(listWorkflowInstancesQuerySchema),
  asyncHandler(listInstancesHandler),
);
workflowRuntimeRouter.get(
  "/instances/:id",
  requirePermission("workflow.instance.read"),
  validateParams(workflowInstanceIdParamSchema),
  asyncHandler(getInstanceHandler),
);
workflowRuntimeRouter.post(
  "/instances/:entityType/:entityId/actions",
  requirePermission("workflow.action.perform"),
  validateParams(runtimeEntityParamSchema),
  validateBody(performWorkflowActionSchema),
  asyncHandler(performActionHandler),
);
workflowRuntimeRouter.post(
  "/instances/:id/override",
  requirePermission("workflow.override"),
  validateParams(workflowInstanceIdParamSchema),
  validateBody(overrideWorkflowInstanceSchema),
  asyncHandler(overrideInstanceHandler),
);
