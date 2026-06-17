import { AnthropicLlmClient } from './anthropic-client';
import { MockLlmClient } from './mock-client';
import { OpenAiLlmClient } from './openai-client';
import type { LlmClient, LlmClientConfig, LlmProviderName } from './types';

export function resolveLlmProviderName(): LlmProviderName {
  const raw = (process.env.HEALING_LLM_PROVIDER ?? 'mock').toLowerCase();
  if (raw === 'openai' || raw === 'anthropic' || raw === 'mock' || raw === 'heuristic') return raw;
  return 'mock';
}

export function isLlmProviderEnabled(): boolean {
  const provider = resolveLlmProviderName();
  return provider === 'openai' || provider === 'anthropic' || provider === 'mock';
}

export function createLlmClient(config?: Partial<LlmClientConfig>): LlmClient {
  const provider = config?.provider ?? resolveLlmProviderName();
  const apiKey = config?.apiKey ?? process.env.HEALING_LLM_API_KEY;

  switch (provider) {
    case 'openai':
      return new OpenAiLlmClient({ provider, apiKey, ...config });
    case 'anthropic':
      return new AnthropicLlmClient({ provider, apiKey, ...config });
    case 'heuristic':
    case 'mock':
    default:
      return new MockLlmClient();
  }
}
