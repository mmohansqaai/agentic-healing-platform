/**
 * Backward-compatible entry point for auto-heal discovery.
 * Implementation lives in the ai-healing-sdk package.
 */
export type { AutoHealContext } from 'ai-healing-sdk';
export { discoverFromSeedRules, seedDiscoveryStrategy } from 'ai-healing-sdk';
export {
  discoverFromDomScan,
  domScanDiscoveryStrategy,
  scanDomElements,
  synthesizeCandidatesFromDomSnapshots,
} from 'ai-healing-sdk';
export type { DomElementSnapshot } from 'ai-healing-sdk';
export {
  composeDiscoveryStrategies,
  createDefaultDiscoverer,
  discoverAutoHealingCandidates,
  isDomScanDiscoveryEnabled,
  resolveDiscoveryStrategyNames,
} from 'ai-healing-sdk';
export type { ComposeDiscoveryOptions, DiscoveryStrategyName } from 'ai-healing-sdk';
export { generatedQueryKey, generatedQueryToLocatorFactory } from 'ai-healing-sdk';
