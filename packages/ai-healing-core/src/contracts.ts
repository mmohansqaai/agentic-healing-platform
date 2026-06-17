import type { DomElementSnapshot, GeneratedLocatorQuery, HealingActionType, TestFramework } from './types';

export type AgentValidationResult = {
  healedLocator: string;
  ok: boolean;
  error?: string;
};

export type AgentHealContext = {
  iteration: number;
  maxIterations: number;
  priorCandidates?: HealingResponseCandidate[];
  priorValidationResults?: AgentValidationResult[];
  testStepDescription?: string;
  agentMode?: 'agentic' | 'legacy';
};

export type AgentToolCall = {
  name: string;
  input?: Record<string, unknown>;
  outputSummary: string;
};

export type AgentTrace = {
  agentId: string;
  iteration: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  toolCalls?: AgentToolCall[];
  reasoning?: string;
  latencyMs: number;
};

/** Standardized healing request (any driver → healing-service / cloud). */
export type HealingRequest = {
  framework: TestFramework;
  action: HealingActionType;
  failedLocator: string;
  error: string;
  url: string;
  pageTitle?: string;
  screenshotPath?: string;
  domSnapshot?: DomElementSnapshot[];
  failureHints?: string;
  agentContext?: AgentHealContext;
  metadata?: Record<string, unknown>;
};

export type HealingResponseCandidate = {
  query: GeneratedLocatorQuery;
  healedLocator: string;
  confidence: number;
  strategy: string;
  reasoning: string;
  score: number;
};

export type HealingResponse = {
  status: 'healed' | 'no_match' | 'error';
  healedLocator?: string;
  confidence?: number;
  strategy?: string;
  reasoning?: string;
  candidates?: HealingResponseCandidate[];
  agentTrace?: AgentTrace[];
  error?: string;
};
