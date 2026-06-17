import type { Page } from '@playwright/test';
import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import { createDefaultDiscoverer } from '../core/discovery/compose-discoverers';
import type { AutoHealContext } from '../core/discovery/types';
import type { GeneratedLocatorCandidate, HealingAttempt, HealingActionType } from '../core/healing-types';

/**
 * Phase 1 transport: in-process discovery (no remote gateway).
 * Phase 2 will add HTTP transport to the AI Agent Gateway.
 */
export type DiscovererFn = (args: {
  page: Page;
  actionType: HealingActionType;
  attempts: HealingAttempt[];
}) => Promise<GeneratedLocatorCandidate[]>;

export type LocalTransportOptions = {
  discoveryStrategies?: DiscoveryStrategyName[];
  maxTotalCandidates?: number;
};

export function createLocalDiscoverer(options?: LocalTransportOptions): DiscovererFn {
  const discover = createDefaultDiscoverer({
    strategies: options?.discoveryStrategies,
    maxTotalCandidates: options?.maxTotalCandidates,
  });

  return async ({ page, actionType, attempts }) =>
    discover({ page, actionType, attempts } satisfies AutoHealContext);
}
