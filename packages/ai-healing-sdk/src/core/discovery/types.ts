import type { Page } from '@playwright/test';
import type { GeneratedLocatorCandidate, HealingAttempt } from '../healing-types';

export type AutoHealContext = {
  page: Page;
  actionType: 'click' | 'fill' | 'visible';
  attempts: HealingAttempt[];
};

/** Pluggable auto-heal discovery strategy (seed rules, DOM scan, custom). */
export type DiscoveryStrategy = {
  name: string;
  discover: (ctx: AutoHealContext) => Promise<GeneratedLocatorCandidate[]>;
};
