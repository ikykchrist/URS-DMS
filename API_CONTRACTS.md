# URS-DMS â€” API Contracts

> Authoritative contract for every URS-DMS HTTP endpoint. Each backend task
> ENDS by appending its endpoints to this file, so the frontend can be wired in
> without reading the source and the thesis documentation has a ready-made
> API reference.
>
> Convention: one block per endpoint. Group by module. Keep the schema in
> TypeScript-ish notation so it maps 1:1 to the `interface`s in
> `server/src/modules/*/*.types.ts`.
>
> All endpoints are mounted under `/api/v1`. All responses use the standard
> envelope from `utils/apiResponse.ts`:
>
> ```jsonc
> // Success
> { "success": true, "data": <T>, "meta"?: { ... } }
>
> // Error
> {
>   "success": false,
>   "error": { "code": "<ErrorCode>", "message": "<string>", "details"?: <any> }
> }
> ```
>
> Every error eventually surfaces as one of the `ERROR_CODES` in
> `server/src/config/constants.ts` (VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN,
> NOT_FOUND, CONFLICT, INTERNAL_ERROR, SERVICE_UNAVAILABLE, RATE_LIMITED).
> Zod validation failures return 400 with `details.fieldErrors`; Prisma
> `P2025` â†’ 404; Prisma `P2002` â†’ 409; everything else â†’ 500 (stack hidden in
> production).

---

## Analytics  (Sprint 6.2 â€” Analytics & Trend API)

Historical / trend reporting across Documents, Requests, AACCUP, Users and
Storage. Powers dashboard charts and future reports. No frontend implemented
yet â€” these contracts are the integration surface.

### Shared query parameters

Every `/analytics/*` endpoint accepts the same query string, validated by
`analyticsQuerySchema` (`server/src/modules/analytics/analytics.validator.ts`):

| Param          | Type                                            | Required | Default    | Notes                                                                 |
|----------------|-------------------------------------------------|----------|------------|-----------------------------------------------------------------------|
| `granularity`  | `"daily" \| "weekly" \| "monthly" \| "yearly"` | no       | `"monthly"` | Bucket size for time-series points.                                 |
| `from`         | ISO 8601 date (e.g. `2026-01-01T00:00:00Z`)    | no       | see note   | Inclusive lower bound. Default scales with granularity.              |
| `to`           | ISO 8601 date                                  | no       | now (UTC)  | Inclusive upper bound.                                                |
| `departmentId` | `uuid`                                          | no       | â€”          | Scope aggregates to a single department.                             |
| `areaId`       | `uuid`                                          | no       | â€”          | Scope AACCUP aggregates to a single area (where applicable).         |

**Default `from` when omitted** (so a chart always has a sensible window):

| Granularity | Default window  |
|-------------|------------------|
| `daily`     | last 30 days     |
| `weekly`    | last 12 weeks     |
| `monthly`   | last 12 months   |
| `yearly`    | last 5 years     |

**Bucket label formats** (time-series `label` field):

| Granularity | Label format      | Example       |
|-------------|--------------------|---------------|
| `daily`     | `YYYY-MM-DD`       | `2026-08-01`  |
| `weekly`    | `YYYY-Www` (ISO)   | `2026-W31`    |
| `monthly`   | `YYYY-MM`          | `2026-08`     |
| `yearly`    | `YYYY`             | `2026`        |

Zero buckets are always included (gaps filled with `value: 0`), so charts never
shift across the X axis.

**Permission** (all five endpoints): `analytics.read`
  â†’ granted to `ADMINISTRATOR`, `QUALITY_ASSURANCE_OFFICER`,
    `DEPARTMENT_COORDINATOR` (see `roles.constants.ts`).
  â†’ Access token required (standard `authenticate` middleware).

---

### `GET /analytics/uploads`

**Permission:** `analytics.read`

**Doc:** Document upload trends over time + per-department breakdown.

**Response `data`:**

```ts
interface UploadsAnalytics {
  overTime: { label: string; value: number }[];
  perDepartment: { label: string; value: number }[];
}
```

| Field           | Description                                                          |
|-----------------|----------------------------------------------------------------------|
| `overTime`      | Count of `Document` rows whose `createdAt` falls in each bucket. Soft-deleted documents excluded. |
| `perDepartment` | Count of all live documents grouped by `Department.name`, sorted descending. Documents with no department (`departmentId = null`) are grouped under the label `"Unassigned"`. |

**Errors:**

| Status | Code              | When                                              |
|--------|-------------------|---------------------------------------------------|
| 400    | `VALIDATION_ERROR`| Bad `granularity` / non-UUID `departmentId` / bad date. |
| 401    | `UNAUTHORIZED`    | Missing / invalid access token.                   |
| 403    | `FORBIDDEN`       | Caller lacks `analytics.read`.                    |

**Example:**

```
GET /api/v1/analytics/uploads?granularity=monthly&from=2026-01-01&to=2026-08-31
```

```json
{
  "success": true,
  "data": {
    "overTime": [
      { "label": "2026-01", "value": 12 },
      { "label": "2026-02", "value": 7 },
      { "label": "2026-03", "value": 0 }
    ],
    "perDepartment": [
      { "label": "College of Education", "value": 142 },
      { "label": "College of Engineering", "value": 88 },
      { "label": "Unassigned", "value": 5 }
    ]
  }
}
```

---

### `GET /analytics/requests`

**Permission:** `analytics.read`

**Doc:** Document-request trends, status breakdown, and processing metrics.

**Response `data`:**

```ts
interface RequestsAnalytics {
  createdOverTime: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  processing: {
    averageProcessingTimeMinutes: number;
    approvalRate: number;
    totalDecided: number;
  };
}
```

| Field                              | Description                                                                                |
|------------------------------------|--------------------------------------------------------------------------------------------|
| `createdOverTime`                  | Count of `DocumentRequest` rows whose `createdAt` falls in each bucket (within `from..to`).|
| `byStatus`                         | Counts per `RequestStatus` enum value: `PENDING`, `APPROVED`, `REJECTED`, `FULFILLED`. (Across all requests, not just the date window.) |
| `processing.averageProcessingTimeMinutes` | Mean of `decidedAt - createdAt` over every decided request, rounded to 0.1. `0` if none decided. |
| `processing.approvalRate`         | `100 * approved / (approved + rejected)`, rounded to 0.1. `0` when there are no decisions. `approvalRate` is a percentage (0â€“100). |
| `processing.totalDecided`          | `approved + rejected`.                                                                      |

**Endpoint ignores `departmentId` / `areaId`** (requests are not department-bound in the schema).

**Example:**

```json
{
  "success": true,
  "data": {
    "createdOverTime": [
      { "label": "2026-07", "value": 18 },
      { "label": "2026-08", "value": 23 }
    ],
    "byStatus": [
      { "label": "PENDING",   "value": 4 },
      { "label": "APPROVED",  "value": 31 },
      { "label": "REJECTED",  "value": 6 },
      { "label": "FULFILLED", "value": 22 }
    ],
    "processing": {
      "averageProcessingTimeMinutes": 432.5,
      "approvalRate": 83.8,
      "totalDecided": 37
    }
  }
}
```

---

### `GET /analytics/aaccup`

**Permission:** `analytics.read`

**Doc:** AACCUP compliance trend + completion rollups + submission trend. The
area/requirement rollups delegate to the compliance service's
`calculateOverallCompliance()` (single source of truth).

**Response `data`:**

```ts
interface AaccupAnalytics {
  complianceTrend:      { label: string; value: number }[];
  areaCompletion:       { label: string; value: number }[];
  requirementCompletion:{ label: string; value: number }[];
  submissionTrend:      { label: string; value: number }[];
}
```

