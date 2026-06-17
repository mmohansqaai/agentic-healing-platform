import type { DomElementSnapshot } from 'ai-healing-sdk';
import type { GeneratedLocatorQuery, HealingActionType } from 'ai-healing-sdk';

export type LlmProviderName = 'mock' | 'heuristic' | 'openai' | 'anthropic';

export type LocatorProposal = {
  query: GeneratedLocatorQuery;
  confidence: number;
  reasoning: string;
};

export type LlmProposeContext = {
  action: HealingActionType;
  failedLocator: string;
  error: string;
  url: string;
  pageTitle?: string;
  failureHints?: string;
  domSnapshot?: DomElementSnapshot[];
  domSearchMatches?: DomElementSnapshot[];
  heuristicCandidates?: Array<{
    healedLocator: string;
    score: number;
    reason: string;
  }>;
  priorFailedLocators?: string[];
  iteration?: number;
};

export type LlmProposeResult = {
  candidates: LocatorProposal[];
  model: string;
  reasoning: string;
  promptTokens?: number;
  completionTokens?: number;
};

export interface LlmClient {
  readonly provider: LlmProviderName;
  proposeLocators(context: LlmProposeContext): Promise<LlmProposeResult>;
}

export type LlmClientConfig = {
  provider: LlmProviderName;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
};
