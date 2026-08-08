import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requireAnyPermission, requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  createRequestSchema,
  decideRequestSchema,
  listRequestsQuerySchema,
  requestIdParamSchema,
} from "@/modules/requests/requests.validator";
import {
  approveRequestHandler,
  browseRequestHandler,
  cancelRequestHandler,
  createRequestHandler,
  fulfillRequestHandler,
  getRequestHandler,
  listRequestsHandler,
  rejectRequestHandler,
} from "@/modules/requests/requests.controller";

// =============================================================================
// URS-DMS — requests routes
// Listing/getting is gated by request.create OR request.manage (managers such
// as QAOs hold only request.manage but must review); mutations on create
// require request.create, decision mutations require request.manage.
// =============================================================================

export const requestsRouter: Router = Router();

requestsRouter.use(authenticate);

// GET /requests — list visible requests (scoped in service)
requestsRouter.get(
  "/",
  requireAnyPermission("request.create", "request.manage"),
  validateQuery(listRequestsQuerySchema),
  asyncHandler(listRequestsHandler),
);

// GET /requests/browse — list-only department archive bucket for requesters
requestsRouter.get(
  "/browse",
  requirePermission("request.create"),
  asyncHandler(browseRequestHandler),
);

// POST /requests — create a new request
requestsRouter.post(
  "/",
  requirePermission("request.create"),
  validateBody(createRequestSchema),
  asyncHandler(createRequestHandler),
);

// GET /requests/:id — fetch a single request
requestsRouter.get(
  "/:id",
  requireAnyPermission("request.create", "request.manage"),
  validateParams(requestIdParamSchema),
  asyncHandler(getRequestHandler),
);

// POST /requests/:id/approve — approve a pending request
requestsRouter.post(
  "/:id/approve",
  requirePermission("request.manage"),
  validateParams(requestIdParamSchema),
  validateBody(decideRequestSchema),
  asyncHandler(approveRequestHandler),
);

// POST /requests/:id/reject — reject a pending request
requestsRouter.post(
  "/:id/reject",
  requirePermission("request.manage"),
  validateParams(requestIdParamSchema),
  validateBody(decideRequestSchema),
  asyncHandler(rejectRequestHandler),
);

// POST /requests/:id/fulfill — mark an approved request as fulfilled
requestsRouter.post(
  "/:id/fulfill",
  requirePermission("request.manage"),
  validateParams(requestIdParamSchema),
  validateBody(decideRequestSchema),
  asyncHandler(fulfillRequestHandler),
);

// POST /requests/:id/cancel — requester cancels their own pending request
requestsRouter.post(
  "/:id/cancel",
  requirePermission("request.create"),
  validateParams(requestIdParamSchema),
  asyncHandler(cancelRequestHandler),
);
