import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/apiResponse";
import { listAccreditationOrganization } from "../aaccup.service";
import type { AreasQuery, EvidenceQuery } from "./accreditor.validator";
import { listViewerAreas, listApprovedEvidence, previewApprovedEvidence } from "./accreditor.service";

export async function organizationHandler(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await listAccreditationOrganization());
}

export async function areasHandler(req: Request, res: Response): Promise<void> {
  const { items, meta } = await listViewerAreas(req.query as unknown as AreasQuery);
  sendSuccess(res, items, 200, meta);
}

export async function evidenceHandler(req: Request, res: Response): Promise<void> {
  const { items, meta } = await listApprovedEvidence(req.query as unknown as EvidenceQuery);
  sendSuccess(res, items, 200, meta);
}

export async function previewHandler(req: Request, res: Response): Promise<void> {
  const result = await previewApprovedEvidence(req.params.id!, {
    userId: req.auth!.userId,
    ipAddress: req.context.ipAddress,
    userAgent: req.context.userAgent,
  });
  res.setHeader("Cache-Control", "no-store");
  sendSuccess(res, result);
}
