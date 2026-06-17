import { queryKey } from 'ai-healing-sdk';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';

const MAX_CANDIDATES = 16;

/** Merge candidates by query key, keeping highest score (same as Phase 2 composer). */
export function mergeLocatorCandidates(sources: GeneratedLocatorCandidate[]): GeneratedLocatorCandidate[] {
  const merged = new Map<string, GeneratedLocatorCandidate>();

  for (const candidate of sources) {
    const key = queryKey(candidate.query);
    const existing = merged.get(key);
    if (!existing || candidate.score > existing.score) {
      merged.set(key, candidate);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);
}
