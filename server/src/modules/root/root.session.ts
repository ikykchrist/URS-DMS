import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS } from "@/config/constants";
import { writeAudit } from "@/modules/audit/audit.service";

// =============================================================================
// URS-DMS — Root · session lifecycle watcher (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// The spec requires `root.login` / `root.logout` audit actions. The auth
// module must stay untouched (AI_CONTEXT §10), so root session lifecycle is
// observed here instead: this in-process worker polls the Session table for
// ROOT users and emits the two actions when sessions appear / disappear.
//
// Semantics:
//   * On start it snapshots the CURRENT active ROOT sessions as "already
//     known" — their login happened before this process booted (and was
//     audited by the watcher that ran then), so they are not re-audited.
//   * Every poll: newly-created ROOT sessions → `root.login`; sessions we
//     knew about that are now revoked / gone → `root.logout`.
//   * Best-effort: poll errors are logged, never thrown (audit-adjacent
//     helper must not take the server down).
//   * Single-instance assumption matches the email worker (Sprint 7.3) —
//     the modular monolith runs one process.
// =============================================================================

const POLL_INTERVAL_MS = 30_000;

const knownSessionIds = new Set<string>();
const knownSessionUsers = new Map<string, string>();

async function loadRootSessions(): Promise<
  { id: string; userId: string; revokedAt: Date | null; createdAt: Date }[]
> {
  const rootUsers = await prisma.user.findMany({
    where: { deletedAt: null, role: { name: "ROOT" } },
    select: { id: true },
  });
  if (rootUsers.length === 0) return [];
  return prisma.session.findMany({
    where: {
      userId: { in: rootUsers.map((u) => u.id) },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true, revokedAt: true, createdAt: true },
  });
}

async function poll(): Promise<void> {
  try {
    const sessions = await loadRootSessions();
    const seen = new Set(sessions.map((s) => s.id));

    // Logouts: sessions we knew about that are no longer active.
    for (const id of knownSessionIds) {
      if (seen.has(id)) continue;
      knownSessionIds.delete(id);
      const userId = knownSessionUsers.get(id);
      knownSessionUsers.delete(id);
      await writeAudit({ action: AUDIT_ACTIONS.ROOT_LOGOUT, userId, entity: "session", entityId: id });
    }

    // Login auditing is emitted by auth.login after the session is created.
    // The watcher only observes active-session disappearance for ROOT logout.
    for (const s of sessions) {
      knownSessionIds.add(s.id);
      knownSessionUsers.set(s.id, s.userId);
    }
  } catch (err) {
    console.error("[root-session] watcher poll failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export function startRootSessionWatcher(): void {
  // Snapshot the current active sessions as known — do not re-audit logins
  // that happened before this process started.
  void loadRootSessions().then((sessions) => {
    for (const s of sessions) {
      if (!s.revokedAt) knownSessionIds.add(s.id);
      if (!s.revokedAt) knownSessionUsers.set(s.id, s.userId);
    }
  });

  const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  timer.unref();
}
