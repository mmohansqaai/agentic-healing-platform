import { expect, test } from '@playwright/test';
import { runAgentEngine } from 'ai-healing-sdk';
import type { HealingRequest } from 'ai-healing-sdk';

test.describe('agentic healing engine (unit)', () => {
  test('runAgentEngine proposes candidates via tools without LLM', async () => {
    const pageStub = {
      url: () => 'https://example.local/login',
      title: async () => 'Login',
      locator: (value: string) => ({
        first() {
          return { count: async () => (value.includes('email') ? 1 : 0) };
        },
      }),
      getByRole: () => ({
        first() {
          return { count: async () => 0 };
        },
      }),
    } as any;

    const request: HealingRequest = {
      framework: 'playwright',
      action: 'fill',
      failedLocator: 'broken-email',
      error: 'Timeout',
      url: 'https://example.local/login',
      failureHints: 'email fill timeout',
      domSnapshot: [
        { tag: 'input', role: 'textbox', text: '', placeholder: 'Email', disabled: false },
      ],
      agentContext: { iteration: 0, maxIterations: 3, agentMode: 'agentic' },
    };

    const result = await runAgentEngine({
      request,
      page: pageStub,
      actionType: 'fill',
      attempts: [{ strategy: 'broken-email', ok: false, error: 'Timeout' }],
    });

    expect(result.toolCalls.length).toBeGreaterThanOrEqual(2);
    expect(result.toolCalls.some((t) => t.name === 'list_heuristic_candidates')).toBe(true);
    expect(result.toolCalls.some((t) => t.name === 'search_dom')).toBe(true);
    expect(result.trace.agentId).toBe('agentic-healing-agent');
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  test('agent reflection excludes prior failed locators', async () => {
    const pageStub = {
      url: () => 'https://example.local/login',
      title: async () => 'Login',
      locator: () => ({
        first() {
          return { count: async () => 1 };
        },
      }),
      getByRole: () => ({
        first() {
          return { count: async () => 1 };
        },
      }),
    } as any;

    const request: HealingRequest = {
      framework: 'playwright',
      action: 'click',
      failedLocator: 'btn-miss',
      error: 'not found',
      url: 'https://example.local/login',
      failureHints: 'sign in button',
      domSnapshot: [{ tag: 'button', role: 'button', text: 'Sign in', disabled: false }],
      agentContext: {
        iteration: 1,
        maxIterations: 3,
        agentMode: 'agentic',
        priorValidationResults: [{ healedLocator: 'role=button[name="Sign in"]', ok: false, error: 'click failed' }],
      },
    };

    const result = await runAgentEngine({
      request,
      page: pageStub,
      actionType: 'click',
      attempts: [{ strategy: 'btn-miss', ok: false, error: 'not found' }],
    });

    const locators = result.candidates.map((c) =>
      c.query.type === 'css' ? c.query.value : `role=${c.query.role}[name="${c.query.name}"]`
    );
    expect(locators).not.toContain('role=button[name="Sign in"]');
  });
});
