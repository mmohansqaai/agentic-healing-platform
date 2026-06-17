import type { HealingRequest, HealingResponse } from 'ai-healing-sdk';
import { readCachedResponse, writeCachedResponse } from '../cache/simple-cache';
import { executeRoutedAgents, routeHealingRequest } from '../routing/agent-router';
import { pickBestCandidate, toResponseCandidates } from '../scoring/confidence-scorer';
import { logHealCycle, logHealingEvent } from '../telemetry/events';

type AgentResultMeta = {
  agent: string;
  candidates: Parameters<typeof toResponseCandidates>[0];
  llmMeta?: {
    model: string;
    reasoning: string;
    promptTokens?: number;
    completionTokens?: number;
    toolCalls?: Array<{ name: string; input?: Record<string, unknown>; outputSummary: string }>;
  };
};

function buildAgentTraces(
  request: HealingRequest,
  agentResults: AgentResultMeta[],
  latencyMs: number
): HealingResponse['agentTrace'] {
  const iteration = request.agentContext?.iteration ?? 0;
  const traces: NonNullable<HealingResponse['agentTrace']> = [];

  for (const result of agentResults) {
    if (result.agent === 'llm-locator-agent' && result.llmMeta) {
      traces.push({
        agentId: 'llm-locator-agent',
        iteration,
        model: result.llmMeta.model,
        promptTokens: result.llmMeta.promptTokens,
        completionTokens: result.llmMeta.completionTokens,
        toolCalls: result.llmMeta.toolCalls,
        reasoning: result.llmMeta.reasoning,
        latencyMs,
      });
    } else if (result.agent === 'locator-agent') {
      traces.push({
        agentId: 'locator-agent',
        iteration,
        model: 'heuristic-agent-v1',
        reasoning: `Rule-based agent proposed ${result.candidates.length} candidate(s).`,
        latencyMs,
      });
    }
  }

  if (!traces.length) {
    traces.push({
      agentId: 'agentic-healing-service',
      iteration,
      model: 'heuristic-agent-v1',
      reasoning: `Agentic orchestration for ${request.action} on ${request.url}`,
      latencyMs,
    });
  }

  return traces;
}

function mergeAgentCandidates(agentResults: AgentResultMeta[]) {
  const merged = agentResults.flatMap((r) => {
    const boost = r.agent === 'llm-locator-agent' ? 5 : 0;
    return r.candidates.map((c) => ({
      ...c,
      score: c.score + boost,
      reason: r.agent === 'llm-locator-agent' ? `[llm] ${c.reason}` : c.reason,
    }));
  });
  return merged;
}

export async function orchestrateHealing(request: HealingRequest): Promise<HealingResponse> {
  const started = Date.now();
  logHealingEvent({
    type: 'heal.request',
    url: request.url,
    action: request.action,
    framework: request.framework,
    agentMode: request.agentContext?.agentMode ?? 'agentic',
    iteration: request.agentContext?.iteration ?? 0,
  });

  const cached = readCachedResponse(request);
  if (cached) {
    logHealingEvent({ type: 'heal.cache_hit', url: request.url });
    return cached;
  }

  const agents = routeHealingRequest(request);
  const agentResults = await executeRoutedAgents(request, agents);
  const rawCandidates = mergeAgentCandidates(agentResults);
  const candidates = toResponseCandidates(rawCandidates);
  const best = pickBestCandidate(candidates);
  const latencyMs = Date.now() - started;
  const agentTrace = buildAgentTraces(request, agentResults, latencyMs);

  const response: HealingResponse = best
    ? {
        status: 'healed',
        healedLocator: best.healedLocator,
        confidence: best.confidence,
        strategy: best.strategy,
        reasoning: best.reasoning,
        candidates,
        agentTrace,
      }
    : {
        status: 'no_match',
        candidates: [],
        reasoning: 'Agent found no viable locator candidates after LLM + tool orchestration.',
        agentTrace,
      };

  writeCachedResponse(request, response);
  logHealCycle(request, response, latencyMs);
  return response;
}
