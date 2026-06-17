import { expect, test } from '@playwright/test';
import { composeDiscoveryStrategies, resolveDiscoveryStrategyNames } from '../core/discovery/compose-discoverers';
import { synthesizeCandidatesFromDomSnapshots } from '../core/discovery/dom-scan-discovery';
import type { DomElementSnapshot } from '../core/discovery/dom-scan-discovery';

test.describe('DOM scan discovery (unit)', () => {
  test('synthesizeCandidatesFromDomSnapshots prefers add-to-cart intent', () => {
    const snapshots: DomElementSnapshot[] = [
      {
        tag: 'button',
        text: 'Add to cart',
        disabled: false,
      },
      {
        tag: 'button',
        text: 'View details',
        disabled: false,
      },
    ];

    const candidates = synthesizeCandidatesFromDomSnapshots(snapshots, {
      actionType: 'click',
      attempts: [{ strategy: 'add-to-cart-miss-demo', ok: false, error: 'timeout add to cart' }],
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].strategyName.startsWith('domscan-')).toBe(true);
    expect(candidates[0].query.type).toBe('role');
    if (candidates[0].query.type === 'role') {
      expect(candidates[0].query.name).toMatch(/add to cart/i);
    }
    expect(candidates[0].score).toBeGreaterThan(
      candidates.find((c) => c.reason.includes('View details'))?.score ?? 0
    );
  });

  test('composeDiscoveryStrategies merges by query key and keeps highest score', async () => {
    const composed = composeDiscoveryStrategies([
      {
        name: 'a',
        discover: async () => [
          {
            strategyName: 'a-1',
            query: { type: 'role', role: 'button', name: 'Pay' },
            score: 50,
            reason: 'low',
          },
        ],
      },
      {
        name: 'b',
        discover: async () => [
          {
            strategyName: 'b-1',
            query: { type: 'role', role: 'button', name: 'Pay' },
            score: 90,
            reason: 'high',
          },
        ],
      },
    ]);

    const merged = await composed({
      page: { url: () => 'https://example.local/app' } as any,
      actionType: 'click',
      attempts: [],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(90);
    expect(merged[0].reason).toContain('[b]');
  });

  test('resolveDiscoveryStrategyNames defaults to seed + dom-scan', () => {
    const prev = process.env.AUTO_HEAL_DOM_SCAN;
    const prevStrategies = process.env.AUTO_HEAL_STRATEGIES;
    delete process.env.AUTO_HEAL_DOM_SCAN;
    delete process.env.AUTO_HEAL_STRATEGIES;

    expect(resolveDiscoveryStrategyNames()).toEqual(['seed', 'dom-scan']);

    process.env.AUTO_HEAL_DOM_SCAN = '0';
    expect(resolveDiscoveryStrategyNames()).toEqual(['seed']);

    process.env.AUTO_HEAL_DOM_SCAN = undefined;
    process.env.AUTO_HEAL_STRATEGIES = 'seed';
    expect(resolveDiscoveryStrategyNames()).toEqual(['seed']);

    if (prev !== undefined) process.env.AUTO_HEAL_DOM_SCAN = prev;
    else delete process.env.AUTO_HEAL_DOM_SCAN;
    if (prevStrategies !== undefined) process.env.AUTO_HEAL_STRATEGIES = prevStrategies;
    else delete process.env.AUTO_HEAL_STRATEGIES;
  });
});