| Field                    | Description                                                                                                          |
|--------------------------|----------------------------------------------------------------------------------------------------------------------|
| `complianceTrend`        | Per-bucket compliance percentage. `value = 100 * APPROVED / total submissions` in the bucket (mirrors the compliance service's COMPLETED rule), rounded to 0.1. Buckets with zero submissions report `0`. |
| `areaCompletion`        | Histogram of areas by compliance-percentage band. Labels are fixed: `"0-25"`, `"26-50"`, `"51-75"`, `"76-99"`, `"100"`. Reflects the optional `departmentId` / `areaId` filter. |
| `requirementCompletion` | Counts per `RequirementStatus`: `COMPLETED`, `PENDING`, `NEEDS_REVISION`, `REJECTED`, `MISSING` (from `compliance.service.ts` analytics). Reflects the filter. |
| `submissionTrend`       | Count of `AaccupSubmission` rows whose `submittedAt` falls in each bucket (filter applied). Soft-deleted submissions excluded. |

**Filter scope:** both `departmentId` and `areaId` are honored across all four
sections (the requirement/area rollups pass them through to
`calculateOverallCompliance`; the submission trend filters via
`requirement.area.departmentId` / `requirement.areaId`).

**Example:**

```json
{
  "success": true,
  "data": {
    "complianceTrend": [
      { "label": "2026-06", "value": 64.3 },
      { "label": "2026-07", "value": 71.0 },
      { "label": "2026-08", "value": 75.5 }
    ],
    "areaCompletion": [
      { "label": "0-25",   "value": 2 },
      { "label": "26-50",  "value": 3 },
      { "label": "51-75",  "value": 4 },
      { "label": "76-99",  "value": 1 },
      { "label": "100",    "value": 0 }
    ],
    "requirementCompletion": [
      { "label": "COMPLETED",      "value": 54 },
      { "label": "PENDING",        "value": 12 },
      { "label": "NEEDS_REVISION", "value": 4 },
      { "label": "REJECTED",       "value": 2 },
      { "label": "MISSING",        "value": 18 }
    ],
    "submissionTrend": [
      { "label": "2026-06", "value": 22 },
      { "label": "2026-07", "value": 31 },
      { "label": "2026-08", "value": 28 }
    ]
  }
}
```

---

### `GET /analytics/users`

**Permission:** `analytics.read`

**Doc:** New-user trend, active-user trend, and login-activity trend.

**Response `data`:**

```ts
interface UsersAnalytics {
  newUsers:      { label: string; value: number }[];
  activeUsers:   { label: string; value: number }[];
  loginActivity: { label: string; value: number }[];
}
```

| Field           | Description                                                                                                                          |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `newUsers`      | Count of `User` rows whose `createdAt` falls in each bucket (soft-deleted excluded).                                                |
| `activeUsers`   | Distinct `userId` values among `Session` rows whose `createdAt` falls in the bucket (best available proxy â€” there is no VisitLog). |
| `loginActivity` | Count of `AuditLog` rows with action `auth.login.success` OR `auth.login.failed` in each bucket.                                      |

**`departmentId` / `areaId` are ignored** by this endpoint (analytics are system-wide).

**Example:**

```json
{
  "success": true,
  "data": {
    "newUsers": [
      { "label": "2026-07", "value": 3 },
      { "label": "2026-08", "value": 1 }
    ],
    "activeUsers": [
      { "label": "2026-07", "value": 17 },
      { "label": "2026-08", "value": 14 }
    ],
    "loginActivity": [
      { "label": "2026-07", "value": 412 },
      { "label": "2026-08", "value": 305 }
    ]
  }
}
```

---

### `GET /analytics/storage`

**Permission:** `analytics.read`

**Doc:** Storage growth over time + count of files uploaded over time + grand totals.

**Response `data`:**

```ts
interface StorageAnalytics {
  storageGrowth:        { label: string; value: number }[];
  filesOverTime:        { label: string; value: number }[];
  totalStorageUsedBytes: string; // BigInt serialized as string
  totalFiles:           number;
}
```

| Field                   | Description                                                                                                            |
|-------------------------|------------------------------------------------------------------------------------------------------------------------|
| `storageGrowth`         | Sum of `DocumentVersion.sizeBytes` (BigInt) for versions whose `uploadedAt` falls in each bucket, converted to JS `number`. |
| `filesOverTime`         | Count of `DocumentVersion` rows whose `uploadedAt` falls in each bucket.                                                |
| `totalStorageUsedBytes` | Sum of `sizeBytes` across ALL versions (string â€” BigInt JSON-serializes safely). Includes "ghost" objects of soft-deleted documents until MinIO GC lands (repo known issue). |
| `totalFiles`            | Total count of `DocumentVersion` rows.                                                                                  |

**`departmentId` / `areaId` are ignored** by this endpoint (versions are not department-bound).

**Example:**

```json
{
  "success": true,
  "data": {
    "storageGrowth": [
      { "label": "2026-07", "value": 1048576 },
      { "label": "2026-08", "value": 2411724 }
    ],
    "filesOverTime": [
      { "label": "2026-07", "value": 12 },
      { "label": "2026-08", "value": 23 }
    ],
    "totalStorageUsedBytes": "8421504563",
    "totalFiles": 417
  }
}
```

---

## Future contracts

Subsequent backend tasks append their endpoint contracts below this line,
grouped by module, following the same shape (Endpoint / Method / Permission /
Request body / Query params / Response schema / Error responses).

---

## Audit  (Sprint 6.3 â€” Audit Center)

Read-only APIs over the existing append-only `AuditLog` table
(`prisma/schema.prisma` `model AuditLog`). The audit WRITE path
(`modules/audit/audit.service.ts â†’ writeAudit`) is **unchanged**; this sprint
only adds a read/export surface. No audit entries are themselves written on a
read/export (consistent with the dashboard / analytics read-only convention).

### Shared audit item shape

Every list / detail / export row carries these fields. `module` and `status`
are **derived** from the raw `action` literal (the AuditLog table has no
dedicated columns for them) so the Audit Center UI can group / filter without
re-deriving the rule on the client. `changes` is included only on the detail
endpoint â€” list rows are intentionally slim for pagination.

```ts
interface AuditActor {
  id: string | null;          // AuditLog.userId  (null = anonymous/system act)
  name: string | null;        // firstName + lastName;  null when id is null
  email: string | null;       // null when id is null or user purged
  role: string | null;        // RoleName enum value; null when id is null
  departmentId: string | null; // FK only (User has no `department` relation
                               // field in the schema â€” the Audit Center resolves
                               // it client-side via the departments module)
}

interface AuditEntityRef {
  type: string | null;        // AuditLog.entity   (e.g. "document", "user")
  id: string | null;          // AuditLog.entityId (UUID of affected row)
}

interface AuditLogListItem {
  id: string;                 // UUID of the AuditLog row
  timestamp: string;          // ISO 8601 â€” AuditLog.createdAt
  action: string;             // raw action literal (e.g. "document.updated")
  module: string;             // action prefix before the first "." (e.g. "document")
  status: "SUCCESS" | "FAILED";
  user: AuditActor;
  entity: AuditEntityRef;
  ipAddress: string | null;
  userAgent: string | null;
}

interface AuditLogDetail extends AuditLogListItem {
  changes: {
    oldValue: unknown;        // AuditLog.oldValue JSON; sensitive keys masked â†’ "***"
    newValue: unknown;        // AuditLog.newValue JSON; sensitive keys masked â†’ "***"
  };
}
```

**`status` derivation rule** (single source: `FAILED_AUDIT_ACTIONS` in
`audit.repository.ts`):

| Action literal                                          | `status` |
|---------------------------------------------------------|----------|
| `auth.login.failed`                                     | `FAILED` |
| `auth.refresh.failed`                                   | `FAILED` |
| `auth.refresh.reuse_detected`                           | `FAILED` |
| `auth.permission_denied`                                | `FAILED` |
| everything else                                         | `SUCCESS` |

**Sensitive keys masked in `changes`** (case-insensitive match on the JSON
key): `password`, `passwordhash`, `newpassword`, `oldpassword`,
`currentpassword`, `token`, `accesstoken`, `refreshtoken`, `jti`, `jwt`,
`secret`, `authorization`, `apikey`, `api_key`. String scalars that match the
JWT shape (`xxx.yyy.zzz`) are also replaced with `"***"`.

---

### `GET /audit`

**Permission:** `audit.read`

**Doc:** List audit timeline. Supports filtering, search, sort, pagination.

**Query parameters:**

| Param          | Type                                                                     | Required | Default   | Notes                                                                                                            |
|----------------|--------------------------------------------------------------------------|----------|-----------|------------------------------------------------------------------------------------------------------------------|
| `page`         | number â‰¥ 1                                                              | no       | `1`       | 1-indexed.                                                                                                       |
| `pageSize`     | number 1â€“200                                                            | no       | `25`      |                                                                                                                  |
| `q`            | string (1â€“200)                                                          | no       | â€”         | Free-text search â€” see "Search Fields" below.                                                                     |
| `userId`       | uuid                                                                    | no       | â€”         | Filter rows whose actor matches this user id.                                                                    |
| `roleId`       | uuid                                                                    | no       | â€”         | Filter rows whose actor's role matches this role id.                                                              |
| `departmentId` | uuid                                                                    | no       | â€”         | Filter rows whose actor's `departmentId` matches. (User.departmentId scalar â€” there is no relation.)             |
| `module`       | string                                                                  | no       | â€”         | Action-prefix match (`module=document` matches `document.*`). Trailing `.` optional.                            |
| `entity`       | string                                                                  | no       | â€”         | Exact (case-insensitive) match on `AuditLog.entity`.                                                              |
| `entityId`     | uuid                                                                    | no       | â€”         | Exact match on `AuditLog.entityId`.                                                                              |
| `action`       | string                                                                  | no       | â€”         | Substring (case-insensitive) match on `AuditLog.action` (composes with `status` / `module`).                     |
| `status`       | `"SUCCESS" \| "FAILED"`                                                  | no       | â€”         | Expands to action `in` / `notIn` `FAILED_AUDIT_ACTIONS` (see rule above).                                         |
| `ipAddress`    | string (1â€“64)                                                           | no       | â€”         | Substring (case-insensitive) match on `AuditLog.ipAddress`.                                                       |
| `from`         | ISO date                                                                | no       | â€”         | Inclusive lower bound on `createdAt`.                                                                            |
| `to`           | ISO date                                                                | no       | â€”         | Inclusive upper bound on `createdAt`.                                                                            |
| `sort`         | `"newest" \| "oldest" \| "user" \| "action" \| "module"`                  | no       | `"newest"` | See below.                                                                                                       |

**Sort behaviour:**

| `sort`     | Prisma orderBy                                                                                    |
|------------|---------------------------------------------------------------------------------------------------|
| `newest`   | `createdAt desc, id desc`                                                                          |
| `oldest`   | `createdAt asc, id asc`                                                                            |
| `user`     | `user.lastName asc, createdAt desc, id desc`                                                       |
| `action`   | `action asc, createdAt desc, id desc`                                                              |
| `module`   | `action asc, createdAt desc, id desc` (`module` is derived only in the DTO; sorting on `action` asc yields the same group order) |

**Response `data`:** `AuditLogListItem[]` (the slim list shape â€” no `changes`).
**Response `meta`:**

```ts
{
  page: number;
  pageSize: number;
  total: number;       // total rows matching the filter (independent of page)
  totalPages: number;  // ceil(total / pageSize), minimum 1
}
```

**Errors:**

| Status | Code               | When                                                         |
|--------|--------------------|--------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad query param (non-numeric `page`, invalid UUID, bad date). |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                              |
| 403    | `FORBIDDEN`        | Caller lacks `audit.read`.                                   |

**Example:**

```
GET /api/v1/audit?page=2&pageSize=20&module=document&sort=newest&from=2026-07-01&to=2026-08-01
```

```json
{
  "success": true,
  "data": [
    {
      "id": "8c0dâ€¦",
      "timestamp": "2026-08-01T10:14:22.000Z",
      "action": "document.updated",
      "module": "document",
      "status": "SUCCESS",
      "user": {
        "id": "b1…",
        "name": "Jane Doe",
        "email": "jane@urs.edu",
        "role": "DEPARTMENT_COORDINATOR",
        "departmentId": "deâ€¦"
      },
      "entity": { "type": "document", "id": "faâ€¦" },
      "ipAddress": "10.0.0.4",
      "userAgent": "Mozilla/5.0 â€¦"
    }
  ],
  "meta": { "page": 2, "pageSize": 20, "total": 318, "totalPages": 16 }
}
```

---

### `GET /audit/:id`

**Permission:** `audit.read`

**Doc:** Single audit row with the (masked) change payload.

**Path parameter:** `id` â€” uuid of the AuditLog row.

**Response `data`:** `AuditLogDetail` (extends `AuditLogListItem` with `changes`).

**Errors:**

| Status | Code               | When                                            |
|--------|--------------------|-------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `id` is not a uuid.                             |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                 |
| 403    | `FORBIDDEN`        | Caller lacks `audit.read`.                      |
| 404    | `NOT_FOUND`        | No AuditLog row with that id (or hard-purged).  |

---

### `GET /audit/export`

**Permission:** `audit.export` â€” **administrator-only** (only `ADMINISTRATOR`
inherits `audit.export`; no other role is granted it in
`DEFAULT_ROLE_MATRIX`).

**Doc:** Bulk-download of the audit timeline. **Respects the same active
filters as `GET /audit`**; pagination is ignored on `csv` (the whole matching
window is dumped in one query, capped by `maxRows`). The response bypasses the
`{ success, data }` envelope and streams a real file:
- `format=csv` â†’ `Content-Type: text/csv; charset=utf-8`, RFC-4180 escaping,
  a flat projection of the list shape (no `changes` payload, since list rows
  don't carry it).
- `format=json` â†’ `Content-Type: application/json; charset=utf-8`, **raw JSON
  array** of list-shape rows (no envelope â€” directly re-importable).

The `Content-Disposition` is `attachment; filename="audit-export-YYYYMMDDTHHMMSS.{ext}"`.

**Query parameters:** every parameter accepted by `GET /audit` is accepted
here. Additionally:

| Param      | Type                          | Required | Default | Notes                                                                              |
|------------|-------------------------------|----------|---------|------------------------------------------------------------------------------------|
| `format`   | `"csv" \| "json"`            | no       | `"csv"` | Output format.                                                                     |
| `maxRows`  | number 1â€“10000               | no       | `10000` | Cap on the number of rows fetched in one query (protects the server from a runaway export). |

(`page` / `pageSize` are accepted but ignored â€” the export dumps the whole
match window up to `maxRows`.)

**CSV columns (header row):**

```
id,timestamp,action,module,status,userId,userName,userEmail,userRole,
userDepartmentId,entityType,entityId,ipAddress,userAgent
```

**Errors:**

| Status | Code               | When                                                                                  |
|--------|--------------------|---------------------------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad filter / bad date / non-uuid `entityId`.                                           |
| 400    | `VALIDATION_ERROR` | `format` not in `["csv","json"]` or `maxRows` out of range (caught by Zod).           |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                                                       |
| 403    | `FORBIDDEN`        | Caller lacks `audit.export` (i.e. is not an administrator).                           |

**Example:**

```
GET /api/v1/audit/export?format=csv&module=document&from=2026-01-01&to=2026-08-31
```

```
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="audit-export-20260801T101422.csv"

id,timestamp,action,module,status,userId,userName,userEmail,userRole,userDepartmentId,entityType,entityId,ipAddress,userAgent
8c0dâ€¦,2026-08-01T10:14:22.000Z,document.updated,document,SUCCESS,b1…,Jane Doe,jane@urs.edu,DEPARTMENT_COORDINATOR,deâ€¦,document,faâ€¦,10.0.0.4,"Mozilla/5.0 â€¦"
â€¦
```

---

## Admin  (Sprint 7.1 â€” Administration Backend)

Administration surface for organisational entities + system configuration.
Three sub-modules, all mounted under `/api/v1/admin`. Every route requires an
authenticated session (the dispatcher `admin.routes.ts` mounts `authenticate`
once) **and** a granular department.*/college.*/admin.settings.* permission
(per-route `requirePermission(...)`). The service layer re-asserts the same
permission so a wiring mistake at the route layer can never bypass RBAC
(AI_CONTEXT Â§5 â€” defence in depth).

Mutation endpoints each emit a dedicated `AUDIT_ACTIONS` constant via
`writeAudit` in `modules/audit/audit.service.ts`. Read paths (settings GET,
list/detail department/college) do not audit â€” consistent with the project-wide
read-only convention (AI_CONTEXT Â§8).

Two new Prisma models were added in migration `20260816000000_sprint7_1_admin`
and seeded implicitly via the `DEFAULT_ROLE_MATRIX` in
`modules/roles/roles.constants.ts` (which already binds the new
`department.read` / `college.read` / `admin.settings.read` codes to the QAO
role; all new codes auto-bind to `ADMINISTRATOR` via
`PERMISSIONS.map((p) => p.code)`):

```prisma
model College {
  id          String       @id @default(uuid())
  name        String
  code        String       @unique
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  deletedAt   DateTime?
  departments Department[]
  @@index([deletedAt])
  @@map("colleges")
}

model SystemSetting {
  id                      String   @id @default("singleton")
  applicationName         String   @default("URS Document Management System")
  maxUploadSizeBytes      BigInt   @default(104857600)
  allowedFileTypes        String[] @default([])
  sessionTimeoutMinutes   Int      @default(60)
  defaultPaginationSize   Int      @default(25)
  maintenanceMode         Boolean  @default(false)
  storageThresholdWarning Int      @default(80)
  updatedById             String?
  updatedBy               User?    @relation("SystemSettingUpdater", fields: [updatedById], references: [id], onDelete: SetNull)
  updatedAt               DateTime @updatedAt
  createdAt               DateTime @default(now())
  @@map("system_settings")
}
```

`Department` gained a nullable `collegeId` FK to `College` (`onDelete: SetNull`
â€” preserves department rows when a college is archived). The settings table is
a singleton (PK `id = "singleton"`); `GET /admin/settings` upserts-on-read so
the row always exists even on a freshly-migrated DB.

### Shared department item shape

```ts
interface DepartmentListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  headId: string | null;       // FK to users.id (DepartmentHead relation)
  headName: string | null;     // resolved via single nested include (no extra round-trip)
  collegeId: string | null;   // FK to colleges.id
  collegeName: string | null;
  userCount: number;           // _count.users (live, deletedAt:null)
  documentCount: number;       // _count.documents (live)
  folderCount: number;          // _count.folders (live)
  areaCount: number;           // _count.aaccupAreas (live)
  createdAt: string;            // ISO 8601
  updatedAt: string;
  deletedAt: string | null;    // non-null when archived
}

type DepartmentDetail = DepartmentListItem;
```

### Shared college item shape

```ts
interface CollegeListItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentCount: number;     // _count.departments (live, deletedAt:null)
  createdAt: string;            // ISO 8601
  updatedAt: string;
  deletedAt: string | null;
}

type CollegeDetail = CollegeListItem;
```

### Shared system-settings shape

```ts
interface SystemSettingsView {
  applicationName: string;
  maxUploadSizeBytes: string;    // BigInt serialized as string (AI_CONTEXT Â§6)
  allowedFileTypes: string[];    // e.g. ["pdf","docx","xlsx"]
  sessionTimeoutMinutes: number;
  defaultPaginationSize: number;
  maintenanceMode: boolean;
  storageThresholdWarning: number; // percent of quota (1â€“100)
  updatedById: string | null;
  updatedAt: string;              // ISO 8601
}
```

| Method | Endpoint                              | Permission              | Audit action emitted      |
|--------|---------------------------------------|-------------------------|---------------------------|
| GET    | `/admin/departments`                  | `department.read`       | â€”                         |
| POST   | `/admin/departments`                  | `department.create`     | `department.created`      |
| GET    | `/admin/departments/:id`              | `department.read`       | â€”                         |
| PATCH  | `/admin/departments/:id`              | `department.update`     | `department.updated`      |
| DELETE | `/admin/departments/:id`              | `department.archive`    | `department.archived`     |
| POST   | `/admin/departments/:id/restore`      | `department.archive`    | `department.restored`     |
| GET    | `/admin/colleges`                     | `college.read`          | â€”                         |
| POST   | `/admin/colleges`                     | `college.create`        | `college.created`         |
| GET    | `/admin/colleges/:id`                 | `college.read`          | â€”                         |
| PATCH  | `/admin/colleges/:id`                 | `college.update`        | `college.updated`         |
| DELETE | `/admin/colleges/:id`                 | `college.archive`       | `college.archived`        |
| POST   | `/admin/colleges/:id/restore`         | `college.archive`       | `college.restored`        |
| GET    | `/admin/settings`                     | `admin.settings.read`    | â€”                         |
| PATCH  | `/admin/settings`                     | `admin.settings.update` | `settings.updated`        |

---

### `GET /admin/departments`

**Permission:** `department.read`

**Doc:** Paged list of departments. Optional free-text search and college
filter; supports viewing archived rows via `includeArchived=true`.

**Query parameters:**

| Param             | Type            | Required | Default | Notes                                                                          |
|-------------------|-----------------|----------|---------|--------------------------------------------------------------------------------|
| `page`            | number â‰¥ 1      | no       | `1`     | 1-indexed.                                                                     |
| `pageSize`        | number 1â€“200    | no       | `25`    |                                                                                |
| `q`               | string (1â€“255)  | no       | â€”       | ILIKE contains on `name`, `code`, `description` (case-insensitive).           |
| `collegeId`      | uuid            | no       | â€”       | Filter by parent college.                                                      |
| `includeArchived`| boolean         | no       | `false` | When `true`, return both live and soft-deleted rows.                          |

**Response:** `200` `{ success: true, data: DepartmentListItem[], meta: { page, pageSize, total, totalPages } }`

**Errors:**

| Status | Code               | When                                                |
|--------|--------------------|-----------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad query (Zod).                                    |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                     |
| 403    | `FORBIDDEN`        | Caller lacks `department.read`.                     |

---

### `POST /admin/departments`

**Permission:** `department.create`

**Request body:**

```ts
{
  name: string;          // 1â€“255 chars (trimmed)
  code: string;          // 1â€“64 chars (trimmed)
  description?: string | null;  // max 1000 chars
  headId?: string | null;       // uuid of an existing live User
  collegeId?: string | null;    // uuid of an existing live College
}
```

**Response:** `201` `{ success: true, data: DepartmentDetail }`

**Errors:**

| Status | Code               | When                                                                 |
|--------|--------------------|----------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body / referenced head or college does not exist.                |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                                      |
| 403    | `FORBIDDEN`        | Caller lacks `department.create`.                                   |
| 409    | `CONFLICT`         | A department with this `code` already exists (`@unique` violation). |

Audit: `department.created` (entity=`department`, newValue=name/code/headId/collegeId).

---

### `GET /admin/departments/:id`

**Permission:** `department.read`

**Response:** `200` `{ success: true, data: DepartmentDetail }`

**Errors:**

| Status | Code               | When                                            |
|--------|--------------------|-------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `:id` not a uuid.                                |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                  |
| 403    | `FORBIDDEN`        | Caller lacks `department.read`.                 |
| 404    | `NOT_FOUND`        | No live department with this id.                |

---

### `PATCH /admin/departments/:id`

**Permission:** `department.update`

**Request body:** (any subset of the fields)

```ts
{
  name?: string;                    // 1â€“255 chars
  description?: string | null;      // max 1000 chars
  headId?: string | null;           // uuid of an existing live User
  collegeId?: string | null;        // uuid of an existing live College
}
```

`code` is intentionally **not** editable on the admin update path (it is an
external referential identifier; renaming would invalidate downstream integrations).

**Response:** `200` `{ success: true, data: DepartmentDetail }`

**Errors:**

| Status | Code               | When                                                               |
|--------|--------------------|--------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body / referenced head or college does not exist.              |
| 400    | `VALIDATION_ERROR` | Target department is archived (restore it first).                  |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                                    |
| 403    | `FORBIDDEN`        | Caller lacks `department.update`.                                  |
| 404    | `NOT_FOUND`        | No live department with this id.                                   |

Audit: `department.updated` (entity=`department`, oldValue/newValue= name/description/headId/collegeId).

---

### `DELETE /admin/departments/:id`

**Permission:** `department.archive`

Soft-deletes the department by stamping `deletedAt = now()`. Hard delete is
forbidden in 1.0 (AI_CONTEXT Â§6 â€” soft delete only).

**Response:** `200` `{ success: true, data: DepartmentDetail }` (with `deletedAt` set)

**Errors:**

| Status | Code               | When                                            |
|--------|--------------------|-------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `:id` not a uuid.                                |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                  |
| 403    | `FORBIDDEN`        | Caller lacks `department.archive`.               |
| 404    | `NOT_FOUND`        | No live department with this id.                |

Audit: `department.archived` (entity=`department`, oldValue/newValue= name/code/deletedAt).

---

### `POST /admin/departments/:id/restore`

**Permission:** `department.archive` (same code as archive â€” restore is the
inverse of the same operational concern).

**Response:** `200` `{ success: true, data: DepartmentDetail }` (with `deletedAt = null`)

**Errors:**

| Status | Code               | When                                                  |
|--------|--------------------|-------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `:id` not a uuid / department is not archived.        |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                        |
| 403    | `FORBIDDEN`        | Caller lacks `department.archive`.                     |
| 404    | `NOT_FOUND`        | No department (live or archived) with this id.         |

Audit: `department.restored` (entity=`department`, oldValue/newValue= name/code/deletedAt).

---

### `GET /admin/colleges`

**Permission:** `college.read`

**Query parameters:**

| Param             | Type            | Required | Default | Notes                                                          |
|-------------------|-----------------|----------|---------|----------------------------------------------------------------|
| `page`            | number â‰¥ 1      | no       | `1`     | 1-indexed.                                                     |
| `pageSize`        | number 1â€“200    | no       | `25`    |                                                                |
| `q`               | string (1â€“255)  | no       | â€”       | ILIKE contains on `name`, `code`, `description`.               |
| `includeArchived`| boolean         | no       | `false` | When `true`, return both live and soft-deleted rows.          |

**Response:** `200` `{ success: true, data: CollegeListItem[], meta: { page, pageSize, total, totalPages } }`

**Errors:** same shape as `GET /admin/departments` with the `college.read` code.

---

### `POST /admin/colleges`

**Permission:** `college.create`

**Request body:**

```ts
{
  name: string;                    // 1â€“255 chars
  code: string;                    // 1â€“64 chars
  description?: string | null;     // max 1000 chars
}
```

**Response:** `201` `{ success: true, data: CollegeDetail }`

Audit: `college.created` (entity=`college`, newValue=name/code).

**Errors:** same shape as `POST /admin/departments` with the `college.create` code, 409 on duplicate `code`.

---

### `GET /admin/colleges/:id`

**Permission:** `college.read`

**Response:** `200` `{ success: true, data: CollegeDetail }`

**Errors:** 404 when no live college matches `:id`; 403 / 401 / 400 as above.

---

### `PATCH /admin/colleges/:id`

**Permission:** `college.update`

**Request body:** (any subset of)

```ts
{
  name?: string;                    // 1â€“255 chars
  description?: string | null;      // max 1000 chars
}
```

`code` is intentionally not editable (same rationale as for departments).

**Response:** `200` `{ success: true, data: CollegeDetail }`

Audit: `college.updated` (entity=`college`, oldValue/newValue= name/description).

**Errors:** 400 when archive-is-targeted; 404 when not found; 401 / 403 as above.

---

### `DELETE /admin/colleges/:id`

**Permission:** `college.archive`

Soft-deletes the college. Child departments keep their `collegeId` column but
their `college` relation field becomes `null` (FK is `onDelete: SetNull`), so
no `Department` rows are orphaned or hard-deleted by archiving a college.

**Response:** `200` `{ success: true, data: CollegeDetail }` (with `deletedAt` set)

Audit: `college.archived` (entity=`college`, oldValue/newValue= name/code/deletedAt).

**Errors:** 404 / 401 / 403 / 400 as above.

---

### `POST /admin/colleges/:id/restore`

**Permission:** `college.archive`

**Response:** `200` `{ success: true, data: CollegeDetail }` (with `deletedAt = null`)

Audit: `college.restored` (entity=`college`, oldValue/newValue= name/code/deletedAt).

**Errors:** 400 when not archived; 404 when not found; 401 / 403 as above.

---

### `GET /admin/settings`

**Permission:** `admin.settings.read`

Returns the singleton settings row. Idempotent upsert-on-read: if the row does
not yet exist (fresh DB), it is created with the schema defaults â€” this
endpoint never 404s.

**Response:** `200` `{ success: true, data: SystemSettingsView }`

**Errors:**

| Status | Code               | When                                            |
|--------|--------------------|-------------------------------------------------|
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                  |
| 403    | `FORBIDDEN`        | Caller lacks `admin.settings.read`.              |

---

### `PATCH /admin/settings`

**Permission:** `admin.settings.update`

Patches the supplied fields. `maxUploadSizeBytes` is sent **as a string**
(the wire format for BigInt, AI_CONTEXT Â§6) and parsed with `BigInt(str)` on
the server. Stamps `updatedById` with the acting user.

**Request body:** (any subset of)

```ts
{
  applicationName?: string;          // 1â€“255 chars
  maxUploadSizeBytes?: string;       // /^\d+$/ â€” non-negative integer string
  allowedFileTypes?: string[];        // up to 100 lowercase extensions ("pdf", â€¦)
  sessionTimeoutMinutes?: number;    // 1â€“10080 (1 minute â€” 1 week)
  defaultPaginationSize?: number;   // 1â€“200
  maintenanceMode?: boolean;
  storageThresholdWarning?: number; // 1â€“100 (percent)
}
```

**Response:** `200` `{ success: true, data: SystemSettingsView }`

Audit: `settings.updated` (entity=`system_settings`, entityId=`"singleton"`,
oldValue/newValue= applicationName/maxUploadSizeBytes/sessionTimeoutMinutes/maintenanceMode).

**Errors:**

| Status | Code               | When                                                                 |
|--------|--------------------|----------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body (Zod incl. unknown keys â€” `.strict()` rejects extras).       |
| 401    | `UNAUTHORIZED`     | Missing / invalid access token.                                      |
| 403    | `FORBIDDEN`        | Caller lacks `admin.settings.update`.                                |

**Example:**

```
PATCH /api/v1/admin/settings
Content-Type: application/json

{
  "maintenanceMode": true,
  "maxUploadSizeBytes": "209715200",
  "allowedFileTypes": ["pdf", "docx", "xlsx", "pptx"]
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "applicationName": "URS Document Management System",
    "maxUploadSizeBytes": "209715200",
    "allowedFileTypes": ["pdf", "docx", "xlsx", "pptx"],
    "sessionTimeoutMinutes": 60,
    "defaultPaginationSize": 25,
    "maintenanceMode": true,
    "storageThresholdWarning": 80,
    "updatedById": "b1…",
    "updatedAt": "2026-08-16T12:00:00.000Z"
  }
}
```


## Admin  (Sprint 7.2 — User & Role Administration)

User + role + permission admin surface, all mounted under `/api/v1/admin`. The
dispatcher `admin.routes.ts` mounts `authenticate` once for the whole tree, so
each sub-router assumes `req.auth` is populated. Granular permission gating lives
on each route via `requirePermission(...)`. The service layer re-asserts the
same permission so a wiring mistake at the route layer can never bypass RBAC
(AI_CONTEXT §5 — defence in depth). No `if (role === "admin")` anywhere.

Mutation endpoints each emit a dedicated `AUDIT_ACTIONS` constant via
`writeAudit` in `modules/audit/audit.service.ts`. Read paths do not audit —
consistent with the project-wide read-only convention (AI_CONTEXT §8).
Idempotent no-op mutations (e.g. setting a status to its current value, or
forcing a password change with `mustChange` already true) intentionally skip
the audit write — a silently-repeated state is not a transition.

Schema deltas were added in two migrations:
`20260817000000_sprint7_2_admin_user_role_management` (adds
`Role.deletedAt` soft-delete column + index; adds `User.mustChangePassword`
boolean default false) and `20260818000000_sprint7_2_notifications` (an
additive `Notification` model from the parallel Notifications Backend task;
not consumed by the User & Role Administration surface). Both migrations are
idempotent on a fresh DB. The new permission codes (`user.*`, `role.*`,
`permission.read`) are appended to `PERMISSIONS` in
`permissions.constants.ts`; `ADMINISTRATOR` auto-inherits via
`PERMISSIONS.map((p) => p.code)`, and no other role is granted them by
default.

### Privilege-escalation guard (cross-cutting)

A user cannot assign a permission they themselves do not possess, and cannot
assign a role whose permission set includes a code they do not possess. The
guard lives in `modules/admin/_shared/admin.guard.ts` and is invoked by:

  * `admin/users` service when a create/update assigns a `roleId` — the role's
    currently-bound permission codes are resolved and the actor must hold
    every one of them.
  * `admin/roles` service when replacing a role's permission bindings —
    every code in the new `permissions` array must be present in the actor's
    `req.auth.permissions`.

Unknown permission codes (not in the catalog at all) are rejected up front so a
caller typo can never silently produce a no-op binding.

### Shared user item shape

```ts
interface AdminUserListItem {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "SUSPENDED";
  roleId: string;
  roleName: RoleName;                  // resolved via nested include on Role
  departmentId: string | null;
  departmentName: string | null;       // batched lookup (no User.department relation)
  collegeId: string | null;            // derived via department -> college
  collegeName: string | null;          // batched lookup
  mustChangePassword: boolean;
  lastLogin: string | null;            // ISO 8601
  createdAt: string;                   // ISO 8601
  updatedAt: string;
  deletedAt: string | null;            // non-null when archived
}

type AdminUserDetail = AdminUserListItem;
```

`AdminUserListItem` is shared by the list and detail endpoints. The Prisma
`User` model exposes `departmentId` as a scalar with no relation field (only
the reverse `UserDepartment` one-to-many to `Department` is modelled — see
AI_CONTEXT known issue #11). Department + college names are therefore resolved
in a single batched query against `Department` (with its `college` FK) per
list/detail call, then spliced into the view rows. This mirrors the canonical
`reports.service.ts` pattern and keeps every read at one round-trip + one
bounded name lookup.

### Shared role item shapes

```ts
interface AdminRoleListItem {
  id: string;
  name: RoleName;                      // one of seven seeded enums (ROOT is protected)
  description: string | null;
  isSystem: boolean;                    // false for roles created via this surface
  userCount: number;                   // _count.users (live, deletedAt:null)
  permissionCount: number;             // _count.permissions
  createdAt: string;                   // ISO 8601
  updatedAt: string;
  deletedAt: string | null;            // non-null when archived
}

interface AdminRoleDetail extends AdminRoleListItem {
  permissions: {
    code: string;
    module: string;
    description: string;
  }[];                                  // sorted by catalog order (PERMISSIONS array)
}

interface AdminPermissionItem {
  code: string;
  module: string;
  description: string;                  // never null for catalog rows
}
```

**Schema constraint:** `Role.name` is a Prisma `RoleName` enum strictly
constrained to seven seeded values (`ROOT`, `ADMINISTRATOR`,
`QUALITY_ASSURANCE_OFFICER`, `DEPARTMENT_COORDINATOR`, `FACULTY`, `STAFF`,
`READ_ONLY`). ROOT is protected and cannot be created or managed through the
admin role surface. 1.0 has no `String`-named custom role surface.
`POST /admin/roles` accepts only one of the six non-ROOT enum values and rejects with `409 CONFLICT` if
a role row already exists for that name (live OR archived, since the `@unique`
constraint spans soft-deleted rows). Restoring an archived role uses the
dedicated restore endpoint. Widening `Role.name` to `String` for runtime
custom roles is a 2.0 backlog item (PROJECT_ROADMAP.md).

### Endpoint summary

| Method | Endpoint                                            | Permission               | Audit action emitted          |
|--------|-----------------------------------------------------|--------------------------|-------------------------------|
| GET    | `/admin/users`                                      | `user.read`              | —                             |
| POST   | `/admin/users`                                      | `user.create`            | `user.created`                |
| GET    | `/admin/users/:id`                                  | `user.read`              | —                             |
| PATCH  | `/admin/users/:id`                                  | `user.update`            | `user.updated`                |
| DELETE | `/admin/users/:id`                                  | `user.archive`           | `user.archived`               |
| POST   | `/admin/users/:id/restore`                          | `user.restore`           | `user.restored`               |
| PATCH  | `/admin/users/:id/status`                           | `user.status.update`     | `user.activated` / `user.deactivated` |
| POST   | `/admin/users/:id/reset-password`                   | `user.password.reset`    | `auth.password.reset`         |
| POST   | `/admin/users/:id/force-password-change`            | `user.password.reset`    | `user.force_password_change`  |
| GET    | `/admin/roles`                                      | `role.read`              | —                             |
| POST   | `/admin/roles`                                      | `role.create`            | `role.created`                |
| GET    | `/admin/roles/:id`                                  | `role.read`              | —                             |
| PATCH  | `/admin/roles/:id`                                  | `role.update`            | `role.updated`                |
| DELETE | `/admin/roles/:id`                                  | `role.archive`           | `role.archived`               |
| POST   | `/admin/roles/:id/restore`                          | `role.restore`           | `role.restored`               |
| PATCH  | `/admin/roles/:id/permissions`                      | `role.permission.manage` | `role.permissions_updated`    |
| GET    | `/admin/permissions`                                | `permission.read`        | —                             |

User<->role assignment is satisfied by `PATCH /admin/users/:id { roleId }` (see
that endpoint below), which re-uses the privilege-escalation guard so the
same audited action covers create and update.

---

### `GET /admin/users`

**Permission:** `user.read`

**Doc:** Paged list of users. Free-text search across email / employeeId /
firstName / lastName. Filters by role, department, college, status, and
created/updated date ranges. Supports viewing archived rows via
`includeArchived=true`.

**Query parameters:**

| Param            | Type                                  | Required | Default | Notes                                                                                       |
|------------------|---------------------------------------|----------|---------|---------------------------------------------------------------------------------------------|
| `page`           | number >= 1                           | no       | `1`     | 1-indexed.                                                                                  |
| `pageSize`       | number 1-200                          | no       | `25`    |                                                                                             |
| `q`              | string (1-200)                        | no       | —       | ILIKE contains on email / employeeId / firstName / lastName.                                |
| `includeArchived`| boolean                               | no       | `false` | When `true`, return both live and soft-deleted rows.                                        |
| `roleId`         | uuid                                  | no       | —       | Filter by role.                                                                             |
| `departmentId`   | uuid                                  | no       | —       | Filter by primary department (scalar `User.departmentId`).                                 |
| `collegeId`      | uuid                                  | no       | —       | Filter by college — resolved via department->college FK chain (no User.department relation).|
| `status`         | `"ACTIVE" \| "INACTIVE" \| "LOCKED" \| "SUSPENDED"` | no       | —       | Filter by exact status.                                                                     |
| `createdFrom`    | ISO 8601 datetime                     | no       | —       | Inclusive lower bound on `createdAt`.                                                       |
| `createdTo`      | ISO 8601 datetime                     | no       | —       | Inclusive upper bound on `createdAt`.                                                       |
| `updatedFrom`    | ISO 8601 datetime                     | no       | —       | Inclusive lower bound on `updatedAt`.                                                       |
| `updatedTo`      | ISO 8601 datetime                     | no       | —       | Inclusive upper bound on `updatedAt`.                                                       |
| `sort`           | `"name" \| "email" \| "employeeId" \| "createdAt" \| "updatedAt"` | no       | `"name"` | `name` is virtual — sorts by lastName then firstName.                                      |
| `order`          | `"asc" \| "desc"`                     | no       | `"asc"` |                                                                                             |

**Response:** `200` `{ success: true, data: AdminUserListItem[], meta: { page, pageSize, total, totalPages } }`

---

### `POST /admin/users`

**Permission:** `user.create`

**Doc:** Creates a new user. Hashes the password with argon2id via
`modules/auth/auth.password.ts` (NEVER stores plaintext). The
`mustChangePassword` flag is optional — defaults `false` (the admin is handing
the password to the user out-of-band; use the force-password-change endpoint
to require a next-login change).

**RBAC extras:** the actor must already hold every permission the assigned
`roleId` grants (privilege-escalation guard). Failing this 403s; an admin
cannot bootstrap a more privileged account than their own.

**Request body:**

```ts
{
  employeeId: string;        // 2-64 chars, /^[A-Za-z0-9_-]+$/, globally unique
  email: string;             // valid email, lowercased, globally unique
  password: string;          // at least PASSWORD_MIN_LENGTH (env), max 128
  firstName: string;         // 1-100
  middleName?: string;       // 1-100
  lastName: string;          // 1-100
  suffix?: string;           // 1-20
  roleId: string;            // uuid; must reference a live role (deletedAt:null)
  departmentId?: string | null; // uuid of a live department, or null to clear
  mustChangePassword?: boolean; // default false
}
```

**Response:** `201` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code               | When                                                      |
|--------|--------------------|-----------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body (Zod).                                           |
| 403    | `FORBIDDEN`        | Caller lacks `user.create`, or fails the privilege guard. |
| 404    | `NOT_FOUND`        | Referenced role / department does not exist.              |
| 409    | `EMAIL_TAKEN`      | Email already in use (live or archived).                   |
| 409    | `EMPLOYEE_ID_TAKEN`| Employee ID already in use.                                |

---

### `GET /admin/users/:id`

**Permission:** `user.read`

**Path:** `id` (uuid)

**Response:** `200` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code               | When                                  |
|--------|--------------------|---------------------------------------|
| 400    | `VALIDATION_ERROR` | `id` not a uuid.                      |
| 404    | `NOT_FOUND`        | No live user with that id.            |

---

### `PATCH /admin/users/:id`

**Permission:** `user.update`

**Doc:** Updates a user's profile fields. Cannot move an archived user —
restore it first. Body is `.strict()`: unknown keys 400. If `roleId` changes,
the privilege-escalation guard runs again against the new role's permissions.

**Request body (all fields optional):**

```ts
{
  email?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  suffix?: string | null;
  roleId?: string;
  departmentId?: string | null;
}
```

**Response:** `200` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code               | When                                                              |
|--------|--------------------|-------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body, or user is archived.                                    |
| 403    | `FORBIDDEN`        | Caller lacks `user.update` or fails the privilege guard.          |
| 404    | `NOT_FOUND`        | User / referenced role / referenced department does not exist.     |
| 409    | `EMAIL_TAKEN`      | Email already taken by another (live or archived) user.           |

---

### `DELETE /admin/users/:id`

**Permission:** `user.archive`

**Doc:** Soft-delete ("archive") a user. Sets `deletedAt = now()` and
`status = "INACTIVE"`, and revokes all live sessions so a stolen refresh
token cannot immediately resume.

**Refusals:**
  * Cannot archive self (would lock the only admin out).
  * Cannot archive the last live `ADMINISTRATOR` — refusing prevents a system
    with no admin (no other role holds `user.restore`).

**Response:** `200` `{ success: true, data: AdminUserDetail }` (with
`deletedAt: <ISO>` and `status: "INACTIVE"`)

**Errors:**

| Status | Code               | When                                                                  |
|--------|--------------------|-----------------------------------------------------------------------|
| 403    | `FORBIDDEN`        | Caller lacks `user.archive`, self-archive attempt, or last-admin guard. |
| 404    | `NOT_FOUND`        | No live user with that id.                                            |

---

### `POST /admin/users/:id/restore`

**Permission:** `user.restore`

**Doc:** Restores an archived user. Clears `deletedAt` and sets `status =
"ACTIVE"`. Sessions are not re-issued (a fresh login is required). The
endpoint is distinct from `DELETE` per the spec (separate audit action,
separate permission).

**Response:** `200` `{ success: true, data: AdminUserDetail }` (with
`deletedAt: null` and `status: "ACTIVE"`)

**Errors:**

| Status | Code               | When                                       |
|--------|--------------------|--------------------------------------------|
| 400    | `VALIDATION_ERROR` | User is not archived.                      |
| 403    | `FORBIDDEN`        | Caller lacks `user.restore`.               |
| 404    | `NOT_FOUND`        | No user (live or archived) with that id.  |

---

### `PATCH /admin/users/:id/status`

**Permission:** `user.status.update`

**Doc:** Moves a user between the administratively-managed status values.
Emits a precise `USER_ACTIVATED` or `USER_DEACTIVATED` audit action depending
on the new status. `LOCKED` is reserved for automatic lockout (failed-login
throttling) and rejected by the validator. Deactivating or suspending a user
revokes all live sessions.

**Request body:**

```ts
{ status: "ACTIVE" | "INACTIVE" | "SUSPENDED" }
```

**Response:** `200` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code               | When                                                |
|--------|--------------------|-----------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body / LOCKED status / user is archived.        |
| 403    | `FORBIDDEN`        | Caller lacks `user.status.update`.                  |
| 404    | `NOT_FOUND`        | No live user with that id.                          |

---

### `POST /admin/users/:id/reset-password`

**Permission:** `user.password.reset`

**Doc:** Admin-set a new password for a user. Hashes the new password with
argon2id, resets the failed-login counter, clears the lockout timestamp, and
revokes all live sessions. Accepts an optional `mustChangePassword` flag —
when omitted, defaults `false` (the admin is handing the password to the
user out-of-band; use the force-password-change endpoint separately to
require a next-login change).

**Request body:**

```ts
{
  newPassword: string;          // at least PASSWORD_MIN_LENGTH, max 128
  mustChangePassword?: boolean; // default false
}
```

**Response:** `200` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code                | When                                                              |
|--------|---------------------|-------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR`  | Bad body, or user is archived.                                   |
| 403    | `FORBIDDEN`         | Caller lacks `user.password.reset`.                               |
| 404    | `NOT_FOUND`         | No live user with that id.                                        |
| 422    | `PASSWORD_TOO_WEAK` | Password below minimum length (defence in depth; validator first).|

---

### `POST /admin/users/:id/force-password-change`

**Permission:** `user.password.reset`

**Doc:** Toggles the `mustChangePassword` flag without changing the password
hash. The next login flow is expected to surface this to the client (the auth
module intentionally left untouched — the flag is a pure additive read).
Reuses the `user.password.reset` gate since the two operations overlap almost
fully; a distinct code would let an operator grant one without the other,
which is not a useful split.

**Request body (no body required — defaults to setting the flag):**

```ts
{ mustChange?: boolean } // default true
```

**Response:** `200` `{ success: true, data: AdminUserDetail }`

**Errors:**

| Status | Code               | When                                       |
|--------|--------------------|--------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body, or user is archived.             |
| 403    | `FORBIDDEN`        | Caller lacks `user.password.reset`.        |
| 404    | `NOT_FOUND`        | No live user with that id.                 |

---

### `GET /admin/roles`

**Permission:** `role.read`

**Doc:** Paged list of roles. Free-text search applies to `description` only
(`name` is a Prisma enum and a contains() filter on an enum column is not
supported). Supports viewing archived roles via `includeArchived=true`.

**Query parameters:**

| Param              | Type            | Required | Default | Notes                                                  |
|--------------------|-----------------|----------|---------|--------------------------------------------------------|
| `page`             | number >= 1     | no       | `1`     | 1-indexed.                                             |
| `pageSize`         | number 1-200    | no       | `25`    |                                                        |
| `q`                | string (1-200)  | no       | —       | ILIKE contains on `description`.                       |
| `includeArchived`  | boolean         | no       | `false` | When `true`, return both live and soft-deleted rows.   |

**Response:** `200` `{ success: true, data: AdminRoleListItem[], meta: { page, pageSize, total, totalPages } }`

> Note: the list item shape is a subset of the detail shape (no `permissions`
> array) — see the shared shape declaration above.

---

### `POST /admin/roles`

**Permission:** `role.create`

**Doc:** Creates a new role row. The six `RoleName` enum values are the only
acceptable `name` values in 1.0 (the Prisma enum strictly constrains the
column). The endpoint refuses with `409 CONFLICT` if a role with the supplied
name already exists (the `@unique` constraint spans soft-deleted rows, so an
archived role blocks re-create — restore it instead). The created role has
`isSystem = false` to mark it as admin-created (not seeded).

**Request body:**

```ts
{
  name: "ADMINISTRATOR" | "QUALITY_ASSURANCE_OFFICER" | "DEPARTMENT_COORDINATOR" | "FACULTY" | "STAFF" | "READ_ONLY";
  description?: string; // 1-500
}
```

**Response:** `201` `{ success: true, data: AdminRoleDetail }` (with empty
`permissions: []` — use `PATCH /:id/permissions` to bind permissions)

**Errors:**

| Status | Code                | When                                                           |
|--------|---------------------|----------------------------------------------------------------|
| 400    | `VALIDATION_ERROR`  | Bad body.                                                      |
| 403    | `FORBIDDEN`         | Caller lacks `role.create`.                                   |
| 409    | `CONFLICT`          | Role with this name already exists (live OR archived).         |

---

### `GET /admin/roles/:id`

**Permission:** `role.read`

**Path:** `id` (uuid)

**Response:** `200` `{ success: true, data: AdminRoleDetail }` (with `permissions`
array sorted by `PERMISSIONS` catalog order)

**Errors:**

| Status | Code               | When                              |
|--------|--------------------|-----------------------------------|
| 400    | `VALIDATION_ERROR` | `id` not a uuid.                  |
| 404    | `NOT_FOUND`        | No live role with that id.        |

---

### `PATCH /admin/roles/:id`

**Permission:** `role.update`

**Doc:** Updates a role's `description`. Cannot move an archived role —
restore it first. Body is `.strict()`. (Permission binding changes use the
dedicated `/:id/permissions` endpoint, which has a higher-impact RBAC gate.)

**Request body (all fields optional):**

```ts
{ description?: string | null }
```

**Response:** `200` `{ success: true, data: AdminRoleDetail }`

**Errors:**

| Status | Code               | When                                          |
|--------|--------------------|-----------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body, or role is archived.                |
| 403    | `FORBIDDEN`        | Caller lacks `role.update`.                   |
| 404    | `NOT_FOUND`        | No live role with that id.                    |

---

### `DELETE /admin/roles/:id`

**Permission:** `role.archive`

**Doc:** Soft-delete ("archive") a role. The endpoint refuses two cases:
  * Refuses if the role still has live users — reassign or archive those
    users first (silently changing their role would change their privileges).
  * Refuses to archive the `ADMINISTRATOR` role entirely — even with zero
    live users at the moment, a fresh boot could fail to bootstrap an admin
    for a soft-deleted admin role. Eliminates a class of foot-guns.

**Response:** `200` `{ success: true, data: AdminRoleDetail }` (with
`deletedAt: <ISO>`)

**Errors:**

| Status | Code               | When                                                                  |
|--------|--------------------|-----------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Role still has live users.                                            |
| 403    | `FORBIDDEN`        | Caller lacks `role.archive`, or attempt to archive `ADMINISTRATOR`.   |
| 404    | `NOT_FOUND`        | No live role with that id.                                            |

---

### `POST /admin/roles/:id/restore`

**Permission:** `role.restore`

**Doc:** Restores an archived role. Clears `deletedAt`. Distinct permission
code from `role.archive` per the sprint spec.

**Response:** `200` `{ success: true, data: AdminRoleDetail }` (with
`deletedAt: null`)

**Errors:**

| Status | Code               | When                                       |
|--------|--------------------|--------------------------------------------|
| 400    | `VALIDATION_ERROR` | Role is not archived.                      |
| 403    | `FORBIDDEN`        | Caller lacks `role.restore`.               |
| 404    | `NOT_FOUND`        | No role (live or archived) with that id.   |

---

### `PATCH /admin/roles/:id/permissions`

**Permission:** `role.permission.manage`

**Doc:** Replaces the role's permission binding set atomically. Body is an
array of permission codes (the full target set). The service diffs against
the current bindings and applies `createMany` / `deleteMany` inside a single
Prisma transaction so the role never observes a half-applied binding set.

**RBAC — privilege-escalation guard:** every code in the new
`permissions` array must already be present in the actor's
`req.auth.permissions`. Unknown codes (not in the catalog at all) are
rejected up front so a caller typo cannot silently produce a no-op binding.
This prevents an admin from bootstrapping a broader permission set than they
already possess and then using the role as a proxy grant.

**Request body:**

```ts
{ permissions: string[] } // full target set, max 200 codes
```

**Response:** `200` `{ success: true, data: AdminRoleDetail }` (with the
updated `permissions` array sorted by catalog order)

**Errors:**

| Status | Code               | When                                                                   |
|--------|--------------------|------------------------------------------------------------------------|
| 400    | `VALIDATION_ERROR` | Bad body, role is archived, or unknown permission code(s) supplied.    |
| 403    | `FORBIDDEN`        | Caller lacks `role.permission.manage`, or fails the privilege guard.   |
| 404    | `NOT_FOUND`        | No live role with that id.                                             |

---

### `GET /admin/permissions`

**Permission:** `permission.read`

**Doc:** Reads the permission catalog. The catalog IS the single source of
truth at `permissions.constants.ts` (`PERMISSIONS` array); the seed script
upserts the same rows into the DB so the wire view and the persisted
authorization matrix stay in sync. The endpoint returns the catalog in its
declared order so callers see modules grouped as written.

**Response:** `200`

```ts
{
  success: true,
  data: {
    code: string;
    module: string;
    description: string;
  }[]
}
```

**Errors:**

| Status | Code            | When                                     |
|--------|-----------------|------------------------------------------|
| 403    | `FORBIDDEN`     | Caller lacks `permission.read`.          |


## Notifications  (Sprint 7.3 — Notification & Email Service)

Centralized, module-agnostic notification + email backend. Two surfaces:

  * **User inbox** (`/notifications`) — every authenticated user's own rows,
    gated by `notification.read` (bound to ALL six roles in
    `DEFAULT_ROLE_MATRIX`). Ownership is enforced at the repository layer:
    every query is scoped by `userId` from `req.auth`, so one user can never
    see or mutate another user's rows.
  * **Admin announcements** (`/notifications/announcements`) — system-wide
    fan-out to every ACTIVE user, gated by `notification.manage`
    (ADMINISTRATOR-only via the catalog auto-inherit; no other role holds it
    by default).

Schema (migration `20260819000000_sprint7_3_notifications_email`):

  * `NotificationType` enum replaced with the definitive 11-event catalog:
    `DOCUMENT_UPLOADED`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`,
    `REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`,
    `AACCUP_SUBMISSION_APPROVED`, `AACCUP_SUBMISSION_REJECTED`,
    `PASSWORD_RESET`, `ROLE_CHANGED`, `SYSTEM_ANNOUNCEMENT`.
  * `Notification` extended: `priority` (`LOW` / `MEDIUM` / `HIGH`),
    `actionUrl`, `metadata` (JSONB), `updatedAt`, `deletedAt`
    (recipient-owned soft delete — soft-deleted rows are invisible to every
    inbox query).
  * New `EmailMessage` durable outbound-queue table + `EmailStatus`
    (`PENDING` / `SENDING` / `SENT` / `FAILED`).

The event catalog lives in `modules/notifications/notifications.events.ts` —
each event carries default title / message / priority, and (for document /
request / password events) a default email subject/body. Other modules emit
through `notifyUser` / `notifyUsers` (programmatic surface — no direct
Notification-table access). Per the sprint spec, existing modules
(Auth/RBAC/Documents/Requests/AACCUP) are NOT modified, so no emitters are
wired yet — the emit surface + catalog are the integration contract.

Email delivery: `EMAIL_PROVIDER` env (`console` default — renders through the
winston logger, no transport; `smtp` — nodemailer with `SMTP_*` vars, lazily
created so a bad config never breaks boot). At-least-once: every send is
persisted as PENDING first, claimed by the in-process worker, delivered, then
settled SENT / FAILED. Transient failures return to PENDING with exponential
backoff (30s doubling up to a 30min cap) until `maxAttempts` (3) is
exhausted; terminal failures surface via the `email.failed` audit action.

Audit actions added in `config/constants.ts`: `notification.created`
(announcements only — programmatic notifications are system-generated, not
actor actions), `notification.marked_read`, `notification.deleted`,
`email.sent`, `email.failed` (terminal failures only). Read paths do not
audit (project-wide convention).

### Shared notification item shape

```ts
interface NotificationListItem {
  id: string;
  type: "DOCUMENT_UPLOADED" | "DOCUMENT_APPROVED" | "DOCUMENT_REJECTED"
      | "REQUEST_SUBMITTED" | "REQUEST_APPROVED" | "REQUEST_REJECTED"
      | "AACCUP_SUBMISSION_APPROVED" | "AACCUP_SUBMISSION_REJECTED"
      | "PASSWORD_RESET" | "ROLE_CHANGED" | "SYSTEM_ANNOUNCEMENT";
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  entity: string | null;      // pointer to the source module (e.g. "document")
  entityId: string | null;    // pointer to the source row (deep-link target)
  actionUrl: string | null;   // client deep-link (optional)
  metadata: unknown;          // JSONB, free-form per event
  isRead: boolean;            // derived: readAt !== null
  readAt: string | null;      // ISO-8601
  createdAt: string;          // ISO-8601
}
```

### GET /notifications — own inbox (paginated)

**Permission:** `notification.read`

**Query params:**

| Param       | Type                              | Default | Notes                          |
|-------------|-----------------------------------|---------|--------------------------------|
| `page`      | int >= 1                          | 1       |                                |
| `pageSize`  | int 1..100                        | 25      |                                |
| `unreadOnly`| boolean                           | false   | only rows with `readAt = null` |
| `type`      | one of the 11 catalog values      | -       | event-kind filter              |
| `sort`      | `newest` / `oldest`               | newest  | by `createdAt`                 |

**200 OK:**

```jsonc
{
  "success": true,
  "data": [ /* NotificationListItem[] — newest first by default */ ],
  "meta": { "page": 1, "pageSize": 25, "total": 12, "totalPages": 1 }
}
```

**Errors:**

| Status | Code            | When                                      |
|--------|-----------------|-------------------------------------------|
| 401    | `UNAUTHORIZED`  | Missing / invalid access token.           |
| 403    | `FORBIDDEN`     | Caller lacks `notification.read`.         |

### GET /notifications/unread-count — bell badge

**Permission:** `notification.read`

**200 OK:** `{ "success": true, "data": { "unread": 3 } }`

Counts rows where `readAt = null` AND `deletedAt = null` for the caller —
the hot index `(userId, readAt)` covers it. Errors as above.

### PATCH /notifications/:id/read — mark one read

**Permission:** `notification.read`

**Params:** `id` (uuid)

**200 OK:** the updated `NotificationListItem` (`isRead: true`,
`readAt` set). Idempotent: re-marking an already-read row returns the row
unchanged (no audit re-write, no `CONFLICT`).

**Errors:**

| Status | Code            | When                                                |
|--------|-----------------|-----------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `id` is not a uuid.                               |
| 401    | `UNAUTHORIZED`  | Missing / invalid access token.                     |
| 403    | `FORBIDDEN`     | Caller lacks `notification.read`.                   |
| 404    | `NOT_FOUND`     | No visible row with this id owned by the caller (incl. rows owned by others — ownership is never leaked). |

### PATCH /notifications/read-all — mark entire inbox read

**Permission:** `notification.read`

**200 OK:** `{ "success": true, "data": { "updated": 12 } }`

One batched `updateMany` (no per-row round trips). `updated` is 0 when the
inbox is already fully read — idempotent. One `notification.marked_read`
audit row per call (count in `newValue`), only when `updated > 0`.

**Errors:** 401 / 403 as above.

### DELETE /notifications/:id — delete one (soft)

**Permission:** `notification.read`

**Params:** `id` (uuid)

**204 No Content.** Sets `deletedAt`; the row disappears from every inbox
query. Idempotent: deleting an already-deleted / nonexistent id yields the
same 404 as marking-read an unknown id (no row-state disclosure).

**Errors:**

| Status | Code            | When                                                |
|--------|-----------------|-----------------------------------------------------|
| 400    | `VALIDATION_ERROR` | `id` is not a uuid.                               |
| 401    | `UNAUTHORIZED`  | Missing / invalid access token.                     |
| 403    | `FORBIDDEN`     | Caller lacks `notification.read`.                   |
| 404    | `NOT_FOUND`     | No visible row with this id owned by the caller.    |

### POST /notifications/announcements — system-wide announcement

**Permission:** `notification.manage` (ADMINISTRATOR-only)

**Request body** (strict — unknown fields are rejected with 400):

```ts
{
  title: string;                          // 1..200
  message: string;                        // 1..5000
  priority?: "LOW" | "MEDIUM" | "HIGH";   // default HIGH
  actionUrl?: string | null;              // max 2048
  metadata?: Record<string, unknown>;     // free-form JSONB
}
```

**201 Created:** `{ "success": true, "data": { "created": 42 } }`

Fans out one `SYSTEM_ANNOUNCEMENT` row (with the given priority) to every
`ACTIVE`, non-deleted user in one `createMany`. `created` is 0 when there
are no ACTIVE users (no error). Emits `notification.created` with the
recipient count in `newValue`.

**Errors:**

| Status | Code            | When                                      |
|--------|-----------------|-------------------------------------------|
| 400    | `VALIDATION_ERROR` | Body fails validation (incl. unknown fields). |
| 401    | `UNAUTHORIZED`  | Missing / invalid access token.           |
| 403    | `FORBIDDEN`     | Caller lacks `notification.manage`.       |

---

## Email queue (internal — no HTTP surface)

`modules/email/*` — durable outbound queue consumed by the in-process worker
(`startEmailWorker` in `server.ts`, 15s poll, 10-row batch; timer is
`unref`-ed and skipped under `NODE_ENV=test`). `sendEmail(input)` persists a
PENDING row and kicks an immediate processing pass so interactive flows are
not blocked by the poll interval.

Provider contract (`EmailProvider.send`): `console` (default, logs through
winston) and `smtp` (nodemailer, `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` /
`SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`). The smtp provider is lazily
constructed — boot never fails on a bad SMTP config; a boot-time
`superRefine` rejects `EMAIL_PROVIDER=smtp` without `SMTP_HOST` / `SMTP_FROM`.

State machine: `PENDING` → `SENDING` → `SENT | FAILED`. Transient failure
returns to `PENDING` with `attempts + 1` and `nextAttemptAt = now + min(30s
2^(attempts-1), 30min)`; exhausting `maxAttempts` (3) lands in terminal
`FAILED` and emits `email.failed` (entity `email_message`) with the last
error. Success emits `email.sent`. The queue table is designed so a future
background worker process can take over the claim loop without a contract
change.

Programmatic emit surface (module-agnostic, `modules/notifications/
notifications.service.ts`):

```ts
notifyUser(userId, type, { title?, message?, priority?, entity?, entityId?,
                           actionUrl?, metadata?, email?: {subject, body} })
notifyUsers(userIds, type, input)   // same shape; batch fan-out
```

`type` must be one of the catalog values; omitted title/message/priority fall
back to the catalog defaults; when `email` is omitted but the catalog defines
defaults for the event, the email is sent to ACTIVE users automatically.
Programmatic rows are not audited (system-generated, not actor actions).


---

# Sprint 7.4.1 - System Administrator (ROOT) + Configuration Engine

> Backend: `server/src/modules/root/` (routes / controller / service /
> repository / cache / validator / types / overview / session watcher).
> Root-only surface: every route requires the `ROOT` role (hard `requireRole`
> gate on the router) AND the matching `root.*` permission (per-route
> `requirePermission`). Root sessions are observed via a 30s Session-table
> watcher that emits `root.login` / `root.logout` audit entries; the auth
> module internals are untouched.

## Role / permission catalog (additions)

| Code | Purpose | Bound to |
|------|---------|----------|
| `root.access` | Enter the Root Console / read Platform Overview | ROOT only |
| `root.configuration.read` | List / read configurations, categories, versions, history | ROOT only |
| `root.configuration.update` | PATCH / DELETE / restore configurations | ROOT only |
| `root.configuration.rollback` | POST /config/rollback | ROOT only |

The `ROOT` role is first in `DEFAULT_ROLE_MATRIX` and binds ALL catalog
permissions (75). `ROOT_ONLY_CODES` are excluded from the ADMINISTRATOR
seed set, so no admin role can ever obtain them (privilege-escalation guard
unchanged). Bootstrap: `BOOTSTRAP_ROOT_EMAIL` / `BOOTSTRAP_ROOT_EMPLOYEE_ID`
/ `BOOTSTRAP_ROOT_PASSWORD` (+ optional first/last name) in the seed.

## Endpoints

Base path `/api/v1`. All routes require `Authorization: Bearer <JWT>` of a
ROOT user.

### GET /root/overview

Platform Overview aggregate. Permission: `root.access`. Unaudited (read).

```json
{
  "platform":   { "status": "ok", "uptimeSeconds": 1872, "environment": "development",
                  "version": "1.0.0", "timestamp": "2026-08-04T05:05:26.541Z" },
  "configuration": { "totalConfigs": 10, "totalVersions": 13, "currentVersion": 3,
                     "lastUpdated": "2026-08-04T05:07:01.000Z",
                     "cache": { "size": 0, "ttlMs": 60000 } },
  "activeModules": [ { "module": "root", "permissionCount": 4 } ],
  "storage":   { "totalDocuments": 0, "totalBytes": "0", "archivedDocuments": 0 },
  "database":  { "status": "up", "latencyMs": 2 },
  "minio":     { "status": "up", "bucket": "urs-dms", "exists": true },
  "api":       { "status": "up", "version": "1.0.0", "routesMounted": "/api/v1 (root, ...)" },
  "queue":     { "emailPending": 0, "emailFailed": 0, "emailTotal": 0 },
  "recentChanges": [ { "configurationKey": "pagination.default_size", "action": "ROLLED_BACK",
                       "newValue": 25, "versionFrom": 2, "versionTo": 3,
                       "actorName": "System Root", "createdAt": "..." } ]
}
```

### GET /root/config

List configurations (paginated). Permission: `root.configuration.read`.
Query: `page` (default 1), `pageSize` (default 25, max 100), `category`,
`status` (ACTIVE|INACTIVE), `q` (key/name/description search).

```json
{ "items": [
    { "id": "0253851f-...", "category": { "code": "pagination", "name": "Pagination" },
      "key": "pagination.default_size", "name": "Default Pagination Size",
      "description": "Default rows per page for list endpoints",
      "value": 25, "valueType": "NUMBER", "status": "ACTIVE", "version": 3,
      "isSystem": true, "createdBy": null, "createdByName": null,
      "updatedBy": "701900f0-...", "updatedByName": "System Root",
      "createdAt": "...", "updatedAt": "..." }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 10, "totalPages": 1 } }
```

`valueType` is one of `STRING | NUMBER | BOOLEAN | JSON | LIST` (inferred
from the value). Reads are served from a 60s TTL in-process cache; every
mutation invalidates the cache.

### GET /root/config/categories

All live categories (ordered by `displayOrder`). Permission:
`root.configuration.read`. Returns `[{ id, code, name, description,
displayOrder, isSystem, createdAt, updatedAt }]`.

### GET /root/config/:category

All live configurations in one category code (e.g. `/root/config/system`).
Permission: `root.configuration.read`. Returns an array of configuration
views (same shape as above).

### PATCH /root/config

Bulk update. Permission: `root.configuration.update`. Body:

```json
{ "items": [ { "key": "pagination.default_size", "value": 30, "changeNote": "Q3 archive size" } ] }
```

Each entry: `value` may be a string / number / boolean / array / object; the
stored `valueType` is re-inferred from the new value. Unknown keys, deleted
configurations and validation failures abort the whole request. Success
returns the updated configuration views. Every item bumps `version` by 1,
writes a `configuration_versions` snapshot and a `configuration_histories`
row (action `UPDATED`) inside one transaction per item, then emits
`config.updated` (entity `configuration`).

### DELETE /root/config/:key

Soft delete. Permission: `root.configuration.update`. Seed-owned
(`isSystem: true`) configurations are rejected with `FORBIDDEN`. Success
writes a `DELETED` history row + `config.deleted` audit and returns the
updated view. The version is NOT bumped.

### POST /root/config/:key/restore

Restore a soft-deleted configuration. Permission:
`root.configuration.update`. Writes a `RESTORED` history row +
`config.restored` audit. The version is NOT bumped (the value is untouched).

### GET /root/config/:key/versions

Full version history of one configuration (newest first). Permission:
`root.configuration.read`. Returns `[{ id, configurationKey,
configurationName, version, value, changeNote, changedBy, changedByName,
createdAt }]`.

### POST /root/config/rollback

Roll a configuration back to a previous version. Permission:
`root.configuration.rollback`. Body:

```json
{ "key": "pagination.default_size", "toVersion": 1, "changeNote": "Rollback after bad tweak" }
```

`toVersion` must be strictly lower than the current version. The restored
snapshot value is written as a NEW version (current + 1) with a `ROLLED_BACK`
history row + `config.rolled_back` audit. Returns the updated configuration
view.

### GET /root/config/history

Configuration audit trail (newest first). Permission:
`root.configuration.read`. Query: `page`, `pageSize`, `key`, `action`
(CREATED|UPDATED|DELETED|RESTORED|ROLLED_BACK), `actorId`, `from` / `to`
(ISO date-times, inclusive).

```json
{ "items": [
    { "id": "42bbdc2f-...", "configurationId": "0253851f-...",
      "configurationKey": "pagination.default_size",
      "configurationName": "Default Pagination Size",
      "categoryCode": "pagination", "action": "ROLLED_BACK",
      "oldValue": 30, "newValue": 25, "versionFrom": 2, "versionTo": 3,
      "actorId": "701900f0-...", "actorName": "System Root",
      "createdAt": "..." }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 12, "totalPages": 1 } }
```

## RBAC hardening (admin surfaces)

- `admin/users` service (`assertNotRootTarget`): archiving, editing, status
  changes, password resets and forced password changes on a ROOT user return
  `FORBIDDEN` "Root accounts are protected; manage them from the Root Console".
- `admin/roles` service: the ROOT role cannot be archived (`FORBIDDEN`),
  edited (`FORBIDDEN` "The ROOT role cannot be modified...") or have its
  permission bindings replaced (`FORBIDDEN` "The ROOT role's permissions are
  fixed and cannot be modified").

## Audit actions (constants.ts)

`config.created`, `config.updated`, `config.deleted`, `config.restored`,
`config.rolled_back` (entity `configuration`), `root.login`,
`root.logout` (entity `session`; emitted by the session watcher).

## Schema (migration `20260820000000_sprint7_4_1_root_config`)

- `RoleName` enum: + `ROOT`.
- New enums: `ConfigurationStatus` (ACTIVE|INACTIVE),
  `ConfigurationValueType` (STRING|NUMBER|BOOLEAN|JSON|LIST),
  `ConfigurationAction` (CREATED|UPDATED|DELETED|RESTORED|ROLLED_BACK).
- `configuration_categories`: code (unique), name, description, displayOrder,
  isSystem, soft delete, timestamps.
- `configurations`: categoryId FK, key + `@@unique([categoryId, key])`,
  name, description, `value` Json, valueType, status, `version` (int, >= 1),
  isSystem, createdBy/updatedBy (user FKs), soft delete, timestamps.
- `configuration_versions`: configurationId FK, `version` +
  `@@unique([configurationId, version])`, value Json, changeNote, changedBy
  (user FK), createdAt.
- `configuration_histories`: configurationId FK, `action`, oldValue Json,
  newValue Json, versionFrom, versionTo, actorId (user FK), createdAt.

## Seed (idempotent)

7 categories (system, university, academic, security, upload, storage,
pagination) and 10 isSystem configurations with v1 snapshots + CREATED
history rows. Re-running the seed never overwrites an existing
configuration (create-if-missing only). ROOT bootstrap user is created once
from `BOOTSTRAP_ROOT_*` env vars.

## Client

Root Console UI (role `root` in the client model): sidebar section +
`services/root.ts` over `lib/http.ts`. `lib/http.ts` prefers the server JWT
stored under `urs_dms_server_token` (opened at login via a best-effort
`POST /auth/login` bridge for ROOT users). Pages: Platform Overview
(`/root`), Configuration Engine (`/root-config`), System Audit
(`/root-audit`), System Users (`/root-users`).


---

# Sprint 7.4.2 - Organization Management Engine (ROOT)

Scope: ROOT-only management of the four organizational master-data entities
(Colleges, Departments, Offices, Programs) with full versioning + rollback,
mirroring the Configuration Engine lifecycle. Colleges and Departments reuse
the existing Sprint 7.1 tables additively (the ADMIN college / department
surface keeps working unchanged); Offices and Programs are new tables.
Migration: `20260821000000_sprint7_4_2_organization_engine` (applied
manually via `prisma db execute` + `migrate resolve`).

## Permissions (new, ROOT-only)

| Code | Purpose |
|------|---------|
| organization.read | List / get records + org tree + version history |
| organization.create | Create records |
| organization.update | Update records |
| organization.archive | Archive (soft delete) / restore records |
| organization.rollback | Roll a record back to a past version |

All five codes live in `ROOT_ONLY_CODES` (excluded from the ADMINISTRATOR
seed set, so the admin role can never acquire them). The route group sits
under `/api/v1/root` and is gated by `requireRole("ROOT")` plus per-route
`requirePermission("organization.*")`. Mutations write audit entries
(COLLEGE_* / DEPARTMENT_* / OFFICE_* / PROGRAM_* + rollback actions).

## Shared record shape

```json
{
  "id": "string",
  "name": "string",
  "code": "string",
  "description": "string | null",
  "collegeId": "string | null",
  "collegeName": "string | null",
  "departmentId": "string | null",
  "departmentName": "string | null",
  "headId": "string | null",
  "headName": "string | null",
  "level": "UNDERGRADUATE | GRADUATE | DOCTORAL | CERTIFICATE | DIPLOMA | null",
  "version": "int",
  "createdAt": "ISO string",
  "updatedAt": "ISO string",
  "deletedAt": "ISO string | null"
}
```

`level` only applies to Programs (null elsewhere). `version` is 0 for rows
created before the engine (no snapshot history; rollback rejected). Archived
records are excluded by default; `includeArchived=true` returns them with
`deletedAt` set.

## Version shape

```json
{
  "id": "string",
  "entity": "COLLEGE | DEPARTMENT | OFFICE | PROGRAM",
  "entityId": "string",
  "version": "int",
  "changeType": "CREATED | UPDATED | ARCHIVED | RESTORED | ROLLED_BACK",
  "data": {
    "name": "string",
    "code": "string",
    "description": "string | null",
    "collegeId": "string | null",
    "departmentId": "string | null",
    "headId": "string | null",
    "level": "string | null"
  },
  "changedById": "string | null",
  "changedByName": "string | null",
  "createdAt": "ISO string"
}
```

## Organization tree

`GET /api/v1/root/organization/tree` (permission `organization.read`):

```json
{
  "colleges": [
    {
      "id": "string", "name": "string", "code": "string",
      "description": "string | null", "level": null,
      "departments": [ "same node shape, level null" ],
      "offices": [ "same node shape, level null" ],
      "programs": [ "same node shape, level set for programs" ]
    }
  ],
  "unassigned": {
    "id": "", "name": "Unassigned", "code": "",
    "description": null, "level": null,
    "departments": [], "offices": [], "programs": []
  }
}
```

## Endpoints (base `/api/v1/root`)

Entity collections: `colleges` | `departments` | `offices` | `programs`.
Canonical paths `/organization/<collection>`; legacy aliases `/<collection>`
(e.g. `/colleges`) map to the same handlers.

- `GET /organization/{colleges|departments|offices|programs}` -
  `organization.read`. Query: `page` (default 1), `pageSize` (default 25,
  max 200), `q` (name/code search), `includeArchived` (`true`/`false`),
  `collegeId` / `departmentId` (entity-dependent). Response:
  `{ data: [records], meta: { page, pageSize, total, totalPages } }`.
- `POST /organization/{colleges|departments|offices|programs}` -
  `organization.create`. Body: name (required, max 120), code (required,
  unique per entity, max 20, 409 on conflict), description (max 500),
  collegeId / departmentId / headId (valid UUIDs; parents must exist and be
  live, else 400), level (programs only). Creates version 1 + CREATED
  snapshot + audit entry.
- `GET /organization/{colleges|departments|offices|programs}/:id` -
  `organization.read`. Detail; 404 when archived unless `includeArchived`.
- `PATCH /organization/{colleges|departments|offices|programs}/:id` -
  `organization.update`. Same body rules as create; 400 on invalid parent,
  409 on code conflict. Appends an UPDATED snapshot.
- `DELETE /organization/{colleges|departments|offices|programs}/:id` -
  `organization.archive`. Soft delete (archive); appends an ARCHIVED snapshot.
- `POST /organization/{colleges|departments|offices|programs}/:id/restore` -
  `organization.archive`. Un-archive; appends a RESTORED snapshot.
- `GET /organization/{colleges|departments|offices|programs}/:id/versions` -
  `organization.read`. Snapshots descending by version.
- `POST /organization/{colleges|departments|offices|programs}/:id/rollback` -
  `organization.rollback`. Body `{ "version": int }`; target must be lower
  than the current version (else 400). Replays the snapshot fields as a NEW
  version with changeType ROLLED_BACK and clears `deletedAt` (un-archives).
  Writes `organization.<entity>.rolled_back` audit entry.

## Error semantics

- 400 - validation failure, unknown/invalid id, invalid parent (missing or
  archived), rollback to current or newer version.
- 404 - unknown id, or archived record without `includeArchived`.
- 403 - non-ROOT role or missing `organization.*` permission.
- 409 - duplicate entity code.

## Schema (migration `20260821000000_sprint7_4_2_organization_engine`)

- New tables: `offices` (collegeId FK, headId), `programs` (collegeId /
  departmentId FKs, `level` ProgramLevel enum), `organization_versions`
  (entity + entityId, version, `@@unique([entity, entityId, version])`,
  changeType, data Json, changedBy FK).
- New enums: `OrganizationEntity`, `OrganizationChangeType`, `ProgramLevel`.
- Additive relations on existing tables (`organizationVersions` on College /
  Department / User, SetNull FKs; indexes on deletedAt / collegeId /
  departmentId).
- Seed: no new seed rows (permission codes read from constants; re-run
  yields 80 permissions total, ROOT holds all five organization.* codes).

---

# Sprint 7.4.3 - Dynamic Folder Builder

Scope: ROOT-only management of reusable, recursive folder templates with full
version snapshots, scoped assignments, rollback, and read-time integration
with the Document Repository. Migration:
`20260821000000_sprint7_4_3_folder_builder`.

## Permissions

| Code | Purpose |
|------|---------|
| `folder.read` | List/detail/tree/assignment/version/history reads |
| `folder.create` | Create or duplicate templates/nodes |
| `folder.update` | Update templates/nodes and move nodes |
| `folder.archive` | Archive templates/nodes |
| `folder.restore` | Restore templates/nodes |
| `folder.assign` | Assign/unassign templates |
| `folder.rollback` | Replay an older snapshot |

All seven codes are ROOT-only. Every management endpoint requires an
authenticated `ROOT` role plus the route-specific singular `folder.*`
permission. The seed catalog contains 87 permission codes after Sprint 7.4.3.

`GET /api/v1/folders/resolve` is not ROOT-only. It uses the existing plural
`folders.read` permission because normal repository users consume it.

## Response Shapes

Paginated endpoints use the standard top-level envelope:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 25, "total": 0, "totalPages": 1 }
}
```

Template detail:

```ts
interface FolderTemplateDetail {
  template: FolderTemplate;
  tree: FolderTreeNode[];
  assignments: FolderAssignment[];
}

interface FolderTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  icon: string | null;
  color: string | null;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  nodeCount: number;
  assignmentCount: number;
}

interface FolderTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  metadata: unknown;
  sortOrder: number;
  icon: string | null;
  color: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  status: "ACTIVE" | "INACTIVE";
  level: number;
  deletedAt: string | null;
  children: FolderTreeNode[];
}

