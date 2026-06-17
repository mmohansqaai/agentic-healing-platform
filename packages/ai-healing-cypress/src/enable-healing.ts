import type { CypressHealingConfig } from './config';
import { setCypressHealingConfig } from './config';

/** Enable healing behavior globally for Cypress wrappers. */
export function enableHealing(config?: Partial<CypressHealingConfig>): CypressHealingConfig {
  return setCypressHealingConfig(config);
}

