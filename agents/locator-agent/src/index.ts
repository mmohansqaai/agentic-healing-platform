export { runLocatorAgent, runLocatorRecoveryAgent, buildLocatorAgentContext } from './locator-agent';
export { mergeLocatorCandidates } from './merge/candidate-merger';
export {
  scoreCandidates,
  pickBestScoredCandidate,
  buildConfidenceBreakdown,
} from './scoring/confidence-scorer';
export { runSemanticMatchingStrategy } from './strategies/semantic-matching';
export { runDomNeighborhoodStrategy } from './strategies/dom-neighborhood';
export { runAttributeSimilarityStrategy } from './strategies/attribute-similarity';
export { runAccessibilityRecoveryStrategy } from './strategies/accessibility-recovery';
export { applyHistoricalLearningBoost } from './strategies/historical-learning';
export type {
  LocatorAgentContext,
  LocatorAgentResult,
  ScoredLocatorCandidate,
  LocatorStrategyName,
  StrategyContribution,
  ConfidenceBreakdown,
} from './types';
