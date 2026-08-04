// =============================================================================
// URS-DMS — Root · Configuration Engine cache (Sprint 7.4.1)
// -----------------------------------------------------------------------------
// Small in-process TTL cache for frequently-read configuration. The modular
// monolith runs a single server process, so a module-level Map is a valid
// cache tier: reads for the Root Console's Configuration page + internal
// `getConfigValue` consumers hit memory instead of Postgres.
//
// Semantics:
//   * `get` returns `null` on miss OR expiry (caller falls back to Prisma).
//   * Every mutation path (update / delete / restore / rollback / create)
//     calls `invalidateAll` — the engine is small (tens of keys), so a whole-
//     cache flush on write is cheaper and simpler than key-level tracking.
//   * TTL is 60s, so a stale value can never live longer than a minute even
//     if a future writer forgets to invalidate.
// =============================================================================

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const TTL_MS = 60_000;

const store = new Map<string, CacheEntry>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function cacheInvalidateAll(): void {
  store.clear();
}

export function cacheStats(): { size: number; ttlMs: number } {
  return { size: store.size, ttlMs: TTL_MS };
}
