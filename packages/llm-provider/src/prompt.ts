import type { DomElementSnapshot } from 'ai-healing-sdk';
import type { LlmProposeContext } from './types';

const SYSTEM_PROMPT = `You are a Playwright test healing assistant.
Output JSON only with this shape:
{
  "candidates": [
    {
      "query": { "type": "role", "role": "button", "name": "Sign in" }
      OR { "type": "css", "value": "input[type=email]" },
      "confidence": 0.85,
      "reasoning": "brief explanation"
    }
  ]
}
Rules:
- Prefer getByRole with accessible names over CSS.
- Never use XPath.
- Propose 1-5 candidates ranked by confidence.
- Use failure hints and DOM context to infer the target element.
- Do not repeat locators listed under priorFailedLocators.`;

function trimDom(snapshots: DomElementSnapshot[] | undefined, limit = 40): DomElementSnapshot[] {
  return (snapshots ?? []).slice(0, limit);
}

export function buildUserPrompt(ctx: LlmProposeContext): string {
  const dom = trimDom(ctx.domSnapshot);
  const domSearch = trimDom(ctx.domSearchMatches, 15);

  return JSON.stringify(
    {
      task: 'Propose Playwright locators to heal a failed test action',
      action: ctx.action,
      failedLocator: ctx.failedLocator,
      error: ctx.error,
      url: ctx.url,
      pageTitle: ctx.pageTitle,
      failureHints: ctx.failureHints,
      iteration: ctx.iteration ?? 0,
      priorFailedLocators: ctx.priorFailedLocators ?? [],
      domElementCount: ctx.domSnapshot?.length ?? 0,
      domSample: dom,
      domSearchMatches: domSearch,
      heuristicCandidates: ctx.heuristicCandidates?.slice(0, 8),
    },
    null,
    2
  );
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
