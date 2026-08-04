import { ERROR_CODES, type ErrorCode } from "@/config/constants";

// =============================================================================
// URS-DMS — error classes
// All operational errors derive from ApiError. The global error handler
// recognizes these and maps them to the standard envelope.
// =============================================================================

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, ERROR_CODES.VALIDATION_ERROR, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(401, ERROR_CODES.UNAUTHORIZED, message, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, ERROR_CODES.FORBIDDEN, message, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details?: unknown) {
    super(404, ERROR_CODES.NOT_FOUND, message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, ERROR_CODES.CONFLICT, message, details);
  }
}

export class InvalidCredentialsError extends ApiError {
  constructor() {
    super(401, ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials");
  }
}

export class AccountLockedError extends ApiError {
  constructor(lockedUntil: Date) {
    super(423, ERROR_CODES.ACCOUNT_LOCKED, "Account is locked", {
      lockedUntil: lockedUntil.toISOString(),
    });
  }
}

export class AccountInactiveError extends ApiError {
  constructor(reason: string) {
    super(403, ERROR_CODES.ACCOUNT_INACTIVE, `Account is ${reason.toLowerCase()}`);
  }
}

export class TokenInvalidError extends ApiError {
  constructor(message = "Invalid token") {
    super(401, ERROR_CODES.TOKEN_INVALID, message);
  }
}

export class TokenExpiredError extends ApiError {
  constructor(message = "Token expired") {
    super(401, ERROR_CODES.TOKEN_EXPIRED, message);
  }
}

export class RefreshReuseDetectedError extends ApiError {
  constructor() {
    super(401, ERROR_CODES.REFRESH_REUSE_DETECTED, "Refresh token reuse detected");
  }
}

export class EmailTakenError extends ApiError {
  constructor() {
    super(409, ERROR_CODES.EMAIL_TAKEN, "Email already in use");
  }
}

export class EmployeeIdTakenError extends ApiError {
  constructor() {
    super(409, ERROR_CODES.EMPLOYEE_ID_TAKEN, "Employee ID already in use");
  }
}

export class PasswordTooWeakError extends ApiError {
  constructor(message = "Password does not meet policy") {
    super(422, ERROR_CODES.PASSWORD_TOO_WEAK, message);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = "Service unavailable", details?: unknown) {
    super(503, ERROR_CODES.SERVICE_UNAVAILABLE, message, details);
  }
}
