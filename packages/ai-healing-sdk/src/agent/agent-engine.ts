import type { Page } from '@playwright/test';
import type { DiscoveryStrategyName } from '../core/discovery/compose-discoverers';
import { generatedQueryKey } from '../core/locator-query';
import type { GeneratedLocatorCandidate, HealingAttempt, HealingActionType } from '../core/healing-types';
import type { AgentToolCall, AgentTrace, HealingRequest } from '../transport/contracts';
import { formatLocatorQuery } from '../transport/contracts';
import {
  excludeFailedLocators,
  inferDomSearchFromHints,
  listHeuristicCandidates,
  searchDom,
} from './tools';

export type AgentEngineResult = {
  candidates: GeneratedLocatorCandidate[];
  reasoning: string;
  toolCalls: AgentToolCall[];
  trace: AgentTrace;
};

function failedLocatorKeys(request: HealingRequest): Set<string> {
  const failed = request.agentContext?.priorValidationResults?.filter((r) => !r.ok) ?? [];
  return new Set(failed.map((r) => r.healedLocator));
}

function boostDomAlignedCandidates(
  candidates: GeneratedLocatorCandidate[],
  domMatches: ReturnType<typeof searchDom>
): GeneratedLocatorCandidate[] {
  if (!domMatches.length) return candidates;

  const matchTexts = new Set(domMatches.map((d) => (d.text ?? '').toLowerCase()).filter(Boolean));

  return candidates.map((c) => {
    let bonus = 0;
    if (c.query.type === 'role' && matchTexts.has(c.query.name.toLowerCase())) bonus += 8;
    if (c.query.type === 'css') {
      for (const t of matchTexts) {
        if (t && c.query.value.toLowerCase().includes(t.slice(0, 12))) bonus += 5;
      }
    }
    if (!bonus) return c;
    return {
      ...c,
      score: c.score + bonus,
      reason: `${c.reason} [agent:dom-align=+${bonus}]`,
    };
  });
}

/**
 * Pure agentic engine — always runs observe → tool use → propose.
 * Uses heuristic tools by default (no LLM API key required).
 */
export async function runAgentEngine(args: {
  request: HealingRequest;
  page: Page;
  actionType: HealingActionType;
  attempts: HealingAttempt[];
  discoveryStrategies?: DiscoveryStrategyName[];
}): Promise<AgentEngineResult> {
  const started = Date.now();
  const toolCalls: AgentToolCall[] = [];
  const { request, page, actionType, attempts, discoveryStrategies } = args;

  const heuristicCandidates = await listHeuristicCandidates({
    page,
    actionType,
    attempts,
    discoveryStrategies,
    domSnapshot: request.domSnapshot,
    failureHints: request.failureHints,
  });
  toolCalls.push({
    name: 'list_heuristic_candidates',
    outputSummary: `${heuristicCandidates.length} candidates from seed/dom-scan tools`,
  });

  const domSearch = inferDomSearchFromHints(request.failureHints);
  const domMatches = searchDom(request.domSnapshot, domSearch);
  toolCalls.push({
    name: 'search_dom',
    input: domSearch as Record<string, unknown>,
    outputSummary: `${domMatches.length} DOM elements matched failure hints`,
  });

  const failedKeys = failedLocatorKeys(request);
  let candidates = excludeFailedLocators(heuristicCandidates, failedKeys);
  candidates = boostDomAlignedCandidates(candidates, domMatches);

  if (request.agentContext && request.agentContext.iteration > 0 && candidates.length) {
    candidates = candidates.map((c, idx) => ({
      ...c,
      score: c.score + Math.max(0, 5 - idx),
      reason: `${c.reason} [agent:reflection-iter=${request.agentContext!.iteration}]`,
    }));
  }

  const merged = new Map<string, GeneratedLocatorCandidate>();
  for (const c of candidates) {
    const key = generatedQueryKey(c.query);
    const existing = merged.get(key);
    if (!existing || c.score > existing.score) merged.set(key, c);
  }
  candidates = Array.from(merged.values()).sort((a, b) => b.score - a.score);

  const iteration = request.agentContext?.iteration ?? 0;
  const reasoning =
    candidates.length > 0
      ? `Agent iteration ${iteration + 1}: analyzed ${request.domSnapshot?.length ?? 0} DOM nodes, ` +
        `invoked ${toolCalls.length} tools, proposed ${candidates.length} locator(s) ` +
        `(excluded ${failedKeys.size} prior failures).`
      : `Agent iteration ${iteration + 1}: no viable candidates after tool analysis and reflection.`;

  return {
    candidates,
    reasoning,
    toolCalls,
    trace: {
      agentId: 'agentic-healing-agent',
      iteration,
      model: 'heuristic-agent-v1',
      toolCalls,
      reasoning,
      latencyMs: Date.now() - started,
    },
  };
}

export function agentCandidatesToResponse(candidates: GeneratedLocatorCandidate[]) {
  return candidates.map((c) => ({
    query: c.query,
    healedLocator: formatLocatorQuery(c.query),
    confidence: Math.min(1, Math.max(0, c.score / 100)),
    strategy: c.strategyName,
    reasoning: c.reason,
    score: c.score,
  }));
}
