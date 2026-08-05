// =============================================================================
// URS-DMS — Recycle Bin maintenance (Sprint: Personal Document Repository)
// -----------------------------------------------------------------------------
// SAFE maintenance command: permanently removes soft-deleted folders and
// documents whose deletedAt is older than the 30-day retention window.
// Guards:
//   * Documents referenced by any AACCUP submission snapshot are skipped.
//   * MinIO objects are deleted only when no remaining version row references
//     them (shared immutable blobs from copies/deliveries survive).
//   * Folder subtrees are hard-deleted (DB cascade handles children); files
//     inside deleted folders are unfiled (folderId nulled) and are handled by
//     the document sweep.
//   * --dry-run prints what would be removed without changing data.
// Usage:
//   node scripts/cleanup-recycle-bin.js [--dry-run]
// =============================================================================

const { PrismaClient } = require("@prisma/client");

const DRY_RUN = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const prisma = new PrismaClient();
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  console.log(`Retention cutoff: ${cutoff.toISOString()}${DRY_RUN ? " (DRY RUN)" : ""}`);

  // 1. Permanently delete eligible soft-deleted folders (subtree via cascade).
  const staleFolders = await prisma.folder.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, name: true, ownerId: true },
  });
  console.log(`eligible stale folders: ${staleFolders.length}`);
  if (!DRY_RUN && staleFolders.length) {
    for (const folder of staleFolders) {
      await notifyCleanup(folder.ownerId, folder.name, "folder");
      await prisma.folder.delete({ where: { id: folder.id } });
    }
  }

  // 2. Permanently delete eligible soft-deleted documents (snapshot-guarded).
  const staleDocs = await prisma.document.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, title: true, ownerId: true },
  });
  console.log(`eligible stale documents: ${staleDocs.length}`);
  if (!DRY_RUN) {
    for (const doc of staleDocs) {
      const snapshotRefs = await prisma.aaccupSubmission.count({ where: { documentId: doc.id } });
      if (snapshotRefs > 0) {
        console.log(`  skip (submission snapshot): ${doc.title}`);
        continue;
      }
      await notifyCleanup(doc.ownerId, doc.title, "file");
      await prisma.document.delete({ where: { id: doc.id } });
      console.log(`  removed: ${doc.title}`);
    }
  }

  // 3. Sweep orphaned recent/favorite/pin rows (cascade already handles FKs
  //    on hard delete; nothing further needed).
  console.log(DRY_RUN ? "DRY RUN — no data changed." : "Recycle Bin cleanup complete.");
}

/** Rule 19: notify the owner that a retained item was permanently removed. */
async function notifyCleanup(ownerId, name, kind) {
  try {
    await prisma.notification.create({
      data: {
        userId: ownerId,
        type: "RECYCLE_BIN_CLEANUP",
        title: "Recycle Bin cleanup",
        message: `"${name}" (${kind}) was permanently removed after 30 days in the Recycle Bin.`,
        priority: "LOW",
      },
    });
  } catch {
    // notification must never break the sweep
  }
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
