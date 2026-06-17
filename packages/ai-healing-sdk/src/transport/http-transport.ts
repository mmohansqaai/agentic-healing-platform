import type { Page } from '@playwright/test';
import type { GeneratedLocatorCandidate, HealingAttempt, HealingActionType } from '../core/healing-types';
import type { DiscovererFn } from './local-transport';
import type { HealingRequest, HealingResponse } from './contracts';
import { buildHealingRequest } from '../agent/build-healing-request';

export type HttpTransportOptions = {
  baseUrl: string;
  timeoutMs?: number;
  framework?: HealingRequest['framework'];
  /** Fall back to in-process discovery when the service is unreachable. */
  fallbackToLocal?: boolean;
  localDiscoverer?: DiscovererFn;
};

function resolveServiceUrl(): string | undefined {
  return process.env.HEALING_SERVICE_URL?.replace(/\/$/, '');
}

async function postHealRequest(baseUrl: string, body: HealingRequest, timeoutMs: number): Promise<HealingResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
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

function mapResponseToCandidates(response: HealingResponse): GeneratedLocatorCandidate[] {
  if (!response.candidates?.length) return [];

  return response.candidates.map((c) => ({
    strategyName: c.strategy,
    query: c.query,
    score: c.score,
    reason: `[agentic-service] ${c.reasoning}`,
  }));
}

/** HTTP discoverer — calls healing-service POST /heal. */
export function createHttpDiscoverer(options: HttpTransportOptions): DiscovererFn {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000);
  const framework = options.framework ?? 'playwright';

  return async ({ page, actionType, attempts }) => {
    const request = await buildHealingRequest(page, actionType, attempts, {
      framework,
      agentContext: { iteration: 0, maxIterations: 3, agentMode: 'agentic' },
    });

    try {
      const response = await postHealRequest(baseUrl, request, timeoutMs);
      if (response.status === 'error') {
        throw new Error(response.error ?? 'healing-service error');
      }
      return mapResponseToCandidates(response);
    } catch (error) {
      const shouldFallback =
        options.fallbackToLocal ??
        (process.env.HEALING_SERVICE_FALLBACK_LOCAL === '1' || process.env.HEALING_SERVICE_FALLBACK_LOCAL === 'true');

      if (shouldFallback && options.localDiscoverer) {
        return options.localDiscoverer({ page, actionType, attempts });
      }
      throw error;
    }
  };
}

export function isHealingServiceEnabled(): boolean {
  return Boolean(resolveServiceUrl());
}
