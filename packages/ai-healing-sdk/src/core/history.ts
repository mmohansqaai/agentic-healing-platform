import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type HistoryEntry = {
  successes: number;
  failures: number;
  lastUsedAt: string;
};

type HistoryStore = Record<string, HistoryEntry>;

const HISTORY_PATH = resolve(process.cwd(), '.self-healing-history.json');

function keyOf(pageUrl: string, actionType: string, queryKey: string): string {
  return `${pageUrl}|${actionType}|${queryKey}`;
}

function readStore(): HistoryStore {
  if (!existsSync(HISTORY_PATH)) return {};
  try {
    const parsed = JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) as HistoryStore;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeStore(store: HistoryStore): void {
  writeFileSync(HISTORY_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export function getHistoryWeight(pageUrl: string, actionType: string, queryKey: string): number {
  const store = readStore();
  const entry = store[keyOf(pageUrl, actionType, queryKey)];
  if (!entry) return 0;
  return Math.max(0, entry.successes * 2 - entry.failures);
}

export function recordHistoryOutcome(
  pageUrl: string,
  actionType: string,
  queryKey: string,
  ok: boolean
): void {
  const store = readStore();
  const key = keyOf(pageUrl, actionType, queryKey);
  const existing = store[key] ?? { successes: 0, failures: 0, lastUsedAt: new Date(0).toISOString() };
  const next: HistoryEntry = {
    successes: existing.successes + (ok ? 1 : 0),
    failures: existing.failures + (ok ? 0 : 1),
    lastUsedAt: new Date().toISOString(),
  };
  store[key] = next;
  writeStore(store);
}

export function historyFilePath(): string {
  return HISTORY_PATH;
}
