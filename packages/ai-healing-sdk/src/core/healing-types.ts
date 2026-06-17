import type { Locator, Page } from '@playwright/test';

export type {
  GeneratedLocatorQuery,
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingResult,
  LocatorSource,
  HealingActionType,
  DomElementSnapshot,
} from 'ai-healing-core';

/** Playwright-specific ordered fallback chain entry. */
export type LocatorStrategy = {
  name: string;
  resolve: (page: Page) => Locator;
  source?: import('ai-healing-core').LocatorSource;
};
