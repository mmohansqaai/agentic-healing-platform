import type { HealingRequest } from 'ai-healing-sdk';
import { runLlmLocatorAgent } from 'llm-locator-agent';
import { isLlmProviderEnabled } from 'llm-provider';
import { runLocatorAgent } from 'locator-agent';

export type RoutedAgent = 'llm-locator-agent' | 'locator-agent' | 'locator-recovery';

/** Route to LLM agent when provider enabled; always include rule agent as ensemble backup. */
export function routeHealingRequest(_request: HealingRequest): RoutedAgent[] {
  if (isLlmProviderEnabled() && process.env.HEALING_LLM_PROVIDER !== 'heuristic') {
    return ['llm-locator-agent', 'locator-agent'];
  }
  return ['locator-agent'];
}

export async function executeRoutedAgents(request: HealingRequest, agents: RoutedAgent[]) {
  const results = [];

  for (const agent of agents) {
    if (agent === 'llm-locator-agent') {
      const result = await runLlmLocatorAgent(request);
      results.push({
        agent: result.agent,
        candidates: result.candidates,
        best: result.best,
        llmMeta: {
          model: result.model,
          reasoning: result.reasoning,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          toolCalls: result.toolCalls,
        },
      });
      continue;
    }

    if (agent === 'locator-agent' || agent === 'locator-recovery') {
      const result = runLocatorAgent(request);
      results.push({
        agent: result.agent,
        candidates: result.candidates,
        best: result.best,
      });
    }
  }

  return results;
}
