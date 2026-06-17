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

export { SeleniumHealingDriver, createSeleniumDriver } from './selenium-driver';
export {
  DEFAULT_SELENIUM_HEALING_CONFIG,
  getSeleniumHealingConfig,
  resolveSeleniumHealingConfig,
  setSeleniumHealingConfig,
  getActiveWebDriver,
} from './config';
export type { SeleniumHealingConfig } from './config';
export { enableHealing } from './enable-healing';
export { healable } from './healable';
export type { HealableApi, HealableClickOptions, HealableFillOptions, HealableVisibleOptions } from './healable';
