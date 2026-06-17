import { discoverSeedCandidatesOffline } from 'ai-healing-sdk';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { LocatorAgentContext } from '../types';

/**
 * Strategy 2 — semantic / hint-based matching (seed rules).
 * Preserves Phase 2 seed-discovery behavior.
 */
export function runSemanticMatchingStrategy(ctx: LocatorAgentContext): GeneratedLocatorCandidate[] {
  return discoverSeedCandidatesOffline({
    actionType: ctx.actionType,
    failureHints: ctx.failureHints,
    domSnapshot: ctx.domSnapshot,
  }).map((c) => ({
    ...c,
    reason: `[semantic_matching] ${c.reason}`,
  }));
}