interface FolderAssignment {
  id: string;
  templateId: string;
  templateName: string;
  targetType:
    | "UNIVERSITY"
    | "COLLEGE"
    | "DEPARTMENT"
    | "PROGRAM"
    | "OFFICE"
    | "AACCUP_AREA";
  targetId: string | null;
  targetName: string | null;
  createdAt: string;
}
```

Archived templates/nodes are excluded by default. List calls with
`includeArchived=true` include both live and archived rows and expose
`deletedAt`. Template detail returns the live tree only.

## Management Endpoints

Base path: `/api/v1/root/folder-builder`.

| Method | Path | Permission | Success data |
|--------|------|------------|--------------|
| GET | `/templates` | `folder.read` | paginated `FolderTemplate[]` |
| POST | `/templates` | `folder.create` | `201 FolderTemplateDetail` |
| GET | `/templates/:id` | `folder.read` | `FolderTemplateDetail` |
| PATCH | `/templates/:id` | `folder.update` | `FolderTemplateDetail` |
| DELETE | `/templates/:id` | `folder.archive` | archived `FolderTemplateDetail` |
| POST | `/templates/:id/restore` | `folder.restore` | restored `FolderTemplateDetail` |
| POST | `/templates/:id/duplicate` | `folder.create` | `201 FolderTemplateDetail` |
| GET | `/templates/:id/nodes` | `folder.read` | `FolderTreeNode[]` |
| POST | `/templates/:id/nodes` | `folder.create` | `201 FolderTreeNode` |
| GET | `/templates/:id/nodes/:nodeId/children` | `folder.read` | direct `FolderTreeNode[]` |
| PATCH | `/templates/:id/nodes/:nodeId` | `folder.update` | `FolderTreeNode` |
| POST | `/templates/:id/nodes/:nodeId/move` | `folder.update` | `FolderTreeNode` |
| POST | `/templates/:id/nodes/:nodeId/duplicate` | `folder.create` | `201 FolderTreeNode` |
| DELETE | `/templates/:id/nodes/:nodeId` | `folder.archive` | archived `FolderTreeNode` |
| POST | `/templates/:id/nodes/:nodeId/restore` | `folder.restore` | restored `FolderTreeNode` |
| GET | `/templates/:id/versions` | `folder.read` | `FolderVersion[]` |
| GET | `/history` | `folder.read` | paginated `FolderHistory[]` |
| POST | `/rollback` | `folder.rollback` | `FolderTemplateDetail` |
| GET | `/assignments` | `folder.read` | `FolderAssignment[]` |
| POST | `/templates/:id/assignments` | `folder.assign` | `FolderTemplateDetail` |
| DELETE | `/assignments/:id` | `folder.assign` | `FolderTemplateDetail` |

### Template list

`GET /templates` query:

| Parameter | Default | Rules |
|-----------|---------|-------|
| `page` | `1` | integer >= 1 |
| `pageSize` | `25` | integer 1..200 |
| `q` | omitted | max 200; searches name/code/category/description |
| `status` | omitted | `ACTIVE` or `INACTIVE` |
| `includeArchived` | `false` | `true` or `false` |

### Template writes

Create body:

```ts
{
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  icon?: string | null;
  color?: string | null;
  nodes?: Array<{
    name: string;
    description?: string | null;
    category?: string | null;
    icon?: string | null;
    color?: string | null;
  }>;
}
```

PATCH accepts the same template fields except `nodes`, all optional. Create
starts at version 1 with a CREATED snapshot/history row. Duplicate deep-copies
the complete live tree, creates a unique `(Copy)` name/`-copy` code (within
the normal length limits), starts at v1, and copies no assignments. Template
archive/restore is soft and does not increment the version.

### Node reads and writes

`GET /templates/:id/nodes` query accepts `parentId` (UUID), `q` (max 200), and
`includeArchived`. Without `q`, the endpoint is a flat node list with empty
`children`; use template detail for the canonical recursive tree. The children
endpoint returns direct live children.

Create body requires `name` and optionally accepts:

```ts
{
  parentId?: string | null;
  description?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  sortOrder?: number;
  icon?: string | null;
  color?: string | null;
  visibility?: "VISIBLE" | "HIDDEN";
  status?: "ACTIVE" | "INACTIVE";
}
```

PATCH accepts all node fields except `parentId`, all optional. Move body is
`{ "parentId": "UUID | null", "sortOrder": "optional integer" }`; `null`
moves the node to the root. Parent and node must be live and in the same
template. Self-parenting, moving under a descendant, and duplicate live names
within one parent are rejected. Moving recomputes all descendant levels.

Node duplicate deep-copies the live subtree beside the source and generates a
unique `(Copy)` root name. Node archive only archives that node; descendants
remain stored but are unreachable until the parent is restored. Restore
requires the parent to be live and rechecks sibling-name uniqueness.

Validation limits: name 1..120, code 1..40 using
`[A-Za-z0-9][A-Za-z0-9._-]*`, description max 500, category/icon max 120,
color `#RRGGBB`, metadata max 64 top-level keys, sortOrder 0..1,000,000.
Bodies are strict and path IDs are UUIDs.

