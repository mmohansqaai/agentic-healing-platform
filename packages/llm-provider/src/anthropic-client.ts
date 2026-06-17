import { buildUserPrompt, getSystemPrompt } from './prompt';
import { parseLocatorProposals } from './parse-proposals';
import type { LlmClient, LlmClientConfig, LlmProposeContext, LlmProposeResult } from './types';

export class AnthropicLlmClient implements LlmClient {
  readonly provider = 'anthropic' as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;

  constructor(config: LlmClientConfig) {
    if (!config.apiKey) throw new Error('HEALING_LLM_API_KEY is required for Anthropic provider');
    this.apiKey = config.apiKey;
    this.model = config.model ?? process.env.HEALING_LLM_MODEL ?? 'claude-3-5-haiku-20241022';
    this.maxTokens = config.maxTokens ?? Number(process.env.HEALING_LLM_MAX_TOKENS || 2000);
    this.temperature = config.temperature ?? 0;
    this.timeoutMs = config.timeoutMs ?? Number(process.env.HEALING_LLM_TIMEOUT_MS || 30_000);
  }

  async proposeLocators(context: LlmProposeContext): Promise<LlmProposeResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: `${getSystemPrompt()}\nRespond with JSON only.`,
          messages: [{ role: 'user', content: buildUserPrompt(context) }],
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as {
        error?: { message?: string };
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      if (!response.ok) {
        throw new Error(payload.error?.message ?? `Anthropic API error ${response.status}`);
      }

      const text = payload.content?.find((c) => c.type === 'text')?.text ?? '{}';
      const candidates = parseLocatorProposals(text);

      return {
        candidates,
        model: this.model,
        reasoning: candidates.length
          ? `Anthropic proposed ${candidates.length} locator candidate(s).`
          : 'Anthropic returned no valid locator candidates.',
        promptTokens: payload.usage?.input_tokens,
        completionTokens: payload.usage?.output_tokens,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
