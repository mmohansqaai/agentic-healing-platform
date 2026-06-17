export type {
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  LocatorSource,
} from 'ai-healing-sdk';
export { attachHealingSummary, attachLiveAutoHealProof, formatHealingBody } from 'ai-healing-sdk';
export {
  discoverAutoHealingCandidates,
  discoverFromDomScan,
  discoverFromSeedRules,
  createDefaultDiscoverer,
  composeDiscoveryStrategies,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
  generatedQueryKey,
  generatedQueryToLocatorFactory,
} from 'ai-healing-sdk';
export type { AutoHealContext, DomElementSnapshot, ComposeDiscoveryOptions, DiscoveryStrategyName } from 'ai-healing-sdk';
export { synthesizeCandidatesFromDomSnapshots } from 'ai-healing-sdk';
export { historyFilePath, recordHistoryOutcome } from 'ai-healing-sdk';
export { persistGeneratedLocator } from 'ai-healing-sdk';
export {
  clickHealing,
  expectVisibleHealing,
  fillHealing,
  withHealingPage,
} from 'ai-healing-sdk';
export { enableHealing, healable } from 'ai-healing-sdk';