## Assignments

Assignment body:

```ts
{
  targetType:
    | "UNIVERSITY"
    | "COLLEGE"
    | "DEPARTMENT"
    | "PROGRAM"
    | "OFFICE"
    | "AACCUP_AREA";
  targetId?: string | null;
}
```

UNIVERSITY must omit `targetId`; all other target types require a live target
UUID. One live template assignment is allowed per target. Assigning a target
to another template updates the existing assignment in place instead of
stacking rows; archived assignments are revived in place. Assigning the same
live template again is idempotent and does not increment its version.

`GET /assignments` is unpaginated and supports `templateId` and `targetType`.
DELETE soft-unassigns and returns the owning template detail.

## Versions, History, and Rollback

```ts
interface FolderVersion {
  id: string;
  templateId: string;
  version: number;
  changeType:
    | "CREATED"
    | "UPDATED"
    | "ASSIGNED"
    | "ARCHIVED"
    | "RESTORED"
    | "ROLLED_BACK";
  data: FolderSnapshot;
  changeNote: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface FolderSnapshot {
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  status: "ACTIVE" | "INACTIVE";
  icon: string | null;
  color: string | null;
  nodes: FolderSnapshotNode[];
  assignments: Array<{ targetType: string; targetId: string | null }>;
}
```

Every versioned mutation stores the full post-mutation template/tree/scope
snapshot in the same transaction as the mutation and history row. Version
list is newest first and unpaginated. History query supports page/pageSize,
`templateId`, action, and ISO `from`/`to` timestamps.

