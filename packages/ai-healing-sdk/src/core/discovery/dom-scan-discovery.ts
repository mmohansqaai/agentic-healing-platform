import type { Page } from '@playwright/test';

type AriaRole = Parameters<Page['getByRole']>[0];
import { getHistoryWeight } from '../history';
import { queryKey, resolveQuery } from '../locator-query';
import type { DomElementSnapshot, GeneratedLocatorCandidate, GeneratedLocatorQuery } from 'ai-healing-core';
import { failureHints, hasSignal } from './intent-hints';
import type { AutoHealContext, DiscoveryStrategy } from './types';

export type { DomElementSnapshot } from 'ai-healing-core';

const MAX_SCAN_ELEMENTS = 80;
const MAX_CANDIDATES = 12;

const CLICK_SELECTOR =
  'button, [role="button"], input[type="submit"], input[type="button"], a[href]:not([href=""])';
const FILL_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select';
const VISIBLE_SELECTOR = 'h1, h2, h3, h4, [role="heading"], [role="banner"]';

function pagePathname(page: Page): string {
  try {
    return new URL(page.url()).pathname || '/';
  } catch {
    return '/';
  }
}

function cssEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function inferRole(el: DomElementSnapshot): string | undefined {
  if (el.role) return el.role;
  if (el.tag === 'button' || el.inputType === 'submit' || el.inputType === 'button') return 'button';
  if (el.tag === 'a' && el.href) return 'link';
  if (el.tag === 'textarea' || el.tag === 'select' || el.tag === 'input') return 'textbox';
  if (el.tag.startsWith('h') && el.tag.length === 2) return 'heading';
  return undefined;
}

function elementLabel(el: DomElementSnapshot): string {
  return (el.ariaLabel || el.text || el.placeholder || el.name || '').trim().slice(0, 120);
}

function matchesActionType(el: DomElementSnapshot, actionType: AutoHealContext['actionType']): boolean {
  const role = inferRole(el);
  if (el.disabled) return false;
  if (actionType === 'click') {
    return (
      el.tag === 'button' ||
      el.tag === 'a' ||
      role === 'button' ||
      role === 'link' ||
      el.inputType === 'submit' ||
      el.inputType === 'button'
    );
  }
  if (actionType === 'fill') {
    return el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select';
  }
  return role === 'heading' || el.tag.startsWith('h');
}

function intentBoost(el: DomElementSnapshot, hints: string, actionType: AutoHealContext['actionType']): number {
  const label = elementLabel(el).toLowerCase();
  let boost = 0;

  if (hasSignal(hints, 'email', 'mail') && (el.inputType === 'email' || hasSignal(label, 'email'))) boost += 40;
  if (hasSignal(hints, 'password', 'pass') && el.inputType === 'password') boost += 40;
  if (
    actionType === 'click' &&
    hasSignal(hints, 'add to cart', 'add-to-cart', 'add item', 'add-item') &&
    hasSignal(label, 'add to cart', 'add item')
  ) {
    boost += 45;
  }
  if (actionType === 'click' && hasSignal(hints, 'checkout') && hasSignal(label, 'checkout')) boost += 45;
  if (actionType === 'click' && hasSignal(hints, 'sign in', 'signin', 'login', 'submit') && hasSignal(label, 'sign in', 'log in')) {
    boost += 35;
  }
  if (actionType === 'click' && hasSignal(hints, 'place order', 'pay') && hasSignal(label, 'pay', 'place order')) {
    boost += 35;
  }
  if (actionType === 'visible' && hasSignal(hints, 'products', 'sign in', 'workspace', 'heading')) {
    if (hasSignal(label, 'products', 'sign in', 'workspace')) boost += 30;
  }

  if (el.testId) boost += 8;
  if (el.id && !el.id.includes(' ')) boost += 5;
  return boost;
}

function buildQueriesForElement(el: DomElementSnapshot): GeneratedLocatorQuery[] {
  const queries: GeneratedLocatorQuery[] = [];
  const role = inferRole(el);
  const label = elementLabel(el);

  if (el.testId) {
    queries.push({ type: 'css', value: `[data-testid="${cssEscape(el.testId)}"]` });
  }
  if (el.id && !/\s/.test(el.id)) {
    queries.push({ type: 'css', value: `#${cssEscape(el.id)}` });
  }
  if (role && label.length >= 2 && label.length <= 80) {
    queries.push({
      type: 'role',
      role: role as AriaRole,
      name: label,
    });
  }
  if (el.name) {
    queries.push({ type: 'css', value: `${el.tag}[name="${cssEscape(el.name)}"]` });
  }
  if (el.placeholder) {
    queries.push({ type: 'css', value: `${el.tag}[placeholder="${cssEscape(el.placeholder)}"]` });
  }
  if (el.inputType && el.tag === 'input') {
    queries.push({ type: 'css', value: `input[type="${cssEscape(el.inputType)}"]` });
  }
  return queries;
}

