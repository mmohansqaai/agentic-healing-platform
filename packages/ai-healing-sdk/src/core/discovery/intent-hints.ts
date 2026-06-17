import type { HealingAttempt } from '../healing-types';

export function hasSignal(text: string, ...signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => t.includes(s.toLowerCase()));
}

/** Combined failure text from prior healing attempts (strategy names + errors). */
export function failureHints(attempts: HealingAttempt[]): string {
  return attempts.map((a) => [a.strategy, a.error ?? ''].join(' ')).join(' ').toLowerCase();
}
