/**
 * Standalone plug-and-play demo — imports ai-healing-sdk as an external npm package.
 * No dependency on the parent framework's core/ folder.
 */
import { expect, test } from '@playwright/test';
import {
  attachHealingSummary,
  clickHealing,
  enableHealing,
  fillHealing,
  healable,
  type LocatorStrategy,
} from 'ai-healing-sdk';

test.describe('ai-healing-sdk plug-and-play @plug-and-play', () => {
  test.beforeEach(async ({ page }) => {
    enableHealing(page, {
      healingEnabled: true,
      agentMode: 'agentic',
      persistenceEnabled: false,
      confidenceThreshold: 0.7,
      verboseLogs: true,
    });
  });

  test('healable API — customer login', async ({ page }, testInfo) => {
    await page.goto('/login');

    const email = await healable.fill(page.getByLabel(/email/i), 'test@demo.com');
    await attachHealingSummary(testInfo, 'healable-email', email);

    const password = await healable.fill(page.getByLabel(/password/i), 'password123');
    await attachHealingSummary(testInfo, 'healable-password', password);

    const submit = await healable.click(page.getByRole('button', { name: /sign in/i }));
    await attachHealingSummary(testInfo, 'healable-submit', submit);

    await expect(page).not.toHaveURL(/\/login\/?$/);
  });

  test('strategy API — same login via clickHealing/fillHealing', async ({ page }, testInfo) => {
    await page.goto('/login');

    const emailStrategies: LocatorStrategy[] = [
      { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
      { name: 'css-email', resolve: (p) => p.locator('input[type="email"]').first() },
    ];

    const email = await fillHealing(page, emailStrategies, 'test@demo.com', {
      autoHeal: { enabled: true, discoverOnly: true },
    });
    await attachHealingSummary(testInfo, 'strategy-email', email);

    const password = await fillHealing(
      page,
      [{ name: 'label-password', resolve: (p) => p.getByLabel(/password/i) }],
      'password123',
      { autoHeal: { enabled: true, discoverOnly: true } }
    );
    await attachHealingSummary(testInfo, 'strategy-password', password);

    const submit = await clickHealing(
      page,
      [{ name: 'btn-signin', resolve: (p) => p.getByRole('button', { name: /sign in/i }) }],
      { autoHeal: { enabled: true, discoverOnly: true } }
    );
    await attachHealingSummary(testInfo, 'strategy-submit', submit);

    await expect(page).not.toHaveURL(/\/login\/?$/);
  });
});
