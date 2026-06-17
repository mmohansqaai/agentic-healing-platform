import type {
  DomElementSnapshot,
  GeneratedLocatorQuery,
  HealingActionType,
  TestFramework,
} from './types';

export type DriverClickOptions = {
  force?: boolean;
  timeoutMs?: number;
};

export type DriverFillOptions = {
  timeoutMs?: number;
};

export type DriverVisibleOptions = {
  timeoutMs?: number;
};

/**
 * Framework-agnostic browser driver for self-healing.
 * Playwright, Cypress, and Selenium adapters implement this interface.
 * Healing brain (agents, cloud) depends only on HealingDriver + contracts.
 */
export interface HealingDriver {
  readonly framework: TestFramework;

  url(): string;
  title(): Promise<string>;

  /** Capture structured DOM inventory for discovery / LLM context. */
  captureDomSnapshot(actionType: HealingActionType): Promise<DomElementSnapshot[]>;

  /** Number of elements matching the query (viability check). */
  count(query: GeneratedLocatorQuery): Promise<number>;

  click(query: GeneratedLocatorQuery, options?: DriverClickOptions): Promise<void>;
  fill(query: GeneratedLocatorQuery, value: string, options?: DriverFillOptions): Promise<void>;
  isVisible(query: GeneratedLocatorQuery, options?: DriverVisibleOptions): Promise<boolean>;
}
