import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authenticate } from "@/middlewares/authenticate";
import { requirePermission } from "@/middlewares/authorize";
import { validateBody, validateParams, validateQuery } from "@/middlewares/validate";
import {
  createRequestSchema,
  decideRequestSchema,
  listRequestsQuerySchema,
  requestIdParamSchema,
} from "@/modules/requests/requests.validator";
import {
  approveRequestHandler,
  cancelRequestHandler,
  createRequestHandler,
  fulfillRequestHandler,
  getRequestHandler,
  listRequestsHandler,
  rejectRequestHandler,
} from "@/modules/requests/requests.controller";

// =============================================================================
// URS-DMS — requests routes
// Listing/getting is gated by request.create OR request.manage; mutations on
// create require request.create, decision mutations require request.manage.
// =============================================================================

export const requestsRouter: Router = Router();

requestsRouter.use(authenticate);

// GET /requests — list visible requests (scoped in service)
requestsRouter.get(
  "/",
  requirePermission("request.create"),
  validateQuery(listRequestsQuerySchema),
  asyncHandler(listRequestsHandler),
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
  requirePermission("request.create"),
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
