export type CypressHealingConfig = {
  healingEnabled: boolean;
  healingServiceUrl?: string;
  framework: string;
  timeoutPerStrategyMs: number;
  maxCandidates: number;
  verboseLogs: boolean;
};

export const DEFAULT_CYPRESS_HEALING_CONFIG: CypressHealingConfig = {
  healingEnabled: true,
  healingServiceUrl: process.env.HEALING_SERVICE_URL,
  framework: 'cypress',
  timeoutPerStrategyMs: Number(process.env.HEALING_SERVICE_TIMEOUT_MS || 8_000),
  maxCandidates: 8,
  verboseLogs: false,
};

let activeConfig: CypressHealingConfig = { ...DEFAULT_CYPRESS_HEALING_CONFIG };

export function resolveCypressHealingConfig(
  config?: Partial<CypressHealingConfig>
): CypressHealingConfig {
  return {
    ...DEFAULT_CYPRESS_HEALING_CONFIG,
    ...config,
    healingServiceUrl:
      config?.healingServiceUrl ??
      process.env.HEALING_SERVICE_URL ??
      DEFAULT_CYPRESS_HEALING_CONFIG.healingServiceUrl,
  };
}

export function setCypressHealingConfig(config?: Partial<CypressHealingConfig>): CypressHealingConfig {
  activeConfig = resolveCypressHealingConfig(config);
  return activeConfig;
}

export function getCypressHealingConfig(): CypressHealingConfig {
  return activeConfig;
}

