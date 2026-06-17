import type { AgentValidationResult, GeneratedLocatorCandidate, HealingRequest } from 'ai-healing-sdk';
import {
  listHeuristicCandidatesOffline,
  formatLocatorQuery,
  searchDom,
} from 'ai-healing-sdk';
import { createLlmClient, type LlmClient, type LlmProposeContext } from 'llm-provider';
import { runLocatorAgent } from 'locator-agent';
import type { ScoredLocatorCandidate } from 'locator-agent';
import { inferDomSearchFromHints } from './dom-hints';

export type LlmLocatorAgentResult = {
  agent: 'llm-locator-agent';
  candidates: ScoredLocatorCandidate[];
  best?: ScoredLocatorCandidate;
  model: string;
  reasoning: string;
  promptTokens?: number;
  completionTokens?: number;
  toolCalls: Array<{ name: string; input?: Record<string, unknown>; outputSummary: string }>;
};

function inferDomSearchFromHintsLocal(hints: string | undefined) {
  return inferDomSearchFromHints(hints);
}

function buildToolContext(request: HealingRequest) {
  const attempts = [{ strategy: request.failedLocator, ok: false, error: request.error }];
  const heuristic = listHeuristicCandidatesOffline({
    actionType: request.action,
    attempts,
    failureHints: request.failureHints,
    domSnapshot: request.domSnapshot,
  });

  const domSearch = inferDomSearchFromHintsLocal(request.failureHints);
  const domMatches = searchDom(request.domSnapshot, domSearch);

  const toolCalls = [
    {
      name: 'list_heuristic_candidates',
      outputSummary: `${heuristic.length} offline heuristic candidates`,
    },
    {
      name: 'search_dom',
      input: domSearch as Record<string, unknown>,
      outputSummary: `${domMatches.length} DOM elements matched`,
    },
  ];

  const heuristicCandidates = heuristic.map((c: GeneratedLocatorCandidate) => ({
    healedLocator: formatLocatorQuery(c.query),
    score: c.score,
    reason: c.reason,
  }));

  const priorFailedLocators =
    request.agentContext?.priorValidationResults
      ?.filter((r: AgentValidationResult) => !r.ok)
      .map((r: AgentValidationResult) => r.healedLocator) ?? [];

  const llmContext: LlmProposeContext = {
    action: request.action,
    failedLocator: request.failedLocator,
    error: request.error,
    url: request.url,
    pageTitle: request.pageTitle,
    failureHints: request.failureHints,
    domSnapshot: request.domSnapshot,
    domSearchMatches: domMatches,
    heuristicCandidates,
    priorFailedLocators,
    iteration: request.agentContext?.iteration,
  };

  return { toolCalls, llmContext, heuristic };
}

function proposalsToCandidates(
  proposals: Array<{ query: ScoredLocatorCandidate['query']; confidence: number; reasoning: string }>,
  prefix = 'llm'
): ScoredLocatorCandidate[] {
  return proposals.map((p, idx) => ({
    strategyName: `${prefix}-proposal-${idx + 1}`,
    query: p.query,
    score: Math.round(p.confidence * 100),
    reason: `[llm_locator_agent] ${p.reasoning}`,
    confidence: p.confidence,
    contributions: [
      {
        strategy: 'semantic_matching' as const,
        weight: 12,
        reason: 'LLM locator synthesis',
      },
    ],
  }));
}

function heuristicToScored(heuristic: GeneratedLocatorCandidate[]): ScoredLocatorCandidate[] {
  return heuristic.map((c: GeneratedLocatorCandidate) => ({
    ...c,
    confidence: Math.min(1, c.score / 100),
    contributions: [
      {
        strategy: 'dom_neighborhood' as const,
        weight: 8,
        reason: 'Heuristic fallback',
      },
    ],
  }));
}

let cachedClient: LlmClient | undefined;

function getLlmClient(): LlmClient {
  if (!cachedClient) cachedClient = createLlmClient();
  return cachedClient;
}

/** Reset cached client (for tests). */
export function resetLlmClientCache(): void {
  cachedClient = undefined;
}

/**
 * LLM locator agent — runs tools, calls LLM for proposals, falls back to locator-agent.
 */
export async function runLlmLocatorAgent(request: HealingRequest): Promise<LlmLocatorAgentResult> {
  const { toolCalls, llmContext, heuristic } = buildToolContext(request);

  try {
    const client = getLlmClient();
    const llmResult = await client.proposeLocators(llmContext);

    let candidates = proposalsToCandidates(llmResult.candidates);

    if (!candidates.length) {
      const fallback = runLocatorAgent(request);
      return {
        agent: 'llm-locator-agent',
        candidates: fallback.candidates,
        best: fallback.best,
        model: llmResult.model,
        reasoning: `${llmResult.reasoning} Fallback to locator-agent.`,
        promptTokens: llmResult.promptTokens,
        completionTokens: llmResult.completionTokens,
        toolCalls,
      };
    }

    const failedKeys = new Set(llmContext.priorFailedLocators ?? []);
    candidates = candidates.filter((c) => !failedKeys.has(formatLocatorQuery(c.query)));

    const best = [...candidates].sort((a, b) => b.score - a.score)[0];

    return {
      agent: 'llm-locator-agent',
      candidates,
      best,
      model: llmResult.model,
      reasoning: llmResult.reasoning,
      promptTokens: llmResult.promptTokens,
      completionTokens: llmResult.completionTokens,
      toolCalls,
    };
  } catch (error) {
    const locatorFallback = runLocatorAgent(request);
    const heuristicFallback = heuristicToScored(heuristic);
    const merged = locatorFallback.candidates.length ? locatorFallback.candidates : heuristicFallback;

    return {
      agent: 'llm-locator-agent',
      candidates: merged,
      best: merged[0],
      model: 'llm-fallback',
      reasoning: `LLM error: ${error instanceof Error ? error.message : String(error)}. Using locator-agent fallback.`,
      toolCalls,
    };
  }
}