/**
 * Pure synthesis: turn DOM snapshots into locator candidates (no live page validation).
 * Exported for unit tests.
 */
export function synthesizeCandidatesFromDomSnapshots(
  snapshots: DomElementSnapshot[],
  ctx: Pick<AutoHealContext, 'actionType' | 'attempts'>
): GeneratedLocatorCandidate[] {
  const hints = failureHints(ctx.attempts);
  const seen = new Set<string>();
  const out: GeneratedLocatorCandidate[] = [];

  for (const el of snapshots) {
    if (!matchesActionType(el, ctx.actionType)) continue;

    const queries = buildQueriesForElement(el);
    const intent = intentBoost(el, hints, ctx.actionType);

    for (const query of queries) {
      const key = queryKey(query);
      if (seen.has(key)) continue;
      seen.add(key);

      const baseScore = 55 + intent;
      const strategyName = `domscan-${query.type}-${out.length + 1}`;

      out.push({
        strategyName,
        query,
        score: baseScore,
        reason: `DOM scan: ${el.tag}${el.inputType ? `[${el.inputType}]` : ''} label="${elementLabel(el)}"; intent=${intent}`,
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, MAX_CANDIDATES);
}

/** In-browser inventory: visible interactive elements for the action type. */
export async function scanDomElements(
  page: Page,
  actionType: AutoHealContext['actionType']
): Promise<DomElementSnapshot[]> {
  const selector =
    actionType === 'click' ? CLICK_SELECTOR : actionType === 'fill' ? FILL_SELECTOR : VISIBLE_SELECTOR;

  return page.evaluate(
    ({ selector, max }) => {
      const isVisible = (node: Element): boolean => {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const textOf = (node: Element): string => {
        const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        return t.slice(0, 120);
      };

      const nodes = Array.from(document.querySelectorAll(selector));
      const out: Array<{
        tag: string;
        inputType?: string;
        id?: string;
        name?: string;
        testId?: string;
        role?: string;
        ariaLabel?: string;
        placeholder?: string;
        text?: string;
        href?: string;
        disabled: boolean;
      }> = [];

      for (const node of nodes) {
        if (out.length >= max) break;
        if (!(node instanceof HTMLElement)) continue;
        if (!isVisible(node)) continue;

        const input = node instanceof HTMLInputElement ? node : null;
        const anchor = node instanceof HTMLAnchorElement ? node : null;

        out.push({
          tag: node.tagName.toLowerCase(),
          inputType: input?.type || undefined,
          id: node.id || undefined,
          name: node.getAttribute('name') || undefined,
          testId: node.getAttribute('data-testid') || undefined,
          role: node.getAttribute('role') || undefined,
          ariaLabel: node.getAttribute('aria-label') || undefined,
          placeholder: input?.placeholder || undefined,
          text: textOf(node) || undefined,
          href: anchor?.getAttribute('href') || undefined,
          disabled: Boolean(input?.disabled || node.getAttribute('aria-disabled') === 'true'),
        });
      }

      return out;
    },
    { selector, max: MAX_SCAN_ELEMENTS }
  );
}

async function validateCandidates(
  page: Page,
  candidates: GeneratedLocatorCandidate[],
  actionType: AutoHealContext['actionType'],
  pageUrl: string
): Promise<GeneratedLocatorCandidate[]> {
  const validated: GeneratedLocatorCandidate[] = [];

  for (const candidate of candidates) {
    try {
      const loc = resolveQuery(page, candidate.query);
      const count = await loc.count();
      if (count < 1) continue;

      const uniquenessBoost = count === 1 ? 12 : Math.max(0, 8 - count);
      const historyBoost = getHistoryWeight(pageUrl, actionType, queryKey(candidate.query));

      validated.push({
        ...candidate,
        score: candidate.score + uniquenessBoost + historyBoost,
        reason: `${candidate.reason}; count=${count}; uniqueness=${uniquenessBoost}`,
      });
    } catch {
      // skip invalid query on this page
    }
  }

  validated.sort((a, b) => b.score - a.score);
  return validated.slice(0, MAX_CANDIDATES);
}

/** Strategy 3: full DOM inventory + locator synthesis + live uniqueness check. */
export async function discoverFromDomScan(ctx: AutoHealContext): Promise<GeneratedLocatorCandidate[]> {
  const snapshots = await scanDomElements(ctx.page, ctx.actionType);
  const pageUrl = pagePathname(ctx.page);
  const synthesized = synthesizeCandidatesFromDomSnapshots(snapshots, ctx);
  return validateCandidates(ctx.page, synthesized, ctx.actionType, pageUrl);
}

export const domScanDiscoveryStrategy: DiscoveryStrategy = {
  name: 'dom-scan',
  discover: discoverFromDomScan,
};
