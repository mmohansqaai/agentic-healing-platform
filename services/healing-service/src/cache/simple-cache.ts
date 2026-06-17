import { createHash } from 'node:crypto';
import type { HealingRequest, HealingResponse } from 'ai-healing-sdk';

type CacheEntry = {
  response: HealingResponse;
  storedAt: number;
};

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000;

function cacheKey(request: HealingRequest): string {
  const raw = JSON.stringify({
    action: request.action,
    url: request.url,
    failedLocator: request.failedLocator,
    error: request.error,
    failureHints: request.failureHints,
    domCount: request.domSnapshot?.length ?? 0,
  });
  return createHash('sha256').update(raw).digest('hex');
}

export function readCachedResponse(request: HealingRequest, ttlMs = DEFAULT_TTL_MS): HealingResponse | undefined {
  const key = cacheKey(request);
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.storedAt > ttlMs) {
    cache.delete(key);
    return undefined;
  }
  return entry.response;
}

export function writeCachedResponse(request: HealingRequest, response: HealingResponse): void {
  cache.set(cacheKey(request), { response, storedAt: Date.now() });
}
