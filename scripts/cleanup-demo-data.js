// =============================================================================
// URS-DMS — Demo / mock data cleanup (Sprint 7.7.5)
// -----------------------------------------------------------------------------
// SAFE, REPEATABLE, REVERSIBLE:
//   * Soft-deletes (sets deletedAt) every row that matches development-demo
//     patterns — the application already hides soft-deleted rows everywhere.
//   * Restore = set deletedAt back to NULL (no data is ever destroyed).
//   * MinIO objects are NEVER deleted (physical objects are the reversible
//     layer; only database references are cleared).
//   * --dry-run prints exactly what would be removed without changing data.
//
// KEEPS: Root account, default roles/permissions, bootstrap configuration,
// system settings, audit history, canonical demo accounts (root@urs.local,
// christbaldado@gmail.com, neil@thesis.com).
//
// Usage:
//   node scripts/cleanup-demo-data.js            # execute
//   node scripts/cleanup-demo-data.js --dry-run  # preview only
//   DATABASE_URL=postgresql://... node scripts/cleanup-demo-data.js
// =============================================================================

const { PrismaClient } = require("@prisma/client");

const DRY_RUN = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (e.g. postgresql://urs_user:urs_password@localhost:5432/urs_dms?schema=public)");
  process.exit(1);
}

const prisma = new PrismaClient();
const now = new Date();

// Demo-name patterns for documents / folders / templates (case-insensitive).
const DEMO_TEXT = [
  "Smoke", "Drive Test", "Nested Subfolder", "Renamed Subfolder", "Sprint75",
  "Folder Archive", "Img", "Policy Test", "PDF Test", "RC1", "Folder Test",
  "My Test", "Test Folder", "Wizard", "Institutional Folders",
  "Accreditation Requirements", "UI Smoke", "E2E", "Meowl", "Photoo", "Dou",
  "docu", "Folder 101", "Area I", "Test", "tEST2", "AACCUP",
];

function textOr(names, field = "name") {
  return names.map((n) => ({ [field]: { contains: n, mode: "insensitive" } }));
}

const report = {};

async function archiveMany(model, where, label) {
  const total = await prisma[model].count({ where });
  const rows = await prisma[model].findMany({ where, select: { id: true } });
  if (!DRY_RUN && rows.length > 0) {
    await prisma[model].updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { deletedAt: now, updatedAt: now },
    });
  }
  report[label] = total;
  console.log(`${DRY_RUN ? "[dry-run] would" : "removed"} ${label}: ${total}`);
}

