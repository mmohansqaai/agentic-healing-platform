import type { Page } from '@playwright/test';
import { resolveHealingSdkConfig, type HealingSdkConfig } from '../utils/config';
import { setPageHealingConfig } from './page-registry';

/**
 * Enable self-healing for a Playwright page.
 *
 * @example
 * ```ts
 * import { enableHealing, healable } from 'ai-healing-sdk';
 *
 * enableHealing(page, { healingEnabled: true, confidenceThreshold: 0.8 });
 * await healable.click(page.locator('#login'));
 * ```
 */
export function enableHealing(page: Page, config?: Partial<HealingSdkConfig>): HealingSdkConfig {
  const resolved = resolveHealingSdkConfig(config);
  setPageHealingConfig(page, resolved);
  return resolved;
}
