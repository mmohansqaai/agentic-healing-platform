import { buildUserPrompt, getSystemPrompt } from './prompt';
import { parseLocatorProposals } from './parse-proposals';
import type { LlmClient, LlmClientConfig, LlmProposeContext, LlmProposeResult } from './types';

export class OpenAiLlmClient implements LlmClient {
  readonly provider = 'openai' as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor(config: LlmClientConfig) {
    if (!config.apiKey) throw new Error('HEALING_LLM_API_KEY is required for OpenAI provider');
    this.apiKey = config.apiKey;
    this.model = config.model ?? process.env.HEALING_LLM_MODEL ?? 'gpt-4o-mini';
    this.maxTokens = config.maxTokens ?? Number(process.env.HEALING_LLM_MAX_TOKENS || 2000);
    this.temperature = config.temperature ?? 0;
    this.timeoutMs = config.timeoutMs ?? Number(process.env.HEALING_LLM_TIMEOUT_MS || 30_000);
  }

  async proposeLocators(context: LlmProposeContext): Promise<LlmProposeResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: buildUserPrompt(context) },
          ],
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? `OpenAI API error ${response.status}`);
      }

      const content = payload.choices?.[0]?.message?.content ?? '{}';
      const candidates = parseLocatorProposals(content);

      return {
        candidates,
        model: this.model,
        reasoning: candidates.length
          ? `OpenAI proposed ${candidates.length} locator candidate(s).`
          : 'OpenAI returned no valid locator candidates.',
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