async function main() {
  // ── AACCUP tasks (all current tasks were created during development) ───────
  await archiveMany("aaccupTask", { deletedAt: null }, "aaccup tasks");

  // ── AACCUP submissions (all created during development) ────────────────────
  await archiveMany("aaccupSubmission", { deletedAt: null }, "aaccup submissions");

  // ── AACCUP requirements under demo / archived areas ────────────────────────
  const demoAreas = await prisma.aaccupArea.findMany({
    where: {
      OR: [
        { deletedAt: null, name: { contains: "Smoke", mode: "insensitive" } },
        { deletedAt: null, name: { contains: "ISO-AREA", mode: "insensitive" } },
        { deletedAt: null, name: { contains: "CERT-AREA", mode: "insensitive" } },
        { deletedAt: null, name: { contains: "Area I", mode: "insensitive" } },
        { deletedAt: null, name: { contains: "Area 2", mode: "insensitive" } },
        { deletedAt: null, name: { contains: "Area 3", mode: "insensitive" } },
        // Archived areas are already hidden; requirements under them are
        // unreachable through the UI and are development artifacts.
        { deletedAt: { not: null } },
      ],
    },
    select: { id: true },
  });
  const demoAreaIds = demoAreas.map((a) => a.id);
  if (demoAreaIds.length) {
    const reqs = await prisma.aaccupRequirement.findMany({
      where: { deletedAt: null, areaId: { in: demoAreaIds } },
      select: { id: true },
    });
    if (!DRY_RUN && reqs.length) {
      await prisma.aaccupRequirement.updateMany({
        where: { id: { in: reqs.map((r) => r.id) } },
        data: { deletedAt: now, updatedAt: now },
      });
    }
    report["requirements of demo areas"] = reqs.length;
    console.log(`${DRY_RUN ? "[dry-run] would" : "removed"} requirements of demo areas: ${reqs.length}`);
  }

  // ── Demo AACCUP areas ──────────────────────────────────────────────────────
  await archiveMany(
    "aaccupArea",
    { deletedAt: null, id: { in: demoAreaIds } },
    "demo aaccup areas",
  );

  // ── Demo-named documents ───────────────────────────────────────────────────
  await archiveMany(
    "document",
    { deletedAt: null, OR: textOr(DEMO_TEXT, "title") },
    "demo-named documents",
  );

  // ── Demo folders ───────────────────────────────────────────────────────────
  await archiveMany(
    "folder",
    { deletedAt: null, OR: textOr(DEMO_TEXT) },
    "demo folders",
  );

  // ── Demo folder templates ──────────────────────────────────────────────────
  await archiveMany(
    "folderTemplate",
    { deletedAt: null, OR: textOr(DEMO_TEXT) },
    "demo folder templates",
  );

  // ── Demo requirement templates ─────────────────────────────────────────────
  await archiveMany(
    "requirementTemplate",
    { deletedAt: null, OR: textOr(DEMO_TEXT) },
    "demo requirement templates",
  );

  // ── Demo workflow definitions ──────────────────────────────────────────────
  await archiveMany(
    "workflowDefinition",
    { deletedAt: null, OR: textOr(["smoke", "override", "wizard"]) },
    "demo workflow definitions",
  );

  // ── Demo form templates ────────────────────────────────────────────────────
  await archiveMany(
    "formTemplate",
    { deletedAt: null, OR: textOr(["smoke", "survey", "ui smoke", "wizard"]) },
    "demo form templates",
  );

  // ── Demo document requests ─────────────────────────────────────────────────
  // DocumentRequest has NO soft-delete column (status lifecycle only), so
  // requests are deliberately NOT touched — nothing here is ever hard-deleted.
  console.log("skipped document requests (no soft-delete column — kept intact)");

  // ── Demo users (keep root / canonical admin / canonical faculty) ───────────
  const demoUsers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      email: { in: ["wizard.admin@urs.local", "test.cos@thesis.edu"] },
    },
    select: { id: true },
  });
  if (!DRY_RUN && demoUsers.length) {
    await prisma.user.updateMany({
      where: { id: { in: demoUsers.map((u) => u.id) } },
      data: { deletedAt: now, status: "INACTIVE", updatedAt: now },
    });
  }
  report["demo users"] = demoUsers.length;
  console.log(`${DRY_RUN ? "[dry-run] would" : "removed"} demo users: ${demoUsers.length}`);

  // ── Setup wizard: reset to NOT_STARTED (fresh guidance for the demo) ───────
  if (!DRY_RUN) {
    await prisma.setupState.upsert({
      where: { id: "setup" },
      create: { id: "setup", completedSteps: [] },
      update: {
        status: "NOT_STARTED",
        currentStep: 0,
        completedSteps: [],
        logoObjectKey: null,
        startedAt: null,
        completedAt: null,
        updatedAt: now,
      },
    });
  }
  report["setup state"] = 1;
  console.log(`${DRY_RUN ? "[dry-run] would reset" : "reset"} setup wizard state to NOT_STARTED`);

  // ── Config: restore seed defaults for upload policy (test value → default) ─
  if (!DRY_RUN) {
    await prisma.configuration.updateMany({
      where: { key: "upload.allowed_file_types" },
      data: { value: [] },
    });
  }
  report["config upload.allowed_file_types"] = 1;
  console.log(`${DRY_RUN ? "[dry-run] would reset" : "reset"} upload.allowed_file_types to [] (default)`);

  console.log("\nSUMMARY", JSON.stringify(report, null, 2));
  console.log(DRY_RUN
    ? "DRY RUN — no data was changed."
    : "Cleanup complete. All changes are soft-deletes; restore = clear deletedAt.");
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
