import { synthesizeCandidatesFromDomSnapshots } from 'ai-healing-sdk';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { LocatorAgentContext } from '../types';

/**
 * Strategy 3 — DOM neighborhood analysis via DOM scan synthesis.
 * Preserves Phase 2 dom-scan behavior.
 */
export function runDomNeighborhoodStrategy(ctx: LocatorAgentContext): GeneratedLocatorCandidate[] {
  if (!ctx.domSnapshot?.length) return [];

  return synthesizeCandidatesFromDomSnapshots(ctx.domSnapshot, {
    actionType: ctx.actionType,
    attempts: [{ strategy: ctx.failedLocator, ok: false, error: ctx.error }],
  }).map((c) => ({
    ...c,
    reason: `[dom_neighborhood] ${c.reason}`,
  }));
}
