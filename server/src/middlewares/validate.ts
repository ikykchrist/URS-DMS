import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

// =============================================================================
// URS-DMS — Zod validation middlewares
// validateBody  → replaces req.body
// validateQuery → mutates req.query
// validateParams → mutates req.params
// =============================================================================

function makeValidator<T>(
  pick: (req: Request) => unknown,
  apply: (req: Request, value: unknown) => void,
) {
  return (schema: ZodSchema<T>) => (req: Request, _res: Response, next: NextFunction) => {
    const raw = pick(req);
    const result = schema.safeParse(raw);
    if (!result.success) {
      next(result.error);
      return;
    }
    apply(req, result.data);
    next();
  };
}

export const validateBody = makeValidator<unknown>(
  (req) => req.body,
  (req, value) => {
    req.body = value;
  },
);

export const validateQuery = makeValidator<unknown>(
  (req) => req.query,
  (req, value) => {
    Object.assign(req.query, value);
  },
);

export const validateParams = makeValidator<unknown>(
  (req) => req.params,
  (req, value) => {
    Object.assign(req.params, value);
  },
);
