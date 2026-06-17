import type {
  GeneratedLocatorCandidate,
  GeneratedLocatorQuery,
  HealingAttempt,
  HealingRequest,
  HealingResponse,
  HealingResult,
} from 'ai-healing-core';
import { formatLocatorQuery } from 'ai-healing-core';
import { getActiveWebDriver, getSeleniumHealingConfig } from './config';
import { createSeleniumDriver, SeleniumHealingDriver } from './selenium-driver';

type QueryInput = GeneratedLocatorQuery | string;

export type HealableClickOptions = {
  force?: boolean;
  timeoutPerStrategyMs?: number;
};

export type HealableFillOptions = {
  timeoutPerStrategyMs?: number;
};

export type HealableVisibleOptions = {
  timeoutPerStrategyMs?: number;
};

function normalizeQuery(query: QueryInput): GeneratedLocatorQuery {
  if (typeof query === 'string') {
    return { type: 'css', value: query };
  }
  return query;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function postHealRequest(
  baseUrl: string,
  request: HealingRequest,
  timeoutMs: number
): Promise<HealingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const payload = (await response.json()) as HealingResponse;
    if (!response.ok) {
      return {
        status: 'error',
        error: payload.error ?? `healing-service responded with ${response.status}`,
      };
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function sortCandidates(candidates: GeneratedLocatorCandidate[]): GeneratedLocatorCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}

async function resolveCandidates(
  driver: SeleniumHealingDriver,
  action: 'click' | 'fill' | 'visible',
  attempts: HealingAttempt[]
): Promise<GeneratedLocatorCandidate[]> {
  const config = getSeleniumHealingConfig();
  const serviceUrl = config.healingServiceUrl?.replace(/\/$/, '');
  if (!serviceUrl) return [];

  const pageTitle = await driver.title().catch(() => undefined);
  const domSnapshot = await driver.captureDomSnapshot(action).catch(() => []);
  const url = await driver.urlAsync().catch(() => driver.url());

  const request: HealingRequest = {
    framework: config.framework,
    action,
    failedLocator: attempts[attempts.length - 1]?.strategy ?? 'primary',
    error: attempts[attempts.length - 1]?.error ?? 'primary locator failed',
    url,
    pageTitle,
    domSnapshot,
  };

  const response = await postHealRequest(serviceUrl, request, config.timeoutPerStrategyMs);
  if (response.status !== 'healed' || !response.candidates?.length) return [];

  const mapped: GeneratedLocatorCandidate[] = response.candidates.map((c) => ({
    strategyName: c.strategy,
    query: c.query,
    score: c.score,
    reason: `[agentic-service] ${c.reasoning}`,
  }));
  return sortCandidates(mapped).slice(0, config.maxCandidates);
}

async function performClick(
  driver: SeleniumHealingDriver,
  query: GeneratedLocatorQuery,
  options?: HealableClickOptions
): Promise<void> {
  await driver.click(query, { timeoutMs: options?.timeoutPerStrategyMs, force: options?.force });
}

async function performFill(
  driver: SeleniumHealingDriver,
  query: GeneratedLocatorQuery,
  value: string,
  options?: HealableFillOptions
): Promise<void> {
  await driver.fill(query, value, { timeoutMs: options?.timeoutPerStrategyMs });
}

async function performVisible(
  driver: SeleniumHealingDriver,
  query: GeneratedLocatorQuery,
  options?: HealableVisibleOptions
): Promise<void> {
  const visible = await driver.isVisible(query, { timeoutMs: options?.timeoutPerStrategyMs });
  if (!visible) {
    throw new Error(`Locator not visible: ${formatLocatorQuery(query)}`);
  }
}

function directSuccess<T>(value: T): HealingResult<T> {
  return { value, usedStrategy: 'direct', attempts: [{ strategy: 'direct', ok: true }] };
}

async function withHealing<T>(
  actionType: 'click' | 'fill' | 'visible',
  primaryInput: QueryInput,
  action: (query: GeneratedLocatorQuery) => Promise<T>
): Promise<HealingResult<T>> {
  const config = getSeleniumHealingConfig();
  const driver = createSeleniumDriver(getActiveWebDriver());
  const primary = normalizeQuery(primaryInput);
  const attempts: HealingAttempt[] = [];

  try {
    const value = await action(primary);
    return directSuccess(value);
  } catch (error) {
    attempts.push({ strategy: formatLocatorQuery(primary), ok: false, error: errorMessage(error), query: primary });
  }

  if (!config.healingEnabled) {
    throw new Error(`Healing disabled and primary failed: ${attempts[0]?.error ?? 'unknown error'}`);
  }

  const candidates = await resolveCandidates(driver, actionType, attempts);
  for (const candidate of candidates) {
    try {
      const value = await action(candidate.query);
      attempts.push({
        strategy: candidate.strategyName,
        ok: true,
        autogenerated: true,
        score: candidate.score,
        reason: candidate.reason,
        query: candidate.query,
      });
      return {
        value,
        usedStrategy: candidate.strategyName,
        attempts,
        autoHeal: {
          usedAutoGenerated: true,
          selectedCandidate: candidate,
          candidates,
        },
      };
    } catch (error) {
      attempts.push({
        strategy: candidate.strategyName,
        ok: false,
        error: errorMessage(error),
        autogenerated: true,
        score: candidate.score,
        reason: candidate.reason,
        query: candidate.query,
      });
    }
  }

  throw new Error(
    `Healing exhausted for ${actionType}. Last error: ${attempts[attempts.length - 1]?.error ?? 'unknown'}`
  );
}

export const healable = {
  async click(query: QueryInput, options?: HealableClickOptions): Promise<HealingResult<void>> {
    const driver = createSeleniumDriver(getActiveWebDriver());
    return withHealing('click', query, (q) => performClick(driver, q, options));
  },

  async fill(query: QueryInput, value: string, options?: HealableFillOptions): Promise<HealingResult<void>> {
    const driver = createSeleniumDriver(getActiveWebDriver());
    return withHealing('fill', query, (q) => performFill(driver, q, value, options));
  },

  async expectVisible(query: QueryInput, options?: HealableVisibleOptions): Promise<HealingResult<void>> {
    const driver = createSeleniumDriver(getActiveWebDriver());
    return withHealing('visible', query, (q) => performVisible(driver, q, options));
  },
};

export type HealableApi = typeof healable;
