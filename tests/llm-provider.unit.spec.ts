import { expect, test } from '@playwright/test';
import { parseLocatorProposals } from 'llm-provider';
import { MockLlmClient } from 'llm-provider';

test.describe('llm-provider (unit)', () => {
  test('parseLocatorProposals validates role and css queries', () => {
    const parsed = parseLocatorProposals({
      candidates: [
        { query: { type: 'role', role: 'button', name: 'Sign in' }, confidence: 0.9, reasoning: 'auth button' },
        { query: { type: 'css', value: 'input[type="email"]' }, confidence: 0.8, reasoning: 'email field' },
        { query: { type: 'role', role: 'invalid', name: 'x' }, confidence: 0.5, reasoning: 'bad role' },
      ],
    });

    expect(parsed).toHaveLength(2);
    expect(parsed[0].query.type).toBe('role');
    expect(parsed[1].query.type).toBe('css');
  });

  test('MockLlmClient proposes locators from heuristic context', async () => {
    const client = new MockLlmClient();
    const result = await client.proposeLocators({
      action: 'click',
      failedLocator: 'btn-miss',
      error: 'timeout',
      url: 'https://example.com/login',
      failureHints: 'sign in button timeout',
      domSnapshot: [{ tag: 'button', role: 'button', text: 'Sign in', disabled: false }],
      heuristicCandidates: [
        { healedLocator: 'role=button[name="Sign in"]', score: 88, reason: 'seed rule' },
      ],
    });

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.model).toBe('mock-llm-v1');
  });
});
