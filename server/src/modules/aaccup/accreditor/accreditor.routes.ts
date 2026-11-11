import { Router } from "express";
import { authenticateIncludingAccreditor } from "@/middlewares/authenticate";
import { requireRole } from "@/middlewares/authorize";
import { validateParams, validateQuery } from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { submissionIdParamSchema } from "../submissions/aaccup.submissions.validator";
import { areasHandler, evidenceHandler, organizationHandler, previewHandler } from "./accreditor.controller";
import { areasQuery, evidenceQuery } from "./accreditor.validator";

export const accreditorRouter: Router = Router();
accreditorRouter.use(authenticateIncludingAccreditor, requireRole("ACCREDITOR"));

accreditorRouter.get("/organization", asyncHandler(organizationHandler));
accreditorRouter.get("/areas", validateQuery(areasQuery), asyncHandler(areasHandler));
accreditorRouter.get("/evidence", validateQuery(evidenceQuery), asyncHandler(evidenceHandler));
accreditorRouter.get("/evidence/:id/preview", validateParams(submissionIdParamSchema), asyncHandler(previewHandler));
