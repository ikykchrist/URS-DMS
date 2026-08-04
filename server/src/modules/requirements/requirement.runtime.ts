import { prisma } from "@/lib/prisma";
import {
  invalidateRequirementCache,
  requirementCacheGet,
  requirementCacheSet,
} from "@/modules/root/root.requirement.cache";
import type {
  RequirementTargetType,
  RequirementValidationSeverityValue,
  RequirementValidationTypeValue,
  UploadValidationIssue,
  UploadValidationResult,
} from "@/modules/root/root.requirement.types";
import type { ValidateRequirementUploadBody } from "@/modules/root/root.requirement.validator";
import { BadRequestError, NotFoundError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import type { Prisma } from "@prisma/client";

export interface ResolvedRequirementAssignment {
  id: string;
  templateId: string;
  templateVersion: number;
  targetType: RequirementTargetType;
  targetId: string | null;
}

interface AreaScope {
  targetType: RequirementTargetType;
  targetId: string | null;
}

function areaCacheKey(areaId: string): string {
  return `requirement-area:${areaId}`;
}

export function invalidateRequirementResolutionCache(): void {
  invalidateRequirementCache();
}

export async function resolveRequirementAssignmentForArea(
  areaId: string,
): Promise<ResolvedRequirementAssignment | null> {
  const cached = requirementCacheGet<ResolvedRequirementAssignment | null>(areaCacheKey(areaId));
  if (cached !== undefined) return cached;

  const area = await prisma.aaccupArea.findFirst({
    where: { id: areaId, deletedAt: null },
    select: {
      id: true,
      departmentId: true,
      accreditationCycleId: true,
      accreditationCycle: { select: { deletedAt: true, status: true } },
      department: { select: { collegeId: true } },
    },
  });
  if (!area) throw new NotFoundError("AACCUP area not found");

  const scopes: AreaScope[] = [
    { targetType: "AACCUP_AREA", targetId: area.id },
    ...(area.accreditationCycleId &&
    area.accreditationCycle?.deletedAt === null &&
    area.accreditationCycle.status === "ACTIVE"
      ? [{ targetType: "ACCREDITATION_CYCLE" as const, targetId: area.accreditationCycleId }]
      : []),
    { targetType: "DEPARTMENT", targetId: area.departmentId },
    ...(area.department.collegeId
      ? [{ targetType: "COLLEGE" as const, targetId: area.department.collegeId }]
      : []),
    { targetType: "UNIVERSITY", targetId: null },
  ];

  const assignments = await prisma.requirementAssignment.findMany({
    where: {
      deletedAt: null,
      template: { deletedAt: null, status: "ACTIVE" },
      OR: scopes.map((scope) => ({ targetType: scope.targetType, targetId: scope.targetId })),
    },
    select: {
      id: true,
      templateId: true,
      targetType: true,
      targetId: true,
      template: { select: { version: true } },
    },
  });

  let resolved: ResolvedRequirementAssignment | null = null;
  for (const scope of scopes) {
    const row = assignments.find(
      (assignment) =>
        assignment.targetType === scope.targetType && assignment.targetId === scope.targetId,
    );
    if (row) {
      resolved = {
        id: row.id,
        templateId: row.templateId,
        templateVersion: row.template.version,
        targetType: row.targetType,
        targetId: row.targetId,
      };
      break;
    }
  }
  requirementCacheSet(areaCacheKey(areaId), resolved);
  return resolved;
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function nearestSectionName(
  node: { parentId: string | null },
  byId: Map<string, { parentId: string | null; type: string; name: string }>,
): string | null {
  let parentId = node.parentId;
  const visited = new Set<string>();
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return null;
    if (parent.type === "SECTION") return parent.name;
    parentId = parent.parentId;
  }
  return null;
}

function flattenProjectionNodes<
  T extends { id: string; parentId: string | null; sortOrder: number; name: string },
>(rows: T[]): T[] {
  const byParent = new Map<string | null, T[]>();
  for (const row of rows) {
    const bucket = byParent.get(row.parentId) ?? [];
    bucket.push(row);
    byParent.set(row.parentId, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
  const result: T[] = [];
  const visit = (parentId: string | null): void => {
    for (const row of byParent.get(parentId) ?? []) {
      result.push(row);
      visit(row.id);
    }
  };
  visit(null);
  return result;
}

export async function syncAreaRequirementProjection(
  areaId: string,
  actorId: string,
): Promise<ResolvedRequirementAssignment | null> {
  const assignment = await resolveRequirementAssignmentForArea(areaId);
  if (!assignment) {
    await prisma.aaccupRequirement.updateMany({
      where: { areaId, sourceNodeId: { not: null }, deletedAt: null },
      data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: actorId },
    });
    return null;
  }

  const allNodes = await prisma.requirementNode.findMany({
    where: {
      templateId: assignment.templateId,
      deletedAt: null,
      status: "ACTIVE",
    },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      code: true,
      name: true,
      description: true,
      type: true,
      metadata: true,
      isRequired: true,
      sortOrder: true,
    },
  });
  const contentNodes = flattenProjectionNodes(allNodes).filter((node) => node.type !== "SECTION");
  const projected = await prisma.aaccupRequirement.findMany({
    where: { areaId, sourceNodeId: { not: null } },
    select: {
      id: true,
      sourceNodeId: true,
      sourceAssignmentId: true,
      sourceTemplateVersion: true,
      deletedAt: true,
    },
  });
  const expectedIds = new Set(contentNodes.map((node) => node.id));
  const fresh =
    projected.filter((row) => row.deletedAt === null).length === contentNodes.length &&
    projected
      .filter((row) => row.deletedAt === null)
      .every(
        (row) =>
          row.sourceNodeId !== null &&
          expectedIds.has(row.sourceNodeId) &&
          row.sourceAssignmentId === assignment.id &&
          row.sourceTemplateVersion === assignment.templateVersion,
      );
  if (fresh) return assignment;

  const byId = new Map(
    allNodes.map((node) => [
      node.id,
      { parentId: node.parentId, type: node.type, name: node.name },
    ]),
  );

  await prisma.$transaction(async (tx) => {
    const existingRows = await tx.aaccupRequirement.findMany({
      where: { areaId },
      select: { id: true, documentCode: true, sourceNodeId: true },
    });
    const bySource = new Map(
      existingRows.filter((row) => row.sourceNodeId).map((row) => [row.sourceNodeId!, row]),
    );
    const byCode = new Map(existingRows.map((row) => [row.documentCode, row]));
    const touched = new Set<string>();

    for (const [displayOrder, node] of contentNodes.entries()) {
      const existing = bySource.get(node.id) ?? byCode.get(node.code);
      const metadata = jsonObject(node.metadata);
      const category = nearestSectionName(node, byId) ?? node.type.replaceAll("_", " ");
      const priority = typeof metadata.priority === "string" ? metadata.priority : null;
      const data = {
        title: node.name,
        description: node.description,
        documentCode: node.code,
        category,
        priority,
        isRequired: node.isRequired,
        status: "ACTIVE" as const,
        displayOrder,
        sourceNodeId: node.id,
        sourceAssignmentId: assignment.id,
        sourceTemplateVersion: assignment.templateVersion,
        updatedBy: actorId,
        deletedAt: null,
      };
      if (existing) {
        await tx.aaccupRequirement.update({ where: { id: existing.id }, data });
        touched.add(existing.id);
      } else {
        const created = await tx.aaccupRequirement.create({
          data: { areaId, ...data, createdBy: actorId },
          select: { id: true },
        });
        touched.add(created.id);
      }
    }

    await tx.aaccupRequirement.updateMany({
      where: {
        areaId,
        sourceNodeId: { not: null },
        ...(touched.size > 0 ? { id: { notIn: [...touched] } } : {}),
        deletedAt: null,
      },
      data: { status: "INACTIVE", deletedAt: new Date(), updatedBy: actorId },
    });
  });
  return assignment;
}

export async function refreshAllRequirementProjections(actorId: string): Promise<void> {
  invalidateRequirementResolutionCache();
  const areas = await prisma.aaccupArea.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  for (const area of areas) {
    await syncAreaRequirementProjection(area.id, actorId);
  }
}

export async function refreshAllRequirementProjectionsBestEffort(actorId: string): Promise<void> {
  try {
    await refreshAllRequirementProjections(actorId);
  } catch (error) {
    logger.error("Requirement projection refresh failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function refreshProjectionAreas(areaIds: Iterable<string>, actorId: string): Promise<void> {
  for (const areaId of new Set(areaIds)) {
    await syncAreaRequirementProjection(areaId, actorId);
  }
}

export async function refreshRequirementProjectionsForTemplate(
  templateId: string,
  actorId: string,
): Promise<void> {
  invalidateRequirementResolutionCache();
  const [assignments, existingProjections] = await Promise.all([
    prisma.requirementAssignment.findMany({
      where: { templateId, deletedAt: null },
      select: { targetType: true, targetId: true },
    }),
    prisma.aaccupRequirement.findMany({
      where: {
        area: { deletedAt: null },
        OR: [{ sourceAssignment: { templateId } }, { sourceNode: { templateId } }],
      },
      distinct: ["areaId"],
      select: { areaId: true },
    }),
  ]);

  const areaIds = assignments
    .filter((assignment) => assignment.targetType === "AACCUP_AREA" && assignment.targetId)
    .map((assignment) => assignment.targetId!);
  const cycleIds = assignments
    .filter((assignment) => assignment.targetType === "ACCREDITATION_CYCLE" && assignment.targetId)
    .map((assignment) => assignment.targetId!);
  const departmentIds = assignments
    .filter((assignment) => assignment.targetType === "DEPARTMENT" && assignment.targetId)
    .map((assignment) => assignment.targetId!);
  const collegeIds = assignments
    .filter((assignment) => assignment.targetType === "COLLEGE" && assignment.targetId)
    .map((assignment) => assignment.targetId!);
  const university = assignments.some((assignment) => assignment.targetType === "UNIVERSITY");
  const scopeFilters: Prisma.AaccupAreaWhereInput[] = [];
  if (areaIds.length > 0) scopeFilters.push({ id: { in: areaIds } });
  if (cycleIds.length > 0) {
    scopeFilters.push({ accreditationCycleId: { in: cycleIds } });
  }
  if (departmentIds.length > 0) {
    scopeFilters.push({ departmentId: { in: departmentIds } });
  }
  if (collegeIds.length > 0) {
    scopeFilters.push({ department: { collegeId: { in: collegeIds } } });
  }

  const scopedAreas = await prisma.aaccupArea.findMany({
    where: {
      deletedAt: null,
      ...(university ? {} : { OR: scopeFilters }),
    },
    select: { id: true },
  });
  await refreshProjectionAreas(
    [
      ...existingProjections.map((projection) => projection.areaId),
      ...scopedAreas.map((area) => area.id),
    ],
    actorId,
  );
}

export async function refreshRequirementProjectionsForTemplateBestEffort(
  templateId: string,
  actorId: string,
): Promise<void> {
  try {
    await refreshRequirementProjectionsForTemplate(templateId, actorId);
  } catch (error) {
    logger.error("Targeted requirement projection refresh failed", {
      templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function refreshRequirementProjectionsForCycleBestEffort(
  cycleId: string,
  actorId: string,
): Promise<void> {
  try {
    invalidateRequirementResolutionCache();
    const areas = await prisma.aaccupArea.findMany({
      where: { accreditationCycleId: cycleId, deletedAt: null },
      select: { id: true },
    });
    await refreshProjectionAreas(
      areas.map((area) => area.id),
      actorId,
    );
  } catch (error) {
    logger.error("Accreditation cycle projection refresh failed", {
      cycleId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function issueMessage(
  type: RequirementValidationTypeValue,
  configured: string | null,
  fallback: string,
): string {
  return configured?.trim() || `${type.replaceAll("_", " ")}: ${fallback}`;
}

export async function validateRequirementUpload(
  requirementId: string,
  candidate: ValidateRequirementUploadBody,
): Promise<UploadValidationResult> {
  const requirement = await prisma.aaccupRequirement.findFirst({
    where: { id: requirementId, deletedAt: null },
    select: {
      id: true,
      status: true,
      sourceNode: {
        select: {
          id: true,
          deletedAt: true,
          status: true,
          validations: {
            where: { deletedAt: null, enabled: true },
            orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
            select: { id: true, type: true, config: true, message: true, severity: true },
          },
        },
      },
    },
  });
  if (!requirement) throw new NotFoundError("AACCUP requirement not found");
  if (requirement.status !== "ACTIVE") {
    throw new BadRequestError("Requirement is inactive and cannot accept uploads");
  }
  if (!requirement.sourceNode) return { valid: true, errors: [], warnings: [] };
  if (requirement.sourceNode.deletedAt || requirement.sourceNode.status !== "ACTIVE") {
    throw new BadRequestError("Requirement node is inactive and cannot accept uploads");
  }

  const issues: UploadValidationIssue[] = [];
  const addIssue = (
    rule: {
      id: string;
      type: RequirementValidationTypeValue;
      message: string | null;
      severity: RequirementValidationSeverityValue;
    },
    fallback: string,
  ): void => {
    issues.push({
      ruleId: rule.id,
      type: rule.type,
      message: issueMessage(rule.type, rule.message, fallback),
      severity: rule.severity,
    });
  };

  for (const rule of requirement.sourceNode.validations) {
    const config = jsonObject(rule.config);
    switch (rule.type) {
      case "FILE_TYPE": {
        const mimeTypes = Array.isArray(config.allowedMimeTypes)
          ? config.allowedMimeTypes.filter((value): value is string => typeof value === "string")
          : [];
        const extensions = Array.isArray(config.allowedExtensions)
          ? config.allowedExtensions
              .filter((value): value is string => typeof value === "string")
              .map((value) => (value.startsWith(".") ? value : `.${value}`).toLowerCase())
          : [];
        const extension = candidate.filename.includes(".")
          ? `.${candidate.filename.split(".").pop()!.toLowerCase()}`
          : "";
        if (!mimeTypes.includes(candidate.mimeType) && !extensions.includes(extension)) {
          addIssue(rule, `allowed types are ${[...mimeTypes, ...extensions].join(", ")}`);
        }
        break;
      }
      case "FILE_SIZE": {
        const min = typeof config.minBytes === "number" ? BigInt(config.minBytes) : null;
        const max = typeof config.maxBytes === "number" ? BigInt(config.maxBytes) : null;
        if (min !== null && candidate.sizeBytes < min)
          addIssue(rule, `file must be at least ${min} bytes`);
        if (max !== null && candidate.sizeBytes > max)
          addIssue(rule, `file must not exceed ${max} bytes`);
        break;
      }
      case "PAGE_COUNT": {
        const min = typeof config.minPages === "number" ? config.minPages : null;
        const max = typeof config.maxPages === "number" ? config.maxPages : null;
        if (candidate.pageCount === undefined) {
          addIssue(rule, "page count is required");
        } else {
          if (min !== null && candidate.pageCount < min)
            addIssue(rule, `document must have at least ${min} pages`);
          if (max !== null && candidate.pageCount > max)
            addIssue(rule, `document must not exceed ${max} pages`);
        }
        break;
      }
      case "EXPIRATION_DATE": {
        const required = config.required !== false;
        if (!candidate.expirationDate) {
          if (required) addIssue(rule, "expiration date is required");
          break;
        }
        const now = Date.now();
        const day = 86_400_000;
        const min =
          typeof config.minDaysFromNow === "number" ? now + config.minDaysFromNow * day : null;
        const max =
          typeof config.maxDaysFromNow === "number" ? now + config.maxDaysFromNow * day : null;
        const value = candidate.expirationDate.getTime();
        if (min !== null && value < min)
          addIssue(rule, `expiration must be at least ${config.minDaysFromNow} days from now`);
        if (max !== null && value > max)
          addIssue(rule, `expiration must be within ${config.maxDaysFromNow} days`);
        break;
      }
      case "NAMING_CONVENTION": {
        const pattern = typeof config.pattern === "string" ? config.pattern : "";
        try {
          const regex = new RegExp(pattern, config.caseInsensitive === true ? "i" : undefined);
          if (!regex.test(candidate.filename)) {
            addIssue(rule, `filename must match ${pattern}`);
          }
        } catch {
          addIssue(rule, "configured naming pattern is invalid");
        }
        break;
      }
      case "METADATA": {
        const requiredKeys = Array.isArray(config.requiredKeys)
          ? config.requiredKeys.filter((value): value is string => typeof value === "string")
          : [];
        const metadata = candidate.metadata ?? {};
        const missing = requiredKeys.filter(
          (key) => metadata[key] === undefined || metadata[key] === null || metadata[key] === "",
        );
        if (missing.length > 0) addIssue(rule, `missing metadata: ${missing.join(", ")}`);
        break;
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === "ERROR");
  const warnings = issues.filter((issue) => issue.severity === "WARNING");
  return { valid: errors.length === 0, errors, warnings };
}

export async function assertRequirementUploadValid(
  requirementId: string,
  candidate: ValidateRequirementUploadBody,
): Promise<UploadValidationResult> {
  const result = await validateRequirementUpload(requirementId, candidate);
  if (!result.valid) {
    throw new BadRequestError("Document does not satisfy requirement validation rules", {
      errors: result.errors,
      warnings: result.warnings,
    });
  }
  return result;
}
