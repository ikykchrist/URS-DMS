interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 60_000;
const store = new Map<string, CacheEntry<unknown>>();

export function requirementCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function requirementCacheSet<T>(key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function invalidateRequirementCache(): void {
  store.clear();
}

export function requirementCacheStats(): { size: number; ttlMs: number } {
  return { size: store.size, ttlMs: TTL_MS };
}
