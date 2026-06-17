import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { LocatorAgentContext } from '../types';
import { runDomNeighborhoodStrategy } from './dom-neighborhood';

/**
 * Strategy 1 — attribute similarity (id, name, class, data-testid, placeholder).
 * Extracted from DOM synthesis candidates that use attribute-based queries.
 */
export function runAttributeSimilarityStrategy(ctx: LocatorAgentContext): GeneratedLocatorCandidate[] {
  const domCandidates = runDomNeighborhoodStrategy(ctx);

  return domCandidates
    .filter((c) => {
      if (c.query.type !== 'css') return false;
      const v = c.query.value.toLowerCase();
      return (
        v.includes('[data-testid') ||
        v.includes('#') ||
        v.includes('[name=') ||
        v.includes('[placeholder=') ||
        v.includes('[type=')
      );
    })
    .map((c) => ({
      ...c,
      strategyName: c.strategyName.replace(/^domscan/, 'attr'),
      reason: `[attribute_similarity] ${c.reason}`,
    }));
}
