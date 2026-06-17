import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import { confidenceFromScore, formatLocatorQuery } from 'ai-healing-sdk';
import type { HealingResponseCandidate } from 'ai-healing-sdk';
import type { ScoredLocatorCandidate } from 'locator-agent';

export function toResponseCandidates(
  candidates: Array<GeneratedLocatorCandidate | ScoredLocatorCandidate>
): HealingResponseCandidate[] {
  return candidates.map((c) => {
    const scored = c as ScoredLocatorCandidate;
    const confidence = typeof scored.confidence === 'number' ? scored.confidence : confidenceFromScore(c.score);
    return {
      query: c.query,
      healedLocator: formatLocatorQuery(c.query),
      confidence,
      strategy: c.strategyName,
      reasoning: c.reason,
      score: c.score,
    };
  });
}

export function pickBestCandidate(candidates: HealingResponseCandidate[]): HealingResponseCandidate | undefined {
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => b.score - a.score)[0];
}
