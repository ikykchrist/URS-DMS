import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/utils/apiResponse";
import * as service from "@/modules/root/root.form.service";
import type {
  CreateAssignmentInput,
  CreateFieldInput,
  CreateFormInput,
  ListAssignmentsQuery,
  ListFormsQuery,
  ReorderFieldsInput,
  RollbackFormInput,
  SaveDraftInput,
  UpdateFieldInput,
  UpdateFormInput,
} from "@/modules/root/root.form.validator";

// =============================================================================
// URS-DMS — Dynamic Form Builder controller (thin)
// =============================================================================

function toActor(req: Request): service.Actor {
  return {
    id: req.auth!.userId,
    permissions: req.auth!.permissions,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  };
}

export async function listFormsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListFormsQuery;
  const result = await service.listForms(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.getForm(id, toActor(req));
  sendSuccess(res, template);
}

export async function createFormHandler(req: Request, res: Response): Promise<void> {
  const template = await service.createForm(req.body as CreateFormInput, toActor(req));
  sendCreated(res, template);
}

export async function updateFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.updateForm(id, req.body as UpdateFormInput, toActor(req));
  sendSuccess(res, template);
}

export async function archiveFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  await service.archiveForm(id, toActor(req));
  sendSuccess(res, { id, archived: true });
}

export async function restoreFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.restoreForm(id, toActor(req));
  sendSuccess(res, template);
}

export async function duplicateFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.duplicateForm(id, toActor(req));
  sendCreated(res, template);
}

export async function saveDraftHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as SaveDraftInput;
  const result = await service.saveDraft(id, body.changeNote, toActor(req));
  sendSuccess(res, result);
}

export async function publishFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as SaveDraftInput;
  const template = await service.publishForm(id, body.changeNote, toActor(req));
  sendSuccess(res, template);
}

export async function getFormPreviewHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const preview = await service.getFormPreview(id, toActor(req));
  sendSuccess(res, preview);
}

export async function createFieldHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.createField(id, req.body as CreateFieldInput, toActor(req));
  sendSuccess(res, template);
}

export async function updateFieldHandler(req: Request, res: Response): Promise<void> {
  const { id, fieldId } = req.params as { id: string; fieldId: string };
  const template = await service.updateField(id, fieldId, req.body as UpdateFieldInput, toActor(req));
  sendSuccess(res, template);
}

export async function archiveFieldHandler(req: Request, res: Response): Promise<void> {
  const { id, fieldId } = req.params as { id: string; fieldId: string };
  const template = await service.archiveField(id, fieldId, toActor(req));
  sendSuccess(res, template);
}

export async function reorderFieldsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.reorderFields(id, req.body as ReorderFieldsInput, toActor(req));
  sendSuccess(res, template);
}

export async function listVersionsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const versions = await service.listVersions(id, toActor(req));
  sendSuccess(res, versions);
}

export async function rollbackFormHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.rollbackForm(id, req.body as RollbackFormInput, toActor(req));
  sendSuccess(res, template);
}

export async function listHistoryHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const history = await service.listHistory(id, toActor(req));
  sendSuccess(res, history);
}

export async function listAssignmentsHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as ListAssignmentsQuery;
  const result = await service.listAssignments(query, toActor(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function createAssignmentHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const template = await service.createAssignment(id, req.body as CreateAssignmentInput, toActor(req));
  sendSuccess(res, template);
}

export async function removeAssignmentHandler(req: Request, res: Response): Promise<void> {
  const { id, assignmentId } = req.params as { id: string; assignmentId: string };
  const template = await service.removeAssignment(id, assignmentId, toActor(req));
  sendSuccess(res, template);
}

export async function listAssignmentTargetOptionsHandler(req: Request, res: Response): Promise<void> {
  const { targetType } = req.params as { targetType: string };
  const options = await service.listAssignmentTargetOptions(targetType, toActor(req));
  sendSuccess(res, options);
}
