import type { Page } from '@playwright/test';
import { resolveHealingSdkConfig, type HealingSdkConfig } from '../utils/config';

const pageConfigs = new WeakMap<Page, HealingSdkConfig>();

export function setPageHealingConfig(page: Page, config: HealingSdkConfig): void {
  pageConfigs.set(page, config);
}

export function getPageHealingConfig(page: Page): HealingSdkConfig | undefined {
  return pageConfigs.get(page);
}

export function resolvePageHealingConfig(page: Page, partial?: Partial<HealingSdkConfig>): HealingSdkConfig {
  const existing = pageConfigs.get(page);
  return resolveHealingSdkConfig({ ...existing, ...partial });
}

export function isHealingEnabledForPage(page: Page): boolean {
  const config = pageConfigs.get(page);
  if (config) return config.healingEnabled;
  return resolveHealingSdkConfig().healingEnabled;
}
