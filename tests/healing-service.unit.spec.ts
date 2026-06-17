import { expect, test } from '@playwright/test';
import type { HealingRequest } from 'ai-healing-sdk';

test.describe('healing-service contract (unit)', () => {
  test('POST /heal returns healed candidates for add-to-cart hints', async () => {
    const baseUrl = process.env.HEALING_SERVICE_URL ?? 'http://localhost:3921';
    const request: HealingRequest = {
      framework: 'playwright',
      action: 'click',
      failedLocator: 'add-to-cart-miss-demo',
      error: 'Timeout waiting for selector button[data-demo-miss]',
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

    const response = await fetch(`${baseUrl}/heal`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });

    expect(response.ok).toBe(true);
    const body = (await response.json()) as {
      status: string;
      candidates?: { strategy: string; confidence: number }[];
    };
    expect(body.status).toBe('healed');
    expect(body.candidates?.length).toBeGreaterThan(0);
  });
});
