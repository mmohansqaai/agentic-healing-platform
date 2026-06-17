export type {
  HealingDriver,
  TestFramework,
  DriverClickOptions,
  DriverFillOptions,
  DriverVisibleOptions,
  HealingRequest,
  HealingResponse,
  GeneratedLocatorQuery,
  DomElementSnapshot,
  HealingActionType,
} from 'ai-healing-core';

export { CypressHealingDriver, createCypressDriver } from './cypress-driver';
export {
  DEFAULT_CYPRESS_HEALING_CONFIG,
  getCypressHealingConfig,
  resolveCypressHealingConfig,
  setCypressHealingConfig,
} from './config';
export type { CypressHealingConfig } from './config';
export { enableHealing } from './enable-healing';
export { healable } from './healable';
export type { HealableApi, HealableClickOptions, HealableFillOptions, HealableVisibleOptions } from './healable';

