import type { WebDriver } from 'selenium-webdriver';

export type SeleniumHealingConfig = {
  healingEnabled: boolean;
  healingServiceUrl?: string;
  framework: string;
  timeoutPerStrategyMs: number;
  maxCandidates: number;
  verboseLogs: boolean;
  driver?: WebDriver;
};

export const DEFAULT_SELENIUM_HEALING_CONFIG: SeleniumHealingConfig = {
  healingEnabled: true,
  healingServiceUrl: process.env.HEALING_SERVICE_URL,
  framework: 'selenium',
  timeoutPerStrategyMs: Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000),
  maxCandidates: 8,
  verboseLogs: false,
};

let activeConfig: SeleniumHealingConfig = { ...DEFAULT_SELENIUM_HEALING_CONFIG };

export function resolveSeleniumHealingConfig(
  config?: Partial<SeleniumHealingConfig>
): SeleniumHealingConfig {
  return {
    ...DEFAULT_SELENIUM_HEALING_CONFIG,
    ...config,
    healingServiceUrl:
      config?.healingServiceUrl ??
      process.env.HEALING_SERVICE_URL ??
      DEFAULT_SELENIUM_HEALING_CONFIG.healingServiceUrl,
  };
}

export function setSeleniumHealingConfig(config?: Partial<SeleniumHealingConfig>): SeleniumHealingConfig {
  activeConfig = resolveSeleniumHealingConfig(config);
  return activeConfig;
}

export function getSeleniumHealingConfig(): SeleniumHealingConfig {
  return activeConfig;
}

export function getActiveWebDriver(): WebDriver {
  const driver = activeConfig.driver;
  if (!driver) {
    throw new Error('No WebDriver registered. Call enableHealing(driver, config) first.');
  }
  return driver;
}
