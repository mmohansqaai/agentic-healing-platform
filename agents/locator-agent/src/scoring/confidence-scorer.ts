import { confidenceFromScore } from 'ai-healing-sdk';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { ConfidenceBreakdown, LocatorStrategyName, ScoredLocatorCandidate, StrategyContribution } from '../types';

function inferContributions(candidate: GeneratedLocatorCandidate): StrategyContribution[] {
  const contributions: StrategyContribution[] = [];

  if (/\[semantic_matching\]/i.test(candidate.reason) || /^seed-/i.test(candidate.strategyName)) {
    contributions.push({
      strategy: 'semantic_matching',
      weight: 10,
      reason: 'Hint-based semantic seed rules',
    });
  }

  if (/\[dom_neighborhood\]/i.test(candidate.reason) || /^domscan-/i.test(candidate.strategyName)) {
    contributions.push({
      strategy: 'dom_neighborhood',
      weight: 10,
      reason: 'DOM inventory and neighborhood synthesis',
    });
  }

  if (candidate.query.type === 'css') {
    const v = candidate.query.value.toLowerCase();
    if (
      v.includes('[data-testid') ||
      v.includes('#') ||
      v.includes('[name=') ||
      v.includes('[placeholder=') ||
      v.includes('[type=')
    ) {
      contributions.push({
        strategy: 'attribute_similarity',
        weight: 8,
        reason: 'Attribute-based locator (id, name, testid, placeholder)',
      });
    }
  }

  if (candidate.query.type === 'role') {
    contributions.push({
      strategy: 'accessibility_recovery',
      weight: 9,
      reason: `Accessibility role=${candidate.query.role}`,
    });
  }

  if (/historyBoost=/i.test(candidate.reason)) {
    contributions.push({
      strategy: 'historical_learning',
      weight: 6,
      reason: 'Prior heal success weighting',
    });
  }

  if (!contributions.length) {
    contributions.push({
      strategy: 'dom_neighborhood',
      weight: 5,
      reason: candidate.reason,
    });
  }

  return contributions;
}

export function buildConfidenceBreakdown(candidate: GeneratedLocatorCandidate): ConfidenceBreakdown {
  const historyMatch = candidate.reason.match(/historyBoost=(\d+)/i);
  const historyBoost = historyMatch ? Number(historyMatch[1]) : 0;
  const snapshotMatch = candidate.reason.match(/snapshotMatches=(\d+)/i);
  const snapshotBoost = snapshotMatch ? Math.min(10, Number(snapshotMatch[1]) * 2) : 0;
  const intentMatch = candidate.reason.match(/intent=(\d+)/i);
  const intentBoost = intentMatch ? Number(intentMatch[1]) : 0;

  const strategyBoost = snapshotBoost + intentBoost;
  const baseScore = Math.max(0, candidate.score - historyBoost - strategyBoost);

  return {
    baseScore,
    strategyBoost,
    uniquenessBoost: snapshotBoost,
    historyBoost,
    finalScore: candidate.score,
    confidence: confidenceFromScore(candidate.score),
  };
}

export function scoreCandidates(candidates: GeneratedLocatorCandidate[]): ScoredLocatorCandidate[] {
  return candidates.map((candidate) => {
    const breakdown = buildConfidenceBreakdown(candidate);
    return {
      ...candidate,
      confidence: breakdown.confidence,
      contributions: inferContributions(candidate),
    };
  });
}

export function pickBestScoredCandidate(candidates: ScoredLocatorCandidate[]): ScoredLocatorCandidate | undefined {
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => b.score - a.score)[0];
}
