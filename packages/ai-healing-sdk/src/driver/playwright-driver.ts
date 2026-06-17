import type { Page } from '@playwright/test';
import type {
  DriverClickOptions,
  DriverFillOptions,
  DriverVisibleOptions,
  GeneratedLocatorQuery,
  HealingActionType,
  HealingDriver,
} from 'ai-healing-core';
import { scanDomElements } from '../core/discovery/dom-scan-discovery';
import { resolveQuery } from '../core/locator-query';

const DEFAULT_TIMEOUT_MS = 5_000;

/** Playwright implementation of {@link HealingDriver}. */
export class PlaywrightHealingDriver implements HealingDriver {
  readonly framework = 'playwright' as const;

  constructor(private readonly page: Page) {}

  url(): string {
    return this.page.url();
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async captureDomSnapshot(actionType: HealingActionType) {
    return scanDomElements(this.page, actionType);
  }

  async count(query: GeneratedLocatorQuery): Promise<number> {
    return resolveQuery(this.page, query).count();
  }

  async click(query: GeneratedLocatorQuery, options?: DriverClickOptions): Promise<void> {
    const locator = resolveQuery(this.page, query);
    await locator.click({
      force: options?.force,
      timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
  }

  async fill(query: GeneratedLocatorQuery, value: string, options?: DriverFillOptions): Promise<void> {
    const locator = resolveQuery(this.page, query);
    await locator.fill(value, { timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  }

  async isVisible(query: GeneratedLocatorQuery, options?: DriverVisibleOptions): Promise<boolean> {
    const locator = resolveQuery(this.page, query);
    return locator.isVisible({ timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  }
}

export function createPlaywrightDriver(page: Page): PlaywrightHealingDriver {
  return new PlaywrightHealingDriver(page);
}
