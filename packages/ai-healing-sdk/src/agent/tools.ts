import type { DomElementSnapshot } from '../core/discovery/dom-scan-discovery';
import { synthesizeCandidatesFromDomSnapshots } from '../core/discovery/dom-scan-discovery';
import { createDefaultDiscoverer } from '../core/discovery/compose-discoverers';
import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import { discoverSeedCandidatesOffline } from '../core/locator-recovery/offline-seed-discovery';
import { queryKey } from '../core/locator-query';
import type { GeneratedLocatorCandidate, HealingAttempt, HealingActionType } from '../core/healing-types';
import type { Page } from '@playwright/test';
import { formatLocatorQuery } from '../transport/contracts';

export type SearchDomInput = {
  role?: string;
  tag?: string;
  textContains?: string;
};

/** Agent tool: filter DOM snapshot by role, tag, or text. */
export function searchDom(snapshot: DomElementSnapshot[] | undefined, input: SearchDomInput): DomElementSnapshot[] {
  if (!snapshot?.length) return [];

  return snapshot.filter((el) => {
    if (input.role && el.role !== input.role) return false;
    if (input.tag && el.tag !== input.tag) return false;
    if (input.textContains) {
      const needle = input.textContains.toLowerCase();
      const hay = `${el.text ?? ''} ${el.ariaLabel ?? ''} ${el.placeholder ?? ''}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

function mergeByQueryKey(candidates: GeneratedLocatorCandidate[]): GeneratedLocatorCandidate[] {
  const merged = new Map<string, GeneratedLocatorCandidate>();
  for (const c of candidates) {
    const key = queryKey(c.query);
    const existing = merged.get(key);
    if (!existing || c.score > existing.score) merged.set(key, c);
  }
  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}

/** Offline agent tool — seed + DOM synthesis without live page.evaluate. */
export function listHeuristicCandidatesOffline(args: {
  actionType: HealingActionType;
  attempts: HealingAttempt[];
  failureHints?: string;
  domSnapshot?: DomElementSnapshot[];
}): GeneratedLocatorCandidate[] {
  const hints = args.failureHints ?? args.attempts.map((a) => `${a.strategy} ${a.error ?? ''}`).join(' ');
  const seed = discoverSeedCandidatesOffline({
    actionType: args.actionType,
    failureHints: hints,
    domSnapshot: args.domSnapshot,
  });
  const dom = args.domSnapshot?.length
    ? synthesizeCandidatesFromDomSnapshots(args.domSnapshot, {
        actionType: args.actionType,
        attempts: args.attempts,
      })
    : [];

  return mergeByQueryKey([
    ...seed.map((c) => ({ ...c, reason: `[seed] ${c.reason}` })),
    ...dom.map((c) => ({ ...c, reason: `[dom-scan] ${c.reason}` })),
  ]).slice(0, 16);
}

/** Agent tool: run heuristic discovery strategies (seed + dom-scan). */
export async function listHeuristicCandidates(args: {
  page: Page;
  actionType: HealingActionType;
  attempts: HealingAttempt[];
  discoveryStrategies?: DiscoveryStrategyName[];
  domSnapshot?: DomElementSnapshot[];
  failureHints?: string;
}): Promise<GeneratedLocatorCandidate[]> {
  if (args.domSnapshot?.length) {
    return listHeuristicCandidatesOffline({
      actionType: args.actionType,
      attempts: args.attempts,
      failureHints: args.failureHints,
      domSnapshot: args.domSnapshot,
    });
  }

  const discover = createDefaultDiscoverer({
    strategies: args.discoveryStrategies,
  });
  return discover({ page: args.page, actionType: args.actionType, attempts: args.attempts });
}

export function inferDomSearchFromHints(hints: string | undefined): SearchDomInput {
  const h = (hints ?? '').toLowerCase();
  const input: SearchDomInput = {};

  if (/\b(button|click|submit|sign in|add to cart)\b/.test(h)) input.role = 'button';
  if (/\b(email|password|fill|input|textbox)\b/.test(h)) input.role = 'textbox';
  if (/\bemail\b/.test(h)) input.textContains = 'email';
  if (/\bpassword\b/.test(h)) input.textContains = 'password';
  if (/\bsign in\b/.test(h)) input.textContains = 'sign';
  if (/\badd to cart\b/.test(h)) input.textContains = 'cart';

  return input;
}

export function excludeFailedLocators(
  candidates: GeneratedLocatorCandidate[],
  failedLocators: Set<string>
): GeneratedLocatorCandidate[] {
  return candidates.filter((c) => !failedLocators.has(formatLocatorQuery(c.query)));
}
