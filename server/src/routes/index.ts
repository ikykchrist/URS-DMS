import { Router } from "express";
import { healthRouter } from "@/health/health.routes";
import { authRouter } from "@/modules/auth/auth.routes";
import { usersRouter } from "@/modules/users/users.routes";
import { documentsRouter } from "@/modules/documents/documents.routes";
import { foldersRouter } from "@/modules/folders/folders.routes";
import { requestsRouter } from "@/modules/requests/requests.routes";
import { aaccupRouter } from "@/modules/aaccup/aaccup.routes";
import { dashboardRouter } from "@/modules/dashboard/dashboard.routes";
import { analyticsRouter } from "@/modules/analytics/analytics.routes";
import { auditRouter } from "@/modules/audit/audit.routes";
import { reportsRouter } from "@/modules/reports/reports.routes";
import { adminRouter } from "@/modules/admin/admin.routes";
import { notificationsRouter } from "@/modules/notifications/notifications.routes";
import { rootRouter } from "@/modules/root/root.routes";
import { workflowRuntimeRouter } from "@/modules/workflow/workflow.routes";

// =============================================================================
// URS-DMS — route registry. Mounted under /api/v1 in app.ts.
// =============================================================================

export const apiRouter: Router = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/folders", foldersRouter);
apiRouter.use("/requests", requestsRouter);
apiRouter.use("/aaccup", aaccupRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/audit", auditRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/workflows", workflowRuntimeRouter);
apiRouter.use("/root", rootRouter);
