import { expect, test } from '@playwright/test';
import { runLocatorAgent } from '../agents/locator-agent/src';
import type { HealingRequest } from 'ai-healing-sdk';

const sampleRequest: HealingRequest = {
  framework: 'playwright',
  action: 'click',
  failedLocator: 'add-to-cart-miss-demo',
  error: 'Timeout waiting for selector',
  url: 'https://retail.example/app/products',
  failureHints: 'add to cart timeout button missing',
  domSnapshot: [
    {
      tag: 'button',
      role: 'button',
      text: 'Add to cart',
      disabled: false,
    },
  ],
};

test.describe('locator-agent (unit)', () => {
  test('returns scored candidates with confidence and strategy contributions', () => {
    const result = runLocatorAgent(sampleRequest);

    expect(result.agent).toBe('locator-agent');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.best).toBeTruthy();
    expect(result.best!.confidence).toBeGreaterThan(0);
    expect(result.best!.contributions.length).toBeGreaterThan(0);
    expect(result.best!.contributions.some((c) => c.strategy === 'semantic_matching')).toBe(true);
  });

  test('POST /heal via healing-service uses locator-agent', async () => {
    const baseUrl = process.env.HEALING_SERVICE_URL ?? 'http://localhost:3921';
    const response = await fetch(`${baseUrl}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sampleRequest),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as {
      status: string;
      strategy?: string;
      confidence?: number;
      candidates?: { confidence: number; strategy: string }[];
    };

    expect(body.status).toBe('healed');
    expect(body.confidence).toBeGreaterThan(0);
    expect(body.candidates?.[0]?.confidence).toBeGreaterThan(0);
    expect(body.strategy).toMatch(/seed-|domscan-|a11y-/);
  });
});
