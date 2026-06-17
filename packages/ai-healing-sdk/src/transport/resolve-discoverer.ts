import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import { createHttpDiscoverer, isHealingServiceEnabled } from './http-transport';
import { createLocalDiscoverer, type DiscovererFn, type LocalTransportOptions } from './local-transport';

export type ResolveDiscovererOptions = LocalTransportOptions & {
  /** Force local in-process discovery (ignores HEALING_SERVICE_URL). */
  forceLocal?: boolean;
  /** Force remote healing-service even when env var is unset. */
  serviceUrl?: string;
};

/**
 * Resolves the active discoverer:
 * - HEALING_SERVICE_URL set → HTTP transport (healing-service)
 * - otherwise → local in-process discovery (Phase 1 backward compatibility)
 */
export function resolveDefaultDiscoverer(options?: ResolveDiscovererOptions): DiscovererFn {
  const local = createLocalDiscoverer({
    discoveryStrategies: options?.discoveryStrategies,
    maxTotalCandidates: options?.maxTotalCandidates,
  });

  if (options?.forceLocal) return local;

  const serviceUrl = options?.serviceUrl ?? process.env.HEALING_SERVICE_URL;
  if (!serviceUrl && !isHealingServiceEnabled()) return local;

  const baseUrl = (serviceUrl ?? process.env.HEALING_SERVICE_URL)!.replace(/\/$/, '');
  return createHttpDiscoverer({
    baseUrl,
    localDiscoverer: local,
    fallbackToLocal: process.env.HEALING_SERVICE_FALLBACK_LOCAL === '1',
  });
}
