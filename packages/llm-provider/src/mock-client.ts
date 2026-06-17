import { formatLocatorQuery } from 'ai-healing-sdk';
import type { LlmClient, LlmProposeContext, LlmProposeResult } from './types';

/**
 * Mock LLM — re-ranks heuristic tool output as structured proposals.
 * Enables LLM agent path in CI without API keys.
 */
export class MockLlmClient implements LlmClient {
  readonly provider = 'mock' as const;

  async proposeLocators(context: LlmProposeContext): Promise<LlmProposeResult> {
    const failed = new Set(context.priorFailedLocators ?? []);
    const fromHeuristics = (context.heuristicCandidates ?? [])
      .filter((c) => !failed.has(c.healedLocator))
      .slice(0, 5);

    const fromDom = (context.domSearchMatches ?? []).slice(0, 3).map((el, idx) => {
      const name = (el.text || el.ariaLabel || el.placeholder || '').trim();
      if (el.role === 'button' && name) {
        return {
          query: { type: 'role' as const, role: 'button' as const, name },
          confidence: 0.82 - idx * 0.05,
          reasoning: `Mock LLM: button "${name}" matches DOM search for ${context.action}`,
        };
      }
      if (el.tag === 'input' && el.inputType === 'email') {
        return {
          query: { type: 'css' as const, value: 'input[type="email"]' },
          confidence: 0.8,
          reasoning: 'Mock LLM: email input from DOM search',
        };
      }
      return undefined;
    });

    const merged = [
      ...fromHeuristics.map((h, idx) => ({
        query: parseHealedLocator(h.healedLocator),
        confidence: Math.min(0.95, h.score / 100 + 0.1 - idx * 0.03),
        reasoning: `Mock LLM re-ranked heuristic: ${h.reason}`,
      })),
      ...fromDom.filter(Boolean),
    ].filter((c): c is NonNullable<typeof c> => Boolean(c?.query));

    const seen = new Set<string>();
    const candidates = merged.filter((c) => {
      const key = formatLocatorQuery(c.query!);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      candidates: candidates.map((c) => ({
        query: c.query!,
        confidence: c.confidence,
        reasoning: c.reasoning,
      })),
      model: 'mock-llm-v1',
      reasoning: `Mock LLM analyzed ${context.domSnapshot?.length ?? 0} DOM nodes and ${fromHeuristics.length} heuristic candidates.`,
      promptTokens: 0,
      completionTokens: 0,
    };
  }
}

function parseHealedLocator(locator: string) {
  const roleMatch = locator.match(/^role=(\w+)\[name="(.+)"\]$/);
  if (roleMatch) {
    return { type: 'role' as const, role: roleMatch[1] as 'button', name: roleMatch[2] };
  }
  return { type: 'css' as const, value: locator };
}