Rollback body:

```json
{
  "templateId": "UUID",
  "version": 1,
  "changeNote": "optional reason"
}
```

The target must be lower than the current version. Rollback replays template
fields, recursive nodes, and assignments, then appends a new ROLLED_BACK
version/history entry. Recreated nodes receive new IDs; clients must clear
cached node selections after rollback.

## Repository Resolution

`GET /api/v1/folders/resolve` requires `folders.read`, has no query/body, and
does not write audit entries. Resolution precedence is:

1. authenticated user's DEPARTMENT assignment
2. authenticated user's COLLEGE assignment
3. UNIVERSITY assignment

Only live ACTIVE templates and live VISIBLE/ACTIVE nodes are resolved.
PROGRAM/OFFICE/AACCUP_AREA assignments are manageable by ROOT but are not yet
part of this user repository precedence chain.

```ts
interface ResolvedFolderStructure {
  source: "template" | "legacy" | "none";
  template: {
    id: string;
    name: string;
    code: string;
    icon: string | null;
    color: string | null;
  } | null;
  assignment: {
    id: string;
    targetType: string;
    targetId: string | null;
  } | null;
  tree: ResolvedFolderNode[];
  legacyFolders: FolderListItem[];
}
```

`source: "template"` returns the assigned recursive tree and an empty legacy
list. With no matching assignment, existing flat folders produce
`source: "legacy"`; no assignment and no legacy folders produces `"none"`.

