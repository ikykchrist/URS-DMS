# API Conventions

This document describes the conventions every REST endpoint follows.
Sprint 1 ships only `/health`; Sprint 2+ will add feature endpoints
following the same rules.

## Base URL

```
http://localhost:4000/api/v1
```

Versioning: `/api/v1` is the current version. Breaking changes require
a new prefix (`/api/v2`).

## Content type

All requests and responses use `application/json`.

For file uploads (Sprint 2+) we'll use `multipart/form-data`.

## Authentication

Most endpoints require a valid JWT. The token can be sent either way:

```
Authorization: Bearer <access-token>
```

or as a cookie (set automatically by the login endpoint):

```
Cookie: urs_access_token=<access-token>
```

For refresh: send the refresh token in the request body
(`{ "refreshToken": "..." }`) or as a cookie.

## Standard response envelope

### Success

```json
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": { ... }              // optional: pagination, version, etc.
}
```

| Field      | Type    | Required | Notes                                       |
|------------|---------|----------|---------------------------------------------|
| `success`  | boolean | yes      | Always `true` for 2xx responses             |
| `data`     | any     | yes      | The payload (object or array)               |
| `meta`     | object  | no       | Pagination, server version, etc.            |

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "field": ["error message"] }
  }
}
```

| Field         | Type    | Notes                                              |
|---------------|---------|----------------------------------------------------|
| `code`        | string  | Machine-readable, from `ERROR_CODES` in constants  |
| `message`     | string  | Human-readable, safe to display                   |
| `details`     | any     | Optional, structured context (validation errors)   |

### Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 153,
    "totalPages": 8
  }
}
```

## HTTP status codes

| Code | Meaning                              |
|------|--------------------------------------|
| 200  | OK                                   |
| 201  | Created                              |
| 204  | No Content                           |
| 400  | Bad Request / Validation             |
| 401  | Unauthorized                         |
| 403  | Forbidden                            |
| 404  | Not Found                            |
| 409  | Conflict                             |
| 422  | Unprocessable Entity                 |
| 429  | Too Many Requests                    |
| 500  | Internal Server Error                |
| 503  | Service Unavailable                  |

## Error codes

All error codes are declared in `src/config/constants.ts`:

```
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INTERNAL_ERROR
SERVICE_UNAVAILABLE
RATE_LIMITED
```

Auth-specific codes (in `src/modules/auth/auth.errors.ts`):

```
TokenMissingError → UNAUTHORIZED
TokenExpiredError → UNAUTHORIZED
InvalidTokenError → UNAUTHORIZED
InsufficientPermissionsError → FORBIDDEN
```

## Rate limiting

- Default: 100 requests / 15 minutes per IP (global)
- Stricter: 5 requests / 15 minutes on auth endpoints (Sprint 2)

Clients should read these response headers:

```
RateLimit-Limit:     100
RateLimit-Remaining: 73
RateLimit-Reset:     1690123456
```

## Health check

```
GET /api/v1/health
```

Returns 200 with:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-07-27T12:00:00.000Z",
    "environment": "development",
    "uptime": 12.34,
    "services": {
      "database": { "status": "up", "latencyMs": 5 },
      "minio":    { "status": "up", "bucket": "urs-dms", "exists": true }
    }
  },
  "meta": { "version": "1.0.0" }
}
```

`status` is `"ok"` if all dependencies are up, `"degraded"` otherwise.

## Versioning strategy

- Path version (`/api/v1`) — current
- Backwards-compatible additions are allowed within a version
- Breaking changes require a new version prefix

## Future endpoint examples (Sprint 2+)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/documents
POST   /api/v1/documents            (multipart/form-data)
GET    /api/v1/documents/:id
PATCH  /api/v1/documents/:id
DELETE /api/v1/documents/:id
GET    /api/v1/documents/:id/download
```
