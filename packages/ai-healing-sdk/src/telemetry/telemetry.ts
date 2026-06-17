import type { AgentTrace } from '../transport/contracts';
import type { HealingResult } from '../core/healing-types';

export type TelemetryEvent =
  | { type: 'healing.start'; action: string; url: string }
  | { type: 'healing.static_success'; strategy: string }
  | { type: 'healing.auto_heal_success'; strategy: string; score?: number }
  | { type: 'healing.failure'; attempts: number }
  | { type: 'healing.complete'; result: HealingResult<unknown> }
  | { type: 'agent.iteration_start'; iteration: number; maxIterations: number }
  | { type: 'agent.no_candidates'; iteration: number }
  | { type: 'agent.iteration_reflect'; iteration: number; failedCount: number }
  | { type: 'agent.heal_success'; iteration: number; strategy: string; traces: AgentTrace[] };

type TelemetryListener = (event: TelemetryEvent) => void;

const listeners = new Set<TelemetryListener>();

export function onTelemetry(listener: TelemetryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTelemetry(event: TelemetryEvent, enabled = true, verbose = false): void {
  if (!enabled) return;
  for (const listener of listeners) {
    listener(event);
  }
  if (verbose) {
    // eslint-disable-next-line no-console
    console.info(`[ai-healing-sdk] ${event.type}`, event);
  }
}
