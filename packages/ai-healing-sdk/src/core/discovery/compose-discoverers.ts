import { queryKey } from '../locator-query';
import type { GeneratedLocatorCandidate } from '../healing-types';
import { envFalsy } from '../../utils/env';
import { domScanDiscoveryStrategy } from './dom-scan-discovery';
import { seedDiscoveryStrategy } from './seed-discovery';
import type { AutoHealContext, DiscoveryStrategy } from './types';

export type DiscoveryStrategyName = 'seed' | 'dom-scan';

const STRATEGY_REGISTRY: Record<DiscoveryStrategyName, DiscoveryStrategy> = {
  seed: seedDiscoveryStrategy,
  'dom-scan': domScanDiscoveryStrategy,
};

export type ComposeDiscoveryOptions = {
  /** Ordered discovery strategies to run. Default: seed then dom-scan (when enabled). */
  strategies?: DiscoveryStrategyName[];
  maxTotalCandidates?: number;
};

/** Resolve strategy list from options + env (`AUTO_HEAL_STRATEGIES=seed,dom-scan`). */
export function resolveDiscoveryStrategyNames(options?: ComposeDiscoveryOptions): DiscoveryStrategyName[] {
  if (options?.strategies?.length) return options.strategies;

  const fromEnv = process.env.AUTO_HEAL_STRATEGIES?.split(',').map((s) => s.trim()) as DiscoveryStrategyName[];
  if (fromEnv?.length) {
    return fromEnv.filter((name) => name in STRATEGY_REGISTRY);
  }

  const domScanOff = envFalsy(process.env.AUTO_HEAL_DOM_SCAN);
  if (domScanOff) return ['seed'];

  return ['seed', 'dom-scan'];
}

export function isDomScanDiscoveryEnabled(options?: ComposeDiscoveryOptions): boolean {
  return resolveDiscoveryStrategyNames(options).includes('dom-scan');
}

/**
 * Runs multiple discovery strategies in order, merges by query key (highest score wins).
 */
export function composeDiscoveryStrategies(
  strategies: DiscoveryStrategy[],
  options?: { maxTotalCandidates?: number }
): (ctx: AutoHealContext) => Promise<GeneratedLocatorCandidate[]> {
  const maxTotal = options?.maxTotalCandidates ?? 16;

  return async (ctx) => {
    const merged = new Map<string, GeneratedLocatorCandidate>();

    for (const strategy of strategies) {
      const found = await strategy.discover(ctx);
      for (const candidate of found) {
        const key = queryKey(candidate.query);
        const existing = merged.get(key);
        if (!existing || candidate.score > existing.score) {
          merged.set(key, {
            ...candidate,
            reason: `[${strategy.name}] ${candidate.reason}`,
          });
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTotal);
  };
}

export function createDefaultDiscoverer(options?: ComposeDiscoveryOptions) {
  const names = resolveDiscoveryStrategyNames(options);
  const strategies = names.map((name) => STRATEGY_REGISTRY[name]);
  return composeDiscoveryStrategies(strategies, {
    maxTotalCandidates: options?.maxTotalCandidates,
  });
}

/** Backward-compatible alias for seed-only discovery. */
export async function discoverAutoHealingCandidates(ctx: AutoHealContext): Promise<GeneratedLocatorCandidate[]> {
  return seedDiscoveryStrategy.discover(ctx);
}
