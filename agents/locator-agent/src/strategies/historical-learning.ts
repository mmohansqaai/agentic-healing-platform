import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { queryKey } from 'ai-healing-sdk';
import type { GeneratedLocatorCandidate } from 'ai-healing-sdk';
import type { LocatorAgentContext } from '../types';

type HistoryEntry = { successes: number; failures: number };

type HistoryStore = Record<string, HistoryEntry>;

function historyKey(url: string, actionType: string, key: string): string {
  try {
    const pathname = new URL(url).pathname || '/';
    return `${pathname}|${actionType}|${key}`;
  } catch {
    return `${url}|${actionType}|${key}`;
  }
}

function readHistoryBoost(url: string, actionType: string, candidate: GeneratedLocatorCandidate): number {
  const historyPath = resolve(process.cwd(), '.self-healing-history.json');
  if (!existsSync(historyPath)) return 0;

  try {
    const store = JSON.parse(readFileSync(historyPath, 'utf8')) as HistoryStore;
    const key = historyKey(url, actionType, queryKey(candidate.query));
    const entry = store[key];
    if (!entry) return 0;
    return Math.max(0, entry.successes * 2 - entry.failures);
  } catch {
    return 0;
  }
}

/**
 * Strategy 5 — historical learning boost (file-based, same formula as SDK history).
 * No-op when history file is absent — preserves Phase 2 service behavior.
 */
export function applyHistoricalLearningBoost(
  ctx: LocatorAgentContext,
  candidates: GeneratedLocatorCandidate[]
): GeneratedLocatorCandidate[] {
  return candidates.map((c) => {
    const historyBoost = readHistoryBoost(ctx.url, ctx.actionType, c);
    if (historyBoost <= 0) return c;
    return {
      ...c,
      score: c.score + historyBoost,
      reason: `${c.reason}; historyBoost=${historyBoost}`,
    };
  });
}
