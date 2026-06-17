import { getHistoryWeight } from '../history';
import { queryKey, resolveQuery } from '../locator-query';
import type { GeneratedLocatorCandidate, GeneratedLocatorQuery } from '../healing-types';
import { failureHints, hasSignal } from './intent-hints';
import type { AutoHealContext, DiscoveryStrategy } from './types';

type SeedCandidate = {
  query: GeneratedLocatorQuery;
  reason: string;
  baseScore: number;
};

function buildSeedCandidates(ctx: AutoHealContext): SeedCandidate[] {
  const lastErrors = failureHints(ctx.attempts);
  const seeds: SeedCandidate[] = [];

  if (hasSignal(lastErrors, 'email', 'mail')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="email"], input[name*="email" i], input[id*="email" i]' },
      reason: 'email-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  if (hasSignal(lastErrors, 'password', 'pass')) {
    seeds.push({
      query: { type: 'css', value: 'input[type="password"], input[name*="password" i], input[id*="password" i]' },
      reason: 'password-like input from failed strategy hints',
      baseScore: 90,
    });
  }

  if (hasSignal(lastErrors, 'sign in', 'signin', 'login', 'submit')) {
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

  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'add to cart', 'add-to-cart', 'add item', 'add-item')) {
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

  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'checkout')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Checkout' },
      reason: 'cart checkout semantic fallback',
      baseScore: 92,
    });
  }

  if (ctx.actionType === 'click' && hasSignal(lastErrors, 'place order', 'pay')) {
    seeds.push({
      query: { type: 'role', role: 'button', name: 'Pay' },
      reason: 'payment semantic fallback',
      baseScore: 86,
    });
  }

  if (ctx.actionType === 'visible') {
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

function pagePathname(page: AutoHealContext['page']): string {
  try {
    return new URL(page.url()).pathname || '/';
  } catch {
    return '/';
  }
}

/** Strategy 2: rule-based seed discovery from failure hints (original auto-heal-discovery). */
export async function discoverFromSeedRules(ctx: AutoHealContext): Promise<GeneratedLocatorCandidate[]> {
  const pageUrl = pagePathname(ctx.page);
  const seeds = buildSeedCandidates(ctx);
  const out: GeneratedLocatorCandidate[] = [];

  for (const seed of seeds) {
    try {
      const loc = resolveQuery(ctx.page, seed.query);
      const count = await loc.count();
      if (count < 1) continue;

      const uniquenessBoost = count === 1 ? 10 : Math.max(0, 6 - count);
      const historyBoost = getHistoryWeight(pageUrl, ctx.actionType, queryKey(seed.query));
      const score = seed.baseScore + uniquenessBoost + historyBoost;

      out.push({
        strategyName: `seed-${seed.query.type}-${out.length + 1}`,
        query: seed.query,
        score,
        reason: `${seed.reason}; count=${count}; history=${historyBoost}`,
      });
    } catch {
      // best-effort
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 8);
}

export const seedDiscoveryStrategy: DiscoveryStrategy = {
  name: 'seed',
  discover: discoverFromSeedRules,
};
