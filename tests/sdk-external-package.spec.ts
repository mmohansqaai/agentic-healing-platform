import { expect, test } from '@playwright/test';
import {
  clickHealing,
  createDefaultDiscoverer,
  enableHealing,
  healable,
  resolveDefaultDiscoverer,
  withHealingPage,
  type LocatorStrategy,
} from 'ai-healing-sdk';

test.describe('framework consumes ai-healing-sdk as external package', () => {
  test('package exports are resolvable from node_modules', () => {
    expect(typeof enableHealing).toBe('function');
    expect(typeof healable.click).toBe('function');
    expect(typeof clickHealing).toBe('function');
    expect(typeof createDefaultDiscoverer).toBe('function');
    expect(typeof resolveDefaultDiscoverer).toBe('function');
  });

  test('core shim re-exports clickHealing from package', async () => {
    const { clickHealing: fromCore } = await import('../core/self-healing');
    expect(typeof fromCore).toBe('function');
    expect(clickHealing.name).toBe(fromCore.name);
  });

  test('strategy healing still works via package import', async () => {
    const pageStub = {
      url: () => 'https://example.local/',
      locator: () => ({ first: () => ({ count: async () => 0 }) }),
      getByRole: () => ({ first: () => ({ count: async () => 0 }) }),
    } as any;

    const strategies: LocatorStrategy[] = [
      { name: 'works', resolve: () => ({ first: async () => 'ok' } as any) },
    ];

    const result = await withHealingPage(pageStub, strategies, async (loc: any) => loc.first());
    expect(result.usedStrategy).toBe('works');
  });
});
