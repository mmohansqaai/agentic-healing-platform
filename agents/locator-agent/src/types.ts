import type { GeneratedLocatorCandidate, GeneratedLocatorQuery, HealingActionType } from 'ai-healing-sdk';
import type { DomElementSnapshot } from 'ai-healing-sdk';

export type LocatorStrategyName =
  | 'attribute_similarity'
  | 'semantic_matching'
  | 'dom_neighborhood'
  | 'accessibility_recovery'
  | 'historical_learning';

export type LocatorAgentContext = {
  actionType: HealingActionType;
  failedLocator: string;
  error: string;
  url: string;
  failureHints: string;
  domSnapshot?: DomElementSnapshot[];
};

export type StrategyContribution = {
  strategy: LocatorStrategyName;
  weight: number;
  reason: string;
};

export type ScoredLocatorCandidate = GeneratedLocatorCandidate & {
  confidence: number;
  contributions: StrategyContribution[];
};

export type LocatorAgentResult = {
  agent: 'locator-agent';
  candidates: ScoredLocatorCandidate[];
  best?: ScoredLocatorCandidate;
};

export type ConfidenceBreakdown = {
  baseScore: number;
  strategyBoost: number;
  uniquenessBoost: number;
  historyBoost: number;
  finalScore: number;
  confidence: number;
};

export type { GeneratedLocatorQuery, GeneratedLocatorCandidate, DomElementSnapshot };
