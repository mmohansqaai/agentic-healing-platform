import type { Locator, Page } from '@playwright/test';
import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import { generatedQueryKey, generatedQueryToLocatorFactory } from '../core/locator-query';
import { recordHistoryOutcome } from '../core/history';
import { persistGeneratedLocator } from '../core/persistence';
import type {
  GeneratedLocatorCandidate,
  HealingAttempt,
  HealingResult,
  LocatorStrategy,
  HealingActionType,
} from '../core/healing-types';
import type { AgentTrace, AgentValidationResult, HealingResponse } from '../transport/contracts';
import { formatLocatorQuery } from '../transport/contracts';
import type { DiscovererFn } from '../transport/local-transport';
import { createHttpDiscoverer, isHealingServiceEnabled } from '../transport/http-transport';
import { createLocalDiscoverer } from '../transport/local-transport';
import { buildHealingRequestFromDriver } from './build-healing-request';
import { agentCandidatesToResponse, runAgentEngine } from './agent-engine';
import { emitTelemetry } from '../telemetry/telemetry';
import { createPlaywrightDriver } from '../driver/playwright-driver';

export type AgentLoopOptions = {
  maxIterations?: number;
  minConfidence?: number;
  discoverOnly?: boolean;
  validationPasses?: number;
  discoveryStrategies?: DiscoveryStrategyName[];
  discoverer?: DiscovererFn;
  persistTarget?: { filePath: string; methodName: string };
  telemetryEnabled?: boolean;
  verboseLogs?: boolean;
  healingServiceUrl?: string;
};

async function scoreCandidateViability(page: Page, candidate: GeneratedLocatorCandidate): Promise<number> {
  try {
    const driver = createPlaywrightDriver(page);
    const count = await driver.count(candidate.query);
    if (count < 1) return -1000;
    return count === 1 ? 10 : Math.max(0, 6 - count);
  } catch {
    return -1000;
  }
}

