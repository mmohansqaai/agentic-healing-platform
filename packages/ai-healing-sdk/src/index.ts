// Framework-agnostic core (re-export for convenience)
export type {
  HealingDriver,
  TestFramework,
  DriverClickOptions,
  DriverFillOptions,
  DriverVisibleOptions,
} from 'ai-healing-core';
export { queryKey } from 'ai-healing-core';

// Playwright driver adapter
export { PlaywrightHealingDriver, createPlaywrightDriver } from './driver/playwright-driver';

// Phase 1 public API
export { enableHealing } from './wrappers/enable-healing';
export { healable } from './wrappers/healable';
export type { HealableClickOptions, HealableFillOptions, HealableApi } from './wrappers/healable';

export type {
  HealingSdkConfig,
  HealingEngineOptions,
  AutoHealEngineOptions,
  DomSnapshotMode,
  HealingAgentMode,
} from './utils/config';
export { DEFAULT_HEALING_SDK_CONFIG, resolveHealingSdkConfig, sdkConfigToEngineOptions } from './utils/config';

// Locator healing module
export * from './core/locator-healing';
export { hasSignal, failureHints } from './core/discovery/intent-hints';

// Core types
export type {
  GeneratedLocatorCandidate,
  GeneratedLocatorQuery,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  LocatorSource,
  HealingActionType,
} from './core/healing-types';

// Retry orchestrator (backward-compatible engine API)
export {
  withHealingPage,
  clickHealing,
  fillHealing,
  expectVisibleHealing,
} from './retry/retry-orchestrator';
export type { HealingOptions, AutoHealOptions } from './retry/retry-orchestrator';

// Persistence & history
export { persistGeneratedLocator, resolveRelativePagePath } from './core/persistence';
export type { PersistOptions, PersistTarget } from './core/persistence';
export { historyFilePath, recordHistoryOutcome, getHistoryWeight } from './core/history';

// Reporters
export { attachHealingSummary, attachLiveAutoHealProof, formatHealingBody } from './reporters/healing-reporter';

// Transport (Phase 1 local; Phase 2 healing-service HTTP)
export { createLocalDiscoverer } from './transport/local-transport';
export type { DiscovererFn, LocalTransportOptions } from './transport/local-transport';
export { createHttpDiscoverer, isHealingServiceEnabled } from './transport/http-transport';
export type { HttpTransportOptions } from './transport/http-transport';
export { resolveDefaultDiscoverer } from './transport/resolve-discoverer';
export type { ResolveDiscovererOptions } from './transport/resolve-discoverer';
export type {
  HealingRequest,
  HealingResponse,
  HealingResponseCandidate,
  AgentHealContext,
  AgentTrace,
  AgentValidationResult,
  AgentToolCall,
} from './transport/contracts';
export { formatLocatorQuery, confidenceFromScore } from './transport/contracts';
export { discoverSeedCandidatesOffline } from './core/locator-recovery/offline-seed-discovery';

// Agentic healing (pure agent loop)
export { runAgenticHealingLoop, createAgentDiscoverer, resolveAgentDiscoverer } from './agent/agent-loop';
export type { AgentLoopOptions } from './agent/agent-loop';
export { runAgentEngine } from './agent/agent-engine';
export { buildHealingRequest } from './agent/build-healing-request';
export { searchDom, listHeuristicCandidates, listHeuristicCandidatesOffline } from './agent/tools';

// Telemetry
export { emitTelemetry, onTelemetry } from './telemetry/telemetry';
export type { TelemetryEvent } from './telemetry/telemetry';

// Interceptors
export { recordStrategyFailure, formatExhaustedStrategiesError } from './interceptors/failure-handler';

// DOM scan (used by healing + external consumers)
export type { DomElementSnapshot } from './core/discovery/dom-scan-discovery';
export { scanDomElements } from './core/discovery/dom-scan-discovery';
export { previewPersistencePatch, buildStrategySnippetForCandidate } from './core/persistence';
