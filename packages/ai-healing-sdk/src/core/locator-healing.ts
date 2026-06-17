/**
 * Reusable locator healing module — discovery strategies and query utilities.
 * Consumed by the retry orchestrator and future AI agent gateway (Phase 2+).
 */
export type { AutoHealContext, DiscoveryStrategy } from './discovery/types';
export type { DomElementSnapshot } from './discovery/dom-scan-discovery';
export type { ComposeDiscoveryOptions, DiscoveryStrategyName } from './discovery/compose-discoverers';

export { discoverFromSeedRules, seedDiscoveryStrategy } from './discovery/seed-discovery';
export {
  discoverFromDomScan,
  domScanDiscoveryStrategy,
  scanDomElements,
  synthesizeCandidatesFromDomSnapshots,
} from './discovery/dom-scan-discovery';
export {
  composeDiscoveryStrategies,
  createDefaultDiscoverer,
  discoverAutoHealingCandidates,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
} from './discovery/compose-discoverers';
export {
  generatedQueryKey,
  generatedQueryToLocatorFactory,
  queryKey,
  resolveQuery,
} from './locator-query';
