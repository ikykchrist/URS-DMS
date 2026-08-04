import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as folderBuilderService from "@/modules/root/root.folderBuilder.service";
import type {
  CreateFolderNodeBody,
  CreateFolderTemplateBody,
  ListFolderAssignmentsQuery,
  ListFolderHistoryQuery,
  ListFolderNodesQuery,
  ListFolderTemplatesQuery,
  MoveFolderNodeBody,
  RollbackFolderTemplateBody,
  UpdateFolderNodeBody,
  UpdateFolderTemplateBody,
} from "@/modules/root/root.folderBuilder.validator";

// =============================================================================
// URS-DMS — Root · Dynamic Folder Builder controller (thin)
// -----------------------------------------------------------------------------
// Handlers build an Actor from req.auth + req.context and delegate to the
// service. No business logic, no Prisma access. Permission enforcement lives
// on the routes (`requirePermission("folder.*")`) and is re-asserted inside
// the service (defence in depth).
// =============================================================================

function toActor(req: Request): folderBuilderService.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

export async function listTemplatesHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListFolderTemplatesQuery;
  const result = await folderBuilderService.listTemplates(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.getTemplate(id, toActor(req));
  sendSuccess(res, result);
}

export async function createTemplateHandler(req: Request, res: Response): Promise<void> {
  const result = await folderBuilderService.createTemplate(
    req.body as CreateFolderTemplateBody,
    toActor(req),
  );
  sendCreated(res, result);
}

export async function updateTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.updateTemplate(
    id,
    req.body as UpdateFolderTemplateBody,
    toActor(req),
  );
  sendSuccess(res, result);
}

export async function archiveTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.archiveTemplate(id, toActor(req));
  sendSuccess(res, result);
}

export async function restoreTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.restoreTemplate(id, toActor(req));
  sendSuccess(res, result);
}

export async function duplicateTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.duplicateTemplate(id, toActor(req));
  sendCreated(res, result);
}

// -----------------------------------------------------------------------------
// Nodes
// -----------------------------------------------------------------------------

export async function listNodesHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const query = req.query as unknown as ListFolderNodesQuery;
  const result = await folderBuilderService.listNodes(id, query, toActor(req));
  sendSuccess(res, result);
}

export async function createNodeHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.createNode(
    id,
    req.body as CreateFolderNodeBody,
    toActor(req),
  );
  sendCreated(res, result);
}

export async function getNodeChildrenHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.listNodeChildren(id, nodeId, toActor(req));
  sendSuccess(res, result);
}

export async function updateNodeHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.updateNode(
    id,
    nodeId,
    req.body as UpdateFolderNodeBody,
    toActor(req),
  );
  sendSuccess(res, result);
}

export async function moveNodeHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.moveNode(
    id,
    nodeId,
    req.body as MoveFolderNodeBody,
    toActor(req),
  );
  sendSuccess(res, result);
}

export async function duplicateNodeHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.duplicateNode(id, nodeId, toActor(req));
  sendCreated(res, result);
}

export async function archiveNodeHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.archiveNode(id, nodeId, toActor(req));
  sendSuccess(res, result);
}

export async function restoreNodeHandler(req: Request, res: Response): Promise<void> {
  const { id, nodeId } = req.params as { id: string; nodeId: string };
  const result = await folderBuilderService.restoreNode(id, nodeId, toActor(req));
  sendSuccess(res, result);
}

// -----------------------------------------------------------------------------
// Versions, history, rollback
// -----------------------------------------------------------------------------

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.listTemplateVersions(id, toActor(req));
  sendSuccess(res, result);
}

export async function listHistoryHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListFolderHistoryQuery;
  const result = await folderBuilderService.listHistory(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function rollbackTemplateHandler(req: Request, res: Response): Promise<void> {
  const result = await folderBuilderService.rollbackTemplate(
    req.body as RollbackFolderTemplateBody,
    toActor(req),
  );
  sendSuccess(res, result);
}

// -----------------------------------------------------------------------------
// Assignments
// -----------------------------------------------------------------------------

export async function listAssignmentsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListFolderAssignmentsQuery;
  const result = await folderBuilderService.listAssignments(query, toActor(req));
  sendSuccess(res, result);
}

export async function assignTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.assignTemplate(
    id,
    req.body as Parameters<typeof folderBuilderService.assignTemplate>[1],
    toActor(req),
  );
  sendSuccess(res, result);
}

export async function unassignTemplateHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const result = await folderBuilderService.unassignTemplate(id, toActor(req));
  sendSuccess(res, result);
}
