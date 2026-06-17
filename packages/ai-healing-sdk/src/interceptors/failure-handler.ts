import type { HealingAttempt, LocatorStrategy } from '../core/healing-types';

export type FailureContext = {
  strategyName: string;
  error: unknown;
  source?: LocatorStrategy['source'];
};

/** Record a failed strategy attempt for healing audit trails. */
export function recordStrategyFailure(attempts: HealingAttempt[], ctx: FailureContext): void {
  attempts.push({
    strategy: ctx.strategyName,
    ok: false,
    error: ctx.error instanceof Error ? ctx.error.message : String(ctx.error),
    source: ctx.source,
  });
}

/** Build a human-readable summary when all strategies are exhausted. */
export function formatExhaustedStrategiesError(
  strategyCount: number,
  attempts: HealingAttempt[],
  lastError: unknown
): Error {
  const summary = attempts.map((a) => `${a.strategy}: ${a.error ?? 'unknown'}`).join('\n');
  return new Error(`Self-healing exhausted ${strategyCount} strategies.\n${summary}`, { cause: lastError });
}
