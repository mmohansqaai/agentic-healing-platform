import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { LocatorAgentContext } from '../types';
import { runDomNeighborhoodStrategy } from './dom-neighborhood';
import { runSemanticMatchingStrategy } from './semantic-matching';

/**
 * Strategy 4 — accessibility recovery (getByRole / aria / label).
 */
export function runAccessibilityRecoveryStrategy(ctx: LocatorAgentContext): GeneratedLocatorCandidate[] {
  const fromDom = runDomNeighborhoodStrategy(ctx).filter((c) => c.query.type === 'role');
  const fromSeed = runSemanticMatchingStrategy(ctx).filter((c) => c.query.type === 'role');

  return [...fromSeed, ...fromDom].map((c) => ({
    ...c,
    strategyName: c.strategyName.replace(/^(seed|domscan|attr)/, 'a11y'),
    reason: `[accessibility_recovery] ${c.reason}`,
  }));
}
