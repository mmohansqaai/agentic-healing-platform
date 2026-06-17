import type { HealingRequest, HealingResponse } from 'ai-healing-sdk';

export type HealingServiceEvent =
  | { type: 'heal.request'; url: string; action: string; framework: string; agentMode?: string; iteration?: number }
  | { type: 'heal.response'; status: string; candidateCount: number; durationMs: number }
  | { type: 'heal.cache_hit'; url: string }
  | { type: 'heal.error'; message: string };

export function logHealingEvent(event: HealingServiceEvent): void {
  if (process.env.HEALING_SERVICE_VERBOSE !== '1') return;
  // eslint-disable-next-line no-console
  console.info('[healing-service]', event.type, event);
}

export function logHealCycle(request: HealingRequest, response: HealingResponse, durationMs: number): void {
  logHealingEvent({
    type: 'heal.response',
    status: response.status,
    candidateCount: response.candidates?.length ?? 0,
    durationMs,
  });
  if (process.env.HEALING_SERVICE_VERBOSE === '1') {
    // eslint-disable-next-line no-console
    console.info('[healing-service] heal', {
      url: request.url,
      action: request.action,
      status: response.status,
      best: response.healedLocator,
      confidence: response.confidence,
    });
  }
}
