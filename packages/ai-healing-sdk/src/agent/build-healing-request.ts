import type { Page } from '@playwright/test';
import { scanDomElements } from '../core/discovery/dom-scan-discovery';
import { failureHints } from '../core/discovery/intent-hints';
import type { HealingAttempt, HealingActionType } from '../core/healing-types';
import type { AgentHealContext, AgentValidationResult, HealingRequest } from '../transport/contracts';
import type { HealingDriver } from 'ai-healing-core';
import { createPlaywrightDriver } from '../driver/playwright-driver';

export async function buildHealingRequest(
  page: Page,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  options?: {
    framework?: HealingRequest['framework'];
    agentContext?: AgentHealContext;
    priorValidationResults?: AgentValidationResult[];
  }
): Promise<HealingRequest> {
  const driver = createPlaywrightDriver(page);
  return buildHealingRequestFromDriver(driver, actionType, attempts, options);
}

export async function buildHealingRequestFromDriver(
  driver: HealingDriver,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  options?: {
    framework?: HealingRequest['framework'];
    agentContext?: AgentHealContext;
    priorValidationResults?: AgentValidationResult[];
  }
): Promise<HealingRequest> {
  const domSnapshot =
    driver.framework === 'playwright'
      ? // Keep using existing scan implementation for Playwright
        // (driver.captureDomSnapshot delegates to it, but this preserves legacy import paths)
        await driver.captureDomSnapshot(actionType)
      : await driver.captureDomSnapshot(actionType);
  const hints = failureHints(attempts);
  const lastFailed = [...attempts].reverse().find((a) => !a.ok);

  let pageTitle: string | undefined;
  try {
    pageTitle = await driver.title();
  } catch {
    pageTitle = undefined;
  }

  const agentContext: AgentHealContext = {
    iteration: options?.agentContext?.iteration ?? 0,
    maxIterations: options?.agentContext?.maxIterations ?? 3,
    agentMode: 'agentic',
    priorValidationResults: options?.priorValidationResults ?? options?.agentContext?.priorValidationResults,
    testStepDescription: options?.agentContext?.testStepDescription,
  };

  return {
    framework: options?.framework ?? driver.framework,
    action: actionType,
    failedLocator: lastFailed?.strategy ?? 'unknown',
    error: lastFailed?.error ?? 'unknown failure',
    url: driver.url(),
    pageTitle,
    domSnapshot,
    failureHints: hints,
    agentContext,
  };
}