## Errors and Audit

- 400: validation, invalid lifecycle state/parent/target, cycle, or rollback
  target not older than current.
- 401: missing/invalid/expired access token.
- 403: non-ROOT management caller or missing permission.
- 404: unknown/live-filtered template, node, assignment, or version.
- 409: duplicate template code/name, sibling name, or rollback code conflict.
- 429: global API rate limit.

Mutation audit actions use `folder_template.*` and `folder_node.*`:
`created`, `updated`, `assigned`, `archived`, `restored`, `rolled_back`,
`moved`, `deleted`, and `duplicated` as applicable. Read paths are unaudited.

## Client

Root Console route `/root-folder-builder` provides responsive template cards,
recursive tree editing, archived template/node restoration, explicit move and
deep-copy actions, scoped assignments, version comparison/rollback, and
paginated history. `client/src/lib/http.ts` now preserves top-level pagination
metadata through `apiGetPage`; existing Root paginated services use it too.

---

# Sprint 7.4.4 - Dynamic Requirement Builder

Scope: ROOT-only authoring of recursive, reusable accreditation requirement
templates; version snapshots and rollback; scoped assignment resolution; live
AACCUP projection; upload/submission validation; and Root Console + end-user
integration. Migration:
`20260822000000_sprint7_4_4_requirement_builder`.

