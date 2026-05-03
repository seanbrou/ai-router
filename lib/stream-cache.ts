/**
 * In-memory response cache for stream provider fetches.
 *
 * Stremio calls the stream endpoint multiple times for the same media
 * (when browsing episodes, switching seasons, etc.). Caching provider
 * responses for a short window avoids redundant fetches and makes
 * repeat views feel instant.
 */

type CacheEntry = {
  data: Record<string, unknown>[];
  expiresAt: number;
};

// Default TTL: 5 minutes for provider stream responses
const DEFAULT_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

/** Periodic cleanup: purge expired entries every 60 seconds */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const expired: string[] = [];
    cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        expired.push(key);
      }
    });
    for (const key of expired) {
      cache.delete(key);
    }
  }, 60_000);

  // Let Node exit even if timer is running
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Build a cache key from provider + media identity.
 */
export function cacheKey(provider: string, type: string, id: string): string {
  return `${provider}::${type}::${id}`;
}

/**
 * Get cached provider streams. Returns null on miss or expiry.
 */
export function getCachedStreams(key: string): Record<string, unknown>[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Store provider streams in cache.
 */
export function setCachedStreams(
  key: string,
  streams: Record<string, unknown>[],
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  ensureCleanup();
  cache.set(key, {
    data: streams,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clear all cached entries (useful for testing or profile changes).
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging / monitoring.
 */
export function cacheStats(): { size: number; keys: string[] } {
  const now = Date.now();
  const active: string[] = [];
  cache.forEach((entry, key) => {
    if (entry.expiresAt >= now) {
      active.push(key);
    }
  });
  return {
    size: active.length,
    keys: active,
  };
}
