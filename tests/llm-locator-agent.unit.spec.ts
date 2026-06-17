import { expect, test } from '@playwright/test';
import type { HealingRequest } from 'ai-healing-sdk';
import { runLlmLocatorAgent, resetLlmClientCache } from 'llm-locator-agent';

test.describe('llm-locator-agent (unit)', () => {
  test.beforeEach(() => {
    resetLlmClientCache();
    process.env.HEALING_LLM_PROVIDER = 'mock';
  });

  test('returns LLM proposals for add-to-cart failure context', async () => {
    const request: HealingRequest = {
      framework: 'playwright',
      action: 'click',
      failedLocator: 'add-to-cart-miss',
      error: 'Timeout waiting for selector',
      url: 'https://retail.example/app/products',
      failureHints: 'add to cart timeout button missing',
      domSnapshot: [{ tag: 'button', role: 'button', text: 'Add to cart', disabled: false }],
      agentContext: { iteration: 0, maxIterations: 3, agentMode: 'agentic' },
    };

    const result = await runLlmLocatorAgent(request);

    expect(result.agent).toBe('llm-locator-agent');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.toolCalls.some((t) => t.name === 'list_heuristic_candidates')).toBe(true);
    expect(result.model).toContain('mock');
  });
});