## Permissions

| Code | Purpose |
|------|---------|
| `requirement.read` | Template, tree, rule, assignment, cycle, version, and history reads |
| `requirement.create` | Create templates, nodes, validation rules, and cycles |
| `requirement.update` | Update/move templates, nodes, validation rules, and cycles |
| `requirement.archive` | Archive templates, node subtrees, validation rules, and cycles |
| `requirement.restore` | Restore templates, node subtrees, validation rules, and cycles |
| `requirement.assign` | Assign and unassign templates |
| `requirement.rollback` | Replay an older requirement snapshot as a new version |

All seven codes are ROOT-only. Every management endpoint requires both an
authenticated `ROOT` role and its singular route permission. They are excluded
from the ADMINISTRATOR permission matrix and protected by the existing
privilege-escalation guard. The seed catalog contains 94 permissions after
Sprint 7.4.4.

Normal AACCUP consumers continue to use the existing `aaccup.*`,
`aaccup.requirement.*`, and `aaccup.submission.*` permissions. They do not need
any `requirement.*` management code.

## Core Response Shapes

```ts
interface RequirementTemplateDetail {
  template: RequirementTemplate;
  tree: RequirementTreeNode[];
  assignments: RequirementAssignment[];
}

interface RequirementTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  metadata: unknown;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  nodeCount: number;
  validationCount: number;
  assignmentCount: number;
}

interface RequirementTreeNode {
  id: string;
  templateId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  helpText: string | null;
  type: "SECTION" | "REQUIREMENT" | "SUB_REQUIREMENT" | "SUPPORTING_DOCUMENT";
  metadata: unknown;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
  level: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  validations: RequirementValidation[];
  children: RequirementTreeNode[];
}

interface RequirementValidation {
  id: string;
  nodeId: string;
  type:
    | "FILE_TYPE"
    | "FILE_SIZE"
    | "PAGE_COUNT"
    | "EXPIRATION_DATE"
    | "NAMING_CONVENTION"
    | "METADATA";
  config: unknown;
  message: string | null;
  severity: "ERROR" | "WARNING";
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface RequirementAssignment {
  id: string;
  templateId: string;
  templateName: string;
  targetType:
    | "UNIVERSITY"
    | "COLLEGE"
    | "DEPARTMENT"
    | "PROGRAM"
    | "OFFICE"
    | "AACCUP_AREA"
    | "ACCREDITATION_CYCLE";
  targetId: string | null;
  targetName: string | null;
  createdAt: string;
}

interface AccreditationCycle {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

Template detail returns the live recursive tree. Archived templates and nodes
remain addressable through explicit detail/`includeArchived=true` reads for
restore workflows.

## Management Endpoints

Base path: `/api/v1/root/requirements`.

| Method | Path | Permission | Success data |
|--------|------|------------|--------------|
| GET | `/` | `requirement.read` | paginated `RequirementTemplate[]` |
| POST | `/` | `requirement.create` | `201 RequirementTemplateDetail` |
| GET | `/:id` | `requirement.read` | `RequirementTemplateDetail` |
| PATCH | `/:id` | `requirement.update` | `RequirementTemplateDetail` |
| DELETE | `/:id` | `requirement.archive` | archived `RequirementTemplateDetail` |
| POST | `/:id/restore` | `requirement.restore` | restored `RequirementTemplateDetail` |
| GET | `/:id/nodes` | `requirement.read` | recursive `RequirementTreeNode[]` |
| POST | `/:id/nodes` | `requirement.create` | `201 RequirementTreeNode` |
| PATCH | `/:id/nodes/:nodeId` | `requirement.update` | `RequirementTreeNode` |
| POST | `/:id/nodes/:nodeId/move` | `requirement.update` | `RequirementTreeNode` |
| DELETE | `/:id/nodes/:nodeId` | `requirement.archive` | archived `RequirementTreeNode` |
| POST | `/:id/nodes/:nodeId/restore` | `requirement.restore` | restored `RequirementTreeNode` |
| POST | `/:id/nodes/:nodeId/validations` | `requirement.create` | `201 RequirementValidation` |
| PATCH | `/:id/nodes/:nodeId/validations/:validationId` | `requirement.update` | `RequirementValidation` |
| DELETE | `/:id/nodes/:nodeId/validations/:validationId` | `requirement.archive` | archived `RequirementValidation` |
| POST | `/:id/nodes/:nodeId/validations/:validationId/restore` | `requirement.restore` | restored `RequirementValidation` |
| GET | `/:id/versions` | `requirement.read` | newest-first `RequirementVersion[]` |
| POST | `/:id/assignments` | `requirement.assign` | `RequirementTemplateDetail` |
| GET | `/assignments` | `requirement.read` | `RequirementAssignment[]` |
| DELETE | `/assignments/:id` | `requirement.assign` | `RequirementTemplateDetail` |
| GET | `/history` | `requirement.read` | paginated `RequirementHistory[]` |
| POST | `/rollback` | `requirement.rollback` | `RequirementTemplateDetail` |
| GET | `/cycles` | `requirement.read` | paginated `AccreditationCycle[]` |
| POST | `/cycles` | `requirement.create` | `201 AccreditationCycle` |
| PATCH | `/cycles/:id` | `requirement.update` | `AccreditationCycle` |
| DELETE | `/cycles/:id` | `requirement.archive` | archived `AccreditationCycle` |
| POST | `/cycles/:id/restore` | `requirement.restore` | restored `AccreditationCycle` |

Fixed paths (`/history`, `/assignments`, `/rollback`, and `/cycles`) are
registered before `/:id` and cannot be shadowed by the template ID route.

## Template and Node Writes

Template create body:

```ts
{
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: "ACTIVE" | "INACTIVE";
}
```

PATCH accepts the same fields, all optional. Template codes are globally
unique; live names are case-insensitively unique. Create starts at version 1.
Template update, archive, and restore each append a new version and history
record.

Template list query supports `page` (default 1), `pageSize` (default 25, max
200), `q`, `status`, `category`, and `includeArchived`. Search covers name,
code, description, and category.

Node create body:

```ts
{
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  helpText?: string | null;
  type: "SECTION" | "REQUIREMENT" | "SUB_REQUIREMENT" | "SUPPORTING_DOCUMENT";
  metadata?: Record<string, unknown> | null;
  isRequired?: boolean;
  allowMultiple?: boolean;
  sortOrder?: number;
  status?: "ACTIVE" | "INACTIVE";
}
```

PATCH accepts the node fields except `parentId`, all optional. Move body is
`{ parentId?: UUID | null, sortOrder?: integer }`; parent changes and sibling
reordering are atomic. Self-parenting, cross-template parents, descendant
cycles, duplicate codes within a template, and duplicate live names within a
parent are rejected. Levels are recomputed for the complete moved subtree.

`GET /:id/nodes` supports `q`, `parentId`, `type`, and `includeArchived`.
Without a filter it returns the recursive tree. With `q`, `parentId`, or
`type`, matching nodes are returned with empty `children` arrays.

Archiving a node soft-archives its currently live subtree using one archive
timestamp. Restore revives only rows archived by that same subtree operation,
so children archived independently stay archived. A child cannot be restored
while its parent is archived. Every node mutation versions the owning template.

## Validation Rules

SECTION nodes cannot carry upload rules. One row per `(nodeId, type)` is
allowed; archived rows are revived with their stable IDs. Common fields:

```ts
{
  type: ValidationType;
  config: ValidationConfig;
  message?: string | null;
  severity?: "ERROR" | "WARNING"; // default ERROR
  enabled?: boolean;               // default true
  sortOrder?: number;              // default 0
}
```

Configuration shapes:

```ts
type ValidationConfig =
  | { allowedMimeTypes?: string[]; allowedExtensions?: string[] } // FILE_TYPE; at least one non-empty
  | { minBytes?: number; maxBytes?: number }                       // FILE_SIZE
  | { minPages?: number; maxPages?: number }                       // PAGE_COUNT
  | { required?: boolean; minDaysFromNow?: number; maxDaysFromNow?: number } // EXPIRATION_DATE
  | { pattern: string; caseInsensitive?: boolean; example?: string }          // NAMING_CONVENTION
  | { requiredKeys: string[] };                                    // METADATA
