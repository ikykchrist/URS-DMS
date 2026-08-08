import { Router } from "express";

export const passwordResetRouter: Router = Router();

// Sprint 8.9 — Self-service password reset disabled.
// Passwords can only be changed by Root or Administrator through
// the admin user management page (POST /admin/users/:id/reset-password).

passwordResetRouter.post("/forgot-password", (_req, res) => {
  res.status(410).json({
    success: false,
    error: { code: "GONE", message: "Self-service password reset has been disabled. Contact your administrator." },
  });
});

passwordResetRouter.post("/reset-password", (_req, res) => {
  res.status(410).json({
    success: false,
    error: { code: "GONE", message: "Self-service password reset has been disabled. Contact your administrator." },
  });
});

passwordResetRouter.get("/dev/reset-link", (_req, res) => {
  res.status(410).json({
    success: false,
    error: { code: "GONE", message: "Self-service password reset has been disabled." },
  });
});
