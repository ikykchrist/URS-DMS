import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError, ServiceUnavailableError } from "@/utils/errors";
import { ERROR_CODES } from "@/config/constants";
import { logger } from "@/utils/logger";
import { env } from "@/config/env";

// =============================================================================
// URS-DMS — global error handler (last middleware)
// =============================================================================

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Request validation failed",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target : [err.meta?.target];
      const field = String(target?.[0] ?? "field");
      res.status(409).json({
        success: false,
        error: {
          code: ERROR_CODES.CONFLICT,
          message: `Unique constraint violated on ${field}`,
          details: { field },
        },
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Resource not found",
        },
      });
      return;
    }
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    const svcErr = new ServiceUnavailableError("Database temporarily unavailable");
    logger.error("Prisma connectivity error", {
      kind: err.name,
      message: err.message,
    });
    res.status(svcErr.status).json({
      success: false,
      error: { code: svcErr.code, message: svcErr.message, details: null },
    });
    return;
  }

  // Unknown error: log full stack, return generic 500.
  logger.error("Unhandled error", {
    error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  });

  res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Internal server error",
      ...(env.NODE_ENV !== "production" && err instanceof Error
        ? { details: { message: err.message, stack: err.stack } }
        : {}),
    },
  });
}