```

Invalid ranges and invalid regular expressions are rejected at write time.
ERROR issues make an upload invalid; WARNING issues are returned but do not
block it. Create/update/archive/restore all version the owning template.

## Assignments and Runtime Resolution

Assignment body:

```ts
{
  targetType:
    | "UNIVERSITY"
    | "COLLEGE"
    | "DEPARTMENT"
    | "PROGRAM"
    | "OFFICE"
    | "AACCUP_AREA"
    | "ACCREDITATION_CYCLE";
  targetId?: string | null;
}
```

UNIVERSITY requires `targetId: null`; all other targets require a live UUID.
AACCUP_AREA and ACCREDITATION_CYCLE targets must also be ACTIVE. Exactly one
live assignment can own a target. Reassignment revives the target's archived
assignment row, preserving its ID; assigning the same template twice is
idempotent. GET supports optional `templateId` and `targetType` filters. DELETE
soft-unassigns.

PROGRAM and OFFICE are valid explicit management targets but are not part of
the AACCUP area resolution chain. Effective AACCUP precedence is:

1. `AACCUP_AREA`
2. active, live `ACCREDITATION_CYCLE` linked to the area
3. `DEPARTMENT`
4. the department's `COLLEGE`
5. `UNIVERSITY`

Only live ACTIVE templates resolve. Results are cached in process for 60
seconds. Every relevant mutation invalidates the cache and eagerly refreshes
only areas affected by the template's assignment scopes or existing runtime
projections. UNIVERSITY necessarily targets every live area. Cycle mutation
refreshes only areas linked to that cycle. Read-time synchronization remains a
consistency backstop.

## Versions, History, and Rollback

```ts
interface RequirementVersion {
  id: string;
  templateId: string;
  version: number;
  changeType: "CREATED" | "UPDATED" | "ASSIGNED" | "ARCHIVED" | "RESTORED" | "ROLLED_BACK";
  data: RequirementSnapshot;
  changeNote: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface RequirementSnapshot {
  name: string;
  code: string;
  description: string | null;
  category: string | null;
  metadata: unknown;
  status: "ACTIVE" | "INACTIVE";
  nodes: Array<RequirementNodeSnapshot & {
    id: string;
    validations: Array<RequirementValidationSnapshot & { id: string }>;
  }>;
  assignments: Array<{
    id: string;
    targetType: RequirementAssignment["targetType"];
    targetId: string | null;
  }>;
}
```

Every template mutation atomically claims `template.version`, applies the
write, and appends its post-mutation snapshot and engine history row. A stale
concurrent writer receives 409 and must reload. Snapshot node, validation, and
assignment IDs are stable.

Rollback body:

```json
{
  "templateId": "UUID",
  "version": 5,
  "changeNote": "optional reason"
}
```

The target version must be lower than the current version. Rollback validates
name/code, node, rule, and assignment conflicts, replays the old snapshot in
one transaction, and appends a new ROLLED_BACK version/history row. It never
rewinds the version counter and never regenerates node IDs, preserving existing
`AaccupSubmission.requirementId` references through the runtime projection.

History query supports `page`, `pageSize`, `templateId`, `action`, and ISO
`from`/`to`. Actions are `CREATED`, `UPDATED`, `ASSIGNED`, `ARCHIVED`,
`RESTORED`, and `ROLLED_BACK`.

## Accreditation Cycles

Create body:

```ts
{
  code: string;
  name: string;
  description?: string | null;
  startDate: string; // ISO date/time
  endDate: string;   // ISO date/time; >= startDate
  status?: "ACTIVE" | "INACTIVE";
}
```

PATCH accepts the same fields, all optional, and revalidates the effective date
range. Codes are globally unique and live names are case-insensitively unique.
Archive/restore is soft. All mutations are audited and invalidate affected
area resolution. Cycle list supports `page`, `pageSize`, `q`, `status`, and
`includeArchived`.

`AaccupArea` create/update/list/detail now accepts and returns nullable
`accreditationCycleId`. The referenced cycle must be live and ACTIVE.

## AACCUP Runtime Projection

Existing endpoints retain their paths:

| Method | Path | Permission | Sprint 7.4.4 behavior |
|--------|------|------------|-----------------------|
| GET | `/api/v1/aaccup/requirements?areaId=:id` | `aaccup.requirement.read` | Resolves assignment and synchronizes effective content nodes before listing |
| GET | `/api/v1/aaccup/requirements/:id` | `aaccup.requirement.read` | Returns provenance and active validation rules |
| POST | `/api/v1/aaccup/requirements/:id/validate-upload` | `aaccup.requirement.read` | Evaluates configured preflight rules |
| POST | `/api/v1/aaccup/submissions` | `aaccup.submission.create` | Re-evaluates dynamic rules against the verified document version |

SECTION nodes provide hierarchy/category but do not become AACCUP requirement
rows. Every active content node is projected into the existing
`AaccupRequirement` table. Existing rows are updated/revived by stable
`sourceNodeId` (or matching document code during first adoption), so the
`AaccupRequirement.id` referenced by submissions remains stable across edits,
unassign/reassign, and rollback. Stale managed rows are soft-retired.

The requirement response adds:

```ts
{
  sourceNodeId: string | null;
  sourceAssignmentId: string | null;
  sourceTemplateId: string | null;
  sourceTemplateVersion: number | null;
  nodeType: "SECTION" | "REQUIREMENT" | "SUB_REQUIREMENT" | "SUPPORTING_DOCUMENT" | null;
  validations: RequirementValidation[];
}
```

Legacy manual requirements remain visible only when the area has no effective
builder assignment. Legacy create is rejected while an assignment resolves,
and projected rows cannot be updated/archived/restored through legacy AACCUP
CRUD.

Upload preflight body:

```ts
{
  filename: string;
  mimeType: string;
  sizeBytes: number | string;
  pageCount?: number;
  expirationDate?: string;
  metadata?: Record<string, unknown>;
}
```

Response:

```ts
interface UploadValidationResult {
  valid: boolean;
  errors: Array<{ ruleId: string; type: ValidationType; message: string; severity: "ERROR" }>;
  warnings: Array<{ ruleId: string; type: ValidationType; message: string; severity: "WARNING" }>;
}
```

Legacy requirements with no source node return a valid empty result. Dynamic
submission creation requires a verified current document version and evaluates
filename, MIME, byte size, and document metadata (`pageCount`,
`expirationDate`, and required keys) again. Validation errors return 400 with
issue details.

## Document Upload Integration

The existing document/version API paths are unchanged. Sprint 7.4.4 hardens
their behavior:

- MinIO keys use sanitized filenames and the exact key returned by the
  presigned upload response.
- `POST /documents/:id/versions/:versionId/verify` streams the object through
  SHA-256, verifies stored size/checksum, and only then promotes
  `Document.currentVersionId`.
- Failed/unverified uploads are never exposed as the current version.
- Document list/detail rows include current version filename, MIME, and size so
  server-backed evidence can appear in the canonical Document Repository.
- Upload/version ownership accepts any one of the existing owner-capable
  permissions through `requireAnyPermission`; no requirement management
  permission is needed.

## Errors, Audit, and Client

- 400: strict body/query validation, invalid ranges/regex/tree/lifecycle state,
  inactive target, or invalid rollback target.
- 401: missing, invalid, or expired access token.
- 403: non-ROOT management caller, missing route permission, or out-of-scope
  AACCUP access.
- 404: unknown or live-filtered template, node, rule, assignment, cycle, or
  version.
- 409: template/name/code/sibling/target/version conflict or attempted legacy
  mutation of builder-managed data.
- 429: global/auth rate limit.

Mutation audit constants cover requirement template/node/validation/assignment
and accreditation-cycle create/update/archive/restore/rollback operations.
Engine history is append-only and separate from the platform Audit Center.
Reads are unaudited.

Root Console route `/root-requirement-builder` provides responsive searchable
template cards, recursive drag/drop and move controls, node/rule dialogs,
archived restore surfaces, cycle and assignment management, version comparison,
rollback, and paginated history. The canonical end-user `/user/aaccup` page now
loads live areas/requirements/submissions and performs validation-aware upload;
hardcoded requirement fixtures were removed. The canonical Document Repository
merges visible server evidence with the existing local repository without
duplicating IDs.

---

# Sprint 7.4.5 - Dynamic Workflow Builder

Scope: ROOT-only authoring of versioned, validated, publishable workflow
definitions (steps + transitions + scoped assignments); immutable published
snapshots; a runtime engine that binds live instances to document requests,
AACCUP submissions, and document status changes; and a reviewer/override
runtime API. Migration: `20260823000000_sprint7_4_5_workflow_builder`.

## Permissions (14 new codes; catalog now 108)

| Code | Purpose | Holder |
|------|---------|--------|
| `workflow.read` | Definition/step/transition/assignment/version/history reads | ROOT |
| `workflow.create` | Create definitions, steps, transitions | ROOT |
| `workflow.update` | Update definitions, steps, transitions | ROOT |
| `workflow.archive` | Archive definitions, steps, transitions | ROOT |
| `workflow.restore` | Restore archived definitions, steps, transitions | ROOT |
| `workflow.version` | Version snapshot/history reads | ROOT |
| `workflow.validate` | Run structural validation | ROOT |
| `workflow.publish` | Publish a definition (immutable) | ROOT |
| `workflow.rollback` | Replay an older snapshot as a new version | ROOT |
| `workflow.assign` | Assign/unassign definitions to targets | ROOT |
| `workflow.override` | COMPLETE/TERMINATE a live instance | ROOT |
| `workflow.instance.read` | View live instances (scope-aware) | ROOT, ADMINISTRATOR, QAO, DEPARTMENT_COORDINATOR |
| `workflow.action.perform` | Advance a live instance with an action | ROOT, ADMINISTRATOR, QAO, DEPARTMENT_COORDINATOR |
| `workflow.review` | Review-gate signal for reviewer roles | ROOT, ADMINISTRATOR, QAO, DEPARTMENT_COORDINATOR |

The first eleven codes are ROOT-only (`ROOT_ONLY_CODES`); the last three are
granted to the reviewer roles exactly, keeping the existing privilege-escalation
guard. `workflow.override` stays ROOT-only. The seed catalog contains 108
permissions after Sprint 7.4.5.

## Core Types

```ts
type WorkflowEntityType = "DOCUMENT_REQUEST" | "AACCUP_SUBMISSION" | "DOCUMENT";
type WorkflowDefinitionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type WorkflowStepType = "START" | "TASK" | "REVIEW" | "APPROVAL" | "END";
type WorkflowTargetType =
  | "UNIVERSITY" | "COLLEGE" | "DEPARTMENT" | "PROGRAM" | "OFFICE"
  | "AACCUP_AREA" | "ACCREDITATION_CYCLE";
type WorkflowInstanceStatus = "RUNNING" | "COMPLETED" | "TERMINATED";
```

Definition view (list/detail base): `id, code, name, description, entityType,
status, version, metadata, createdBy/Name, updatedBy/Name, createdAt,
updatedAt, deletedAt, stepCount, transitionCount, assignmentCount,
instanceCount`. Detail adds `steps[]`, `transitions[]`, `assignments[]`.

Step view: `id, definitionId, code, name, description, type, roleName,
permissionCode, sortOrder, metadata, status (ACTIVE|INACTIVE), createdAt,
updatedAt, deletedAt`. Transition view: `id, definitionId, fromStepId,
toStepId, actionCode, requiredPermission, metadata, sortOrder, createdAt,
updatedAt, deletedAt`. Assignment view: `id, definitionId, definitionName,
targetType, targetId, targetName, priority, createdAt`. Version view: `id,
definitionId, definitionName, version, changeType, data (full snapshot JSON),
changeNote, changedById/Name, createdAt`. History view: `id, definitionId,
action, oldValue, newValue, versionFrom, versionTo, actorId/Name, createdAt`.

Instance view: `id, definitionId, definitionName, definitionCode, version,
entityType, entityId, status, currentStepId/Code/Name/Type, startedById/Name,
startedAt, completedAt, stepInstances[] (id, stepId, stepCode, stepName,
stepType, status PENDING|ACTIVE|COMPLETED|SKIPPED, activatedAt, completedAt,
actorId/Name, note), actions[] (id, stepId, stepCode, actionCode, fromStepId,
toStepId, actorId/Name, note, createdAt), allowedActions[]`.

Validation result: `{ valid, issues: [{ code, message, severity
ERROR|WARNING }], checksRun }`.

Published snapshots stored in `workflow_versions.data` are immutable: steps and
transitions carry their UUIDs (so step-instance and action rows keep stable
foreign keys), and runtime instances execute against the snapshot strings, not
the authoring tables. Editing a PUBLISHED definition therefore returns 409
until a rollback creates a new DRAFT version.

## Management Endpoints (base `/api/v1/root/workflows`)

All routes require `authenticate` + the hard ROOT role gate + the listed
`workflow.*` permission. Fixed segments `/history`, `/assignments`,
`/instances` are registered before `/:id` and can never be shadowed.

| Endpoint | Method | Permission | Body / Query |
|---|---|---|---|
| `/` | GET | read | `q, entityType?, status?, page, pageSize` → `{ items, meta }` |
| `/` | POST | create | `{ code, name, description?, entityType, metadata? }` (code unique per entityType) |
| `/:id` | GET | read | detail with steps/transitions/assignments |
| `/:id` | PATCH | update | `{ name?, description?, metadata? }` (DRAFT only) |
| `/:id` | DELETE | archive | soft archive (DRAFT/PUBLISHED) |
| `/:id/restore` | POST | restore | un-archive |
| `/:id/steps` | GET | read | steps of the definition |
| `/:id/steps` | POST | create | `{ code, name, type, description?, roleName?, permissionCode?, sortOrder?, metadata? }` |
| `/:id/steps/:stepId` | PATCH | update | same fields (DRAFT only) |
| `/:id/steps/:stepId` | DELETE | archive | soft archive |
| `/:id/steps/:stepId/restore` | POST | restore | un-archive |
| `/:id/transitions` | POST | create | `{ fromStepId, toStepId, actionCode, requiredPermission?, sortOrder?, metadata? }` |
| `/:id/transitions/:transitionId` | PATCH | update | same fields (DRAFT only) |
| `/:id/transitions/:transitionId` | DELETE | archive | soft archive |
| `/:id/transitions/:transitionId/restore` | POST | restore | un-archive |
| `/:id/assignments` | POST | assign | `{ targetType, targetId?, priority? }` (one live assignment per targetType) |
| `/assignments/:id` | DELETE | assign | unassign |
| `/:id/validate` | POST | validate | structural checks (start/end, reachability, terminability, action/step resolution, role/permission existence) |
| `/:id/publish` | POST | publish | `{ changeNote? }` — bumps version, writes immutable snapshot + history; must validate clean |
| `/:id/rollback` | POST | rollback | `{ version, changeNote? }` — replays an older snapshot as a NEW version |
| `/:id/versions` | GET | read | paginated version snapshots |
| `/history` | GET | read | paginated engine history |
| `/assignments` | GET | read | all assignments (definition filter) |
| `/instances` | GET | read | paginated instances (`entityType`, `entityId`, `status` filters) |
| `/instances/:id` | GET | read | full instance detail |
| `/instances/:entityType/:entityId/actions` | POST | (runtime router) | see below |
| `/instances/:id/override` | POST | (runtime router) | see below |

Publish immutability: after a definition is PUBLISHED, `PATCH /:id`,
step/transition writes, and re-assignment return 409 ("...is published").
Rollback to the published version produces a new DRAFT. Assignments are
snapshot-copied into the published version; changes are versioned as
UNASSIGNED/ASSIGNED history entries.

## Runtime Endpoints (base `/api/v1/workflows`)

Mounted outside `/root` so reviewer roles can act on live instances.

| Endpoint | Method | Permission | Body / Query |
|---|---|---|---|
| `/instances` | GET | instance.read | same filters as management list |
| `/instances/:id` | GET | instance.read | full detail + allowedActions for actor |
| `/instances/:entityType/:entityId/actions` | POST | action.perform | `{ actionCode, note? }` |
| `/instances/:id/override` | POST | override | `{ action: "COMPLETE" | "TERMINATE", note? }` |

`POST .../actions` finds the live RUNNING instance for the entity, locates the
transition from the current step whose actionCode matches (actor must satisfy
the transition's requiredPermission or the step's roleName/permissionCode, or
have `workflow.review` on review steps), advances to the next step, and
terminates at END with status COMPLETED. Wrong-action-from-step, unknown
entity, already-completed/terminated instance, and no-bound-definition all
return 409. Unresolved assignments fall back to the legacy path (no workflow
gate). Override COMPLETE/TERMINATE is ROOT-only and always recorded in audit +
engine history.

## Glue (service-side adapters)

| Entity | Trigger | Adapter (authoring actionCode) |
|---|---|---|
| DOCUMENT_REQUEST | `POST /requests/:id/decision` | APPROVED→APPROVE, REJECTED→REJECT, FULFILLED→FULFILL; `POST /requests/:id/cancel` → CANCEL |
| AACCUP_SUBMISSION | `POST /aaccup/submissions/:id/review` | APPROVED→APPROVE, REJECTED→REJECT, NEEDS_REVISION→REQUEST_REVISION |
| DOCUMENT | `PATCH /documents/:id` (status change only) | DRAFT→RESET_TO_DRAFT, UNDER_REVIEW→SUBMIT_FOR_REVIEW, APPROVED→APPROVE, PUBLISHED→PUBLISH, ARCHIVED→ARCHIVE |

Host services call `bindWorkflowInstance` (create/bind), `evaluateWorkflowAction`
(gate + advance), and `recordWorkflowAction` inside the same Prisma transaction
as the business write — no partial application. If the resolved definition is
a legacy request/document/approval flow, the old path runs unchanged
(fail-open).

## Assignment Resolution Precedence

`AACCUP_SUBMISSION`: AACCUP_AREA → active ACCREDITATION_CYCLE → DEPARTMENT →
COLLEGE → UNIVERSITY. `DOCUMENT_REQUEST` / `DOCUMENT`: DEPARTMENT → COLLEGE →
UNIVERSITY. Within a target type, priority desc → newest createdAt; PUBLISHED
definitions only. A 60-second in-process cache covers resolution; mutations
invalidate it.

## Schema (migration `20260823000000_sprint7_4_5_workflow_builder`)

- `workflow_definitions` (code+entityType unique, status DRAFT/PUBLISHED/ARCHIVED, version counter)
- `workflow_steps` (definition FK, type START/TASK/REVIEW/APPROVAL/END, optional roleName/permissionCode, sortOrder, soft delete)
- `workflow_transitions` (definition FK, from/to step FKs, actionCode, requiredPermission, sortOrder, soft delete)
- `workflow_assignments` (definition FK, targetType/targetId, priority, soft delete, unique targetType per definition)
- `workflow_versions` (definition FK, version, changeType, immutable `data` snapshot JSON, changeNote, changedBy)
- `workflow_histories` (definition FK, action, old/new values, versionFrom/To, actor)
- `workflow_instances` (definition+version FK, entityType/entityId unique, status RUNNING/COMPLETED/TERMINATED, current step, started/completed)
- `workflow_step_instances` (instance FK, stepId, snapshot step code/name/type, status, activated/completed, actor, note)
- `workflow_actions` (instance FK, stepId, actionCode, from/to step snapshots, actor, note)

All tables use UUID PKs, `createdAt`/`updatedAt`, and soft-delete semantics
where applicable, with indexes on FKs and `(entityType, entityId)`.

## Errors, Audit, and Client

- 400: strict body/query validation, invalid lifecycle state, invalid rollback target, broken workflow publish.
- 401: missing, invalid, or expired access token.
- 403: non-ROOT management caller, missing route permission, non-scope runtime caller, override by non-ROOT.
- 404: unknown or live-filtered definition/step/transition/assignment/version/instance; entity with no bound instance.
- 409: duplicate code, duplicate targetType assignment, step/transition conflicts, mutation of PUBLISHED definitions, invalid action from current step, action on completed/terminated instance, entity already bound.
- 429: global/auth rate limit.

Engine history (`workflow_histories`) is append-only and separate from the
platform Audit Center; mutation audit constants cover create/update/archive/
restore/assign/unassign/validate/publish/rollback/override. Reads are
unaudited.

Client: Root Console route `/root-workflow-builder` provides Builder /
Assignments / Instances / History tabs, step + transition dialogs, validation
results, publish confirmation, version comparison + rollback, assignment
dialog with live target options (`GET /root/organization/...` resolved target
lists), and instance detail with perform-action and COMPLETE/TERMINATE
override. Client services live in `client/src/services/root.ts`.

---

## Repository Rules 1–30 — endpoint additions (2026-08-05)

### Documents

| Endpoint | Method | Permission | Notes |
|---|---|---|---|
| `/documents/:id/restore` | POST | `documents.update` | Body `{ targetFolderId?: uuid\|null, conflictMode?: keep_both\|replace\|cancel }`. Omit `targetFolderId` to restore to the original location. keep_both suffixes the title on conflict; replace soft-deletes the clashing file. |
| `/documents/:id/activity` | GET | `documents.read` | Returns `{ downloadCount, events: [{ id, action, status, timestamp, actorName, actorEmail, details }] }` — the file's own audit timeline (read-only, no audit write). |
| `/documents` list rows | GET | `documents.read` | Rows now include `currentChecksum` and `submissionStatus` (latest non-deleted AACCUP submission status or null). Deleted rows include `deletedAt`. |

### Folders

| Endpoint | Method | Permission | Notes |
|---|---|---|---|
| `/folders/:id/restore` | POST | `folders.update` | Body `{ targetParentId?: uuid\|null, conflictMode?: keep_both\|replace\|cancel }`. Restore to original location when omitted. |
| `/folders/:id/copy` | POST | `folders.create` | Body `{ targetParentId?: uuid\|null, conflictMode?: merge\|keep_both\|cancel }`. Response `{ folder }` for small copies, `{ job }` for copies ≥ 1000 items (background job). |
| `/folders/:id/info` | GET | `folders.read` | `{ folderId, documentCount, childCount, recursiveDocumentCount, recursiveSizeBytes, depth }` (rule 12). |
| `/folders/:id/zip` | GET | `folders.read` | Streaming ZIP of the active subtree; `application/zip`; `Content-Disposition` attachment (rule 14). |
| `/folders/jobs` | GET | `folders.read` | Owner's background copy jobs (rule 9). |
| `/folders/jobs/:id` | GET | `folders.read` | One job: `{ id, sourceFolderName, status, totalItems, processedItems, error, resultFolderId, ... }`. |

### Repositories

| Endpoint | Method | Permission | Notes |
|---|---|---|---|
| `/repositories/storage` | GET | authenticated | `{ usedBytes, availableBytes: null, totalBytes: null, minioStatus: online\|offline, bucket }` — honest storage display (rule 13). |

### Access model (D-019)

- Document/folder reads and writes are OWNERSHIP-BASED for every role;
  foreign direct-ID access returns 404 (no existence leak).
- AACCUP submission reviewers (`aaccup.submission.review`) and
  document-request managers (`request.manage`) may READ documents that are
  the subject of a submission/request (controlled transfer, rule 22) — never
  write.
- Document/folder list endpoints are always owner-scoped (documents:
  owner-or-shared; folders: owner-or-department-scoped).

### Notifications (rule 19)

- New `NotificationType` values: `DOCUMENT_UPLOAD_FAILED`, `DOCUMENT_DELIVERED`,
  `DOCUMENT_RETURNED`, `AACCUP_SUBMISSION_RETURNED`, `RECYCLE_BIN_CLEANUP`,
  `STORAGE_WARNING` (added via migration `20260829000000_repository_rules`).
- Emitters: upload verified → `DOCUMENT_UPLOADED` (owner); verify failure →
  `DOCUMENT_UPLOAD_FAILED` (owner) + audit `document.upload_failed`; request
  approved/rejected → `REQUEST_APPROVED`/`REQUEST_REJECTED`; fulfilled →
  `DOCUMENT_DELIVERED` (requester); submission review →
  `AACCUP_SUBMISSION_APPROVED`/`AACCUP_SUBMISSION_RETURNED`/
  `AACCUP_SUBMISSION_REJECTED` (submitter); retention sweep →
  `RECYCLE_BIN_CLEANUP` (owner); storage threshold crossed →
  `STORAGE_WARNING` (admins, throttled 24h).
