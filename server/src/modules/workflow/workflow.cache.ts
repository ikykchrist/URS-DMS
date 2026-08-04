interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 60_000;
const store = new Map<string, CacheEntry<unknown>>();

export function workflowCacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function workflowCacheSet<T>(key: string, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function invalidateWorkflowCache(): void {
  store.clear();
}

export function workflowCacheStats(): { size: number; ttlMs: number } {
  return { size: store.size, ttlMs: TTL_MS };
}
