import type { DomElementSnapshot } from '../discovery/dom-scan-discovery';
import { hasSignal } from '../discovery/intent-hints';
import type { GeneratedLocatorCandidate, GeneratedLocatorQuery, HealingActionType } from '../healing-types';

type SeedCandidate = {
  query: GeneratedLocatorQuery;
  reason: string;
  baseScore: number;
};

export function buildSeedCandidatesOffline(actionType: HealingActionType, failureHints: string): SeedCandidate[] {
  const hints = failureHints.toLowerCase();
  const seeds: SeedCandidate[] = [];

  if (hasSignal(hints, 'email', 'mail')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="email"], input[name*="email" i], input[id*="email" i]' },
      reason: 'email-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  if (hasSignal(hints, 'password', 'pass')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="password"], input[name*="password" i], input[id*="password" i]' },
      reason: 'password-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  if (hasSignal(hints, 'sign in', 'signin', 'login', 'submit')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Sign in' },
      reason: 'primary auth button semantic fallback',
      baseScore: 88,
    });
    seeds.push({
      query: { type: 'css', value: 'button[type="submit"], input[type="submit"]' },
      reason: 'submit control fallback',
      baseScore: 80,
    });
  }

  if (actionType === 'click' && hasSignal(hints, 'add to cart', 'add-to-cart', 'add item', 'add-item')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Add to cart' },
      reason: 'storefront add-to-cart semantic fallback',
      baseScore: 92,
    });
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Add item' },
      reason: 'storefront add-item semantic fallback',
      baseScore: 86,
    });
  }

  if (actionType === 'click' && hasSignal(hints, 'checkout')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Checkout' },
      reason: 'cart checkout semantic fallback',
      baseScore: 92,
    });
  }

  if (actionType === 'click' && hasSignal(hints, 'place order', 'pay')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Pay' },
      reason: 'payment semantic fallback',
      baseScore: 86,
    });
  }

  if (actionType === 'visible') {
    seeds.push({
      query: { type: 'role', role: 'heading', name: 'Sign in to your workspace' },
      reason: 'semantic heading fallback for visibility checks',
      baseScore: 84,
    });
  }

  seeds.push({
    query: { type: 'css', value: '[data-testid], [aria-label], button, input, a' },
    reason: 'broad structural fallback as last resort',
    baseScore: 10,
  });

  return seeds;
}

function elementLabel(el: DomElementSnapshot): string {
  return (el.ariaLabel || el.text || el.placeholder || el.name || '').trim().toLowerCase();
}

function snapshotMatchesQuery(query: GeneratedLocatorQuery, snapshots: DomElementSnapshot[]): number {
  if (!snapshots.length) return 1;

  let matches = 0;
  for (const el of snapshots) {
    if (query.type === 'role') {
      const label = elementLabel(el);
      const role =
        el.role ||
        (el.tag === 'button' ? 'button' : el.tag.startsWith('h') ? 'heading' : el.tag === 'a' ? 'link' : undefined);
      if (role === query.role && label.includes(query.name.toLowerCase())) matches += 1;
      continue;
    }

    const css = query.value.toLowerCase();
    if (css.includes('email') && el.inputType === 'email') matches += 1;
    else if (css.includes('password') && el.inputType === 'password') matches += 1;
    else if (css.includes('submit') && (el.inputType === 'submit' || el.tag === 'button')) matches += 1;
    else if (css.includes('data-testid') && el.testId) matches += 1;
    else if (css.includes('button') && (el.tag === 'button' || el.role === 'button')) matches += 1;
    else if (css.includes('input') && el.tag === 'input') matches += 1;
    else if (css.includes('aria-label') && el.ariaLabel) matches += 1;
  }

  return matches;
}

/** Seed discovery without a live browser — used by healing-service. */
export function discoverSeedCandidatesOffline(args: {
  actionType: HealingActionType;
  failureHints: string;
  domSnapshot?: DomElementSnapshot[];
}): GeneratedLocatorCandidate[] {
  const seeds = buildSeedCandidatesOffline(args.actionType, args.failureHints);
  const out: GeneratedLocatorCandidate[] = [];

  for (const seed of seeds) {
    const matchCount = snapshotMatchesQuery(seed.query, args.domSnapshot ?? []);
    const uniquenessBoost = matchCount === 1 ? 10 : matchCount > 1 ? Math.max(0, 6 - matchCount) : 0;
    if (matchCount < 1 && seed.baseScore > 20) continue;

    out.push({
      strategyName: `seed-${seed.query.type}-${out.length + 1}`,
      query: seed.query,
      score: seed.baseScore + uniquenessBoost,
      reason: `${seed.reason}; snapshotMatches=${matchCount}`,
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 8);
}