async function fetchAgentCandidatesRemote(
  page: Page,
  actionType: HealingActionType,
  attempts: HealingAttempt[],
  iteration: number,
  maxIterations: number,
  priorValidation: AgentValidationResult[],
  options: AgentLoopOptions
): Promise<{ candidates: GeneratedLocatorCandidate[]; traces: AgentTrace[] }> {
  const baseUrl = (options.healingServiceUrl ?? process.env.HEALING_SERVICE_URL ?? '').replace(/\/$/, '');
  const timeoutMs = Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000);
  const driver = createPlaywrightDriver(page);
  const request = await buildHealingRequestFromDriver(driver, actionType, attempts, {
    agentContext: { iteration, maxIterations, agentMode: 'agentic', priorValidationResults: priorValidation },
    priorValidationResults: priorValidation,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    const payload = (await response.json()) as HealingResponse;
    if (!response.ok || payload.status === 'error') {
      throw new Error(payload.error ?? `healing-service responded with ${response.status}`);
    }
    const candidates: GeneratedLocatorCandidate[] = (payload.candidates ?? []).map((c) => ({
      strategyName: c.strategy,
      query: c.query,
      score: c.score,
      reason: `[agentic-service] ${c.reasoning}`,
    }));
    return { candidates, traces: payload.agentTrace ?? [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pure agentic healing loop: observe → reason (tools) → act (validate) → reflect → retry.
 */
export async function runAgenticHealingLoop<T>(
  page: Page,
  strategies: LocatorStrategy[],
  action: (locator: Locator) => Promise<T>,
  attempts: HealingAttempt[],
  actionType: HealingActionType,
  options: AgentLoopOptions
): Promise<HealingResult<T>> {
  const maxIterations = options.maxIterations ?? Number(process.env.HEALING_AGENT_MAX_ITERATIONS || 3);
  const minConfidence = options.minConfidence ?? 70;
  const priorValidation: AgentValidationResult[] = [];
  const allTraces: AgentTrace[] = [];
  const allCandidates: GeneratedLocatorCandidate[] = [];
  let lastError: unknown;

  const useRemote = Boolean(options.healingServiceUrl ?? isHealingServiceEnabled());
  const driver = createPlaywrightDriver(page);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    emitTelemetry(
      { type: 'agent.iteration_start', iteration, maxIterations },
      options.telemetryEnabled ?? true,
      options.verboseLogs ?? false
    );

    let rawCandidates: GeneratedLocatorCandidate[] = [];
    if (options.discoverer) {
      rawCandidates = await options.discoverer({ page, actionType, attempts });
    } else if (useRemote) {
      const remote = await fetchAgentCandidatesRemote(
        page,
        actionType,
        attempts,
        iteration,
        maxIterations,
        priorValidation,
        options
      );
      rawCandidates = remote.candidates;
      allTraces.push(...remote.traces);
    } else {
      const request = await buildHealingRequestFromDriver(driver, actionType, attempts, {
        agentContext: { iteration, maxIterations, agentMode: 'agentic', priorValidationResults: priorValidation },
        priorValidationResults: priorValidation,
      });
      const engine = await runAgentEngine({ request, page, actionType, attempts, discoveryStrategies: options.discoveryStrategies });
      rawCandidates = engine.candidates;
      allTraces.push(engine.trace);
    }

    const candidates: GeneratedLocatorCandidate[] = [];
    for (const c of rawCandidates) {
      const bonus = await scoreCandidateViability(page, c);
      if (bonus < -100) continue;
      candidates.push({ ...c, score: c.score + bonus });
    }
    candidates.sort((a, b) => b.score - a.score);
    allCandidates.push(...candidates);

    if (!candidates.length) {
      emitTelemetry(
        { type: 'agent.no_candidates', iteration },
        options.telemetryEnabled ?? true,
        options.verboseLogs ?? false
      );
      continue;
    }

    for (const candidate of candidates) {
      const healedLocator = formatLocatorQuery(candidate.query);
      const locator = generatedQueryToLocatorFactory(candidate.query)(page);
      try {
        const value = await action(locator);
        attempts.push({
          strategy: candidate.strategyName,
          ok: true,
          autogenerated: true,
          score: candidate.score,
          reason: candidate.reason,
          query: candidate.query,
        });
        recordHistoryOutcome(driver.url(), actionType, generatedQueryKey(candidate.query), true);

        const result: HealingResult<T> = {
          value,
          usedStrategy: candidate.strategyName,
          attempts,
          autoHeal: {
            usedAutoGenerated: true,
            selectedCandidate: candidate,
            candidates: allCandidates,
          },
        };

        const canPersist =
          !options.discoverOnly &&
          Boolean(options.persistTarget || attempts.find((a) => a.source?.filePath && a.source?.methodName)?.source) &&
          candidate.score >= minConfidence;
        const inferredTarget = attempts.find((a) => a.source?.filePath && a.source?.methodName)?.source;
        if (canPersist && (options.persistTarget || inferredTarget)) {
          const persisted = persistGeneratedLocator({
            target:
              options.persistTarget ??
              ({ filePath: inferredTarget!.filePath!, methodName: inferredTarget!.methodName! }),
            candidate,
            minConfidence,
            validationPasses: options.validationPasses ?? 2,
          });
          if (persisted.ok && result.autoHeal) {
            result.autoHeal.persisted = {
              filePath: persisted.filePath,
              methodName: persisted.methodName,
              strategyName: persisted.strategyName,
            };
          }
        }

        emitTelemetry(
          { type: 'agent.heal_success', iteration, strategy: candidate.strategyName, traces: allTraces },
          options.telemetryEnabled ?? true,
          options.verboseLogs ?? false
        );
        return result;
      } catch (e) {
        lastError = e;
        const errorMsg = e instanceof Error ? e.message : String(e);
        attempts.push({
          strategy: candidate.strategyName,
          ok: false,
          error: errorMsg,
          autogenerated: true,
          score: candidate.score,
          reason: candidate.reason,
          query: candidate.query,
        });
        priorValidation.push({ healedLocator, ok: false, error: errorMsg });
        recordHistoryOutcome(driver.url(), actionType, generatedQueryKey(candidate.query), false);
      }
    }

    emitTelemetry(
      { type: 'agent.iteration_reflect', iteration, failedCount: priorValidation.length },
      options.telemetryEnabled ?? true,
      options.verboseLogs ?? false
    );
  }

  const err = new Error(
    `Agentic healing exhausted after ${maxIterations} iteration(s). ` +
      `Static strategies: ${strategies.length}. Agent traces: ${allTraces.length}. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown')}`
  );
  (err as Error & { agentTraces?: AgentTrace[] }).agentTraces = allTraces;
  throw err;
}

/** DiscovererFn adapter — single agent iteration for legacy discoverer injection points. */
export function createAgentDiscoverer(options?: AgentLoopOptions): DiscovererFn {
  return async ({ page, actionType, attempts }) => {
    const request = await buildHealingRequestFromDriver(createPlaywrightDriver(page), actionType, attempts, {
      agentContext: { iteration: 0, maxIterations: 1, agentMode: 'agentic' },
    });
    const engine = await runAgentEngine({
      request,
      page,
      actionType,
      attempts,
      discoveryStrategies: options?.discoveryStrategies,
    });
    return engine.candidates;
  };
}

export function resolveAgentDiscoverer(options?: AgentLoopOptions): DiscovererFn {
  if (options?.discoverer) return options.discoverer;
  const serviceUrl = options?.healingServiceUrl ?? process.env.HEALING_SERVICE_URL;
  if (serviceUrl || isHealingServiceEnabled()) {
    const local = createLocalDiscoverer({ discoveryStrategies: options?.discoveryStrategies });
    return createHttpDiscoverer({
      baseUrl: (serviceUrl ?? process.env.HEALING_SERVICE_URL)!.replace(/\/$/, ''),
      localDiscoverer: createAgentDiscoverer(options),
      fallbackToLocal: process.env.HEALING_SERVICE_FALLBACK_LOCAL === '1',
    });
  }
  return createAgentDiscoverer(options);
}

export { agentCandidatesToResponse };
