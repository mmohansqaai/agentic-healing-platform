import type { Request, Response } from 'express';
import type { HealingRequest } from 'ai-healing-sdk';
import { orchestrateHealing } from '../orchestration/healing-orchestrator';

function isHealingRequest(body: unknown): body is HealingRequest {
  if (!body || typeof body !== 'object') return false;
  const value = body as Partial<HealingRequest>;
  return (
    typeof value.framework === 'string' &&
    typeof value.action === 'string' &&
    typeof value.failedLocator === 'string' &&
    typeof value.error === 'string' &&
    typeof value.url === 'string'
  );
}

export async function postHeal(req: Request, res: Response): Promise<void> {
  if (!isHealingRequest(req.body)) {
    res.status(400).json({
      status: 'error',
      error: 'Invalid HealingRequest payload',
    } satisfies { status: 'error'; error: string });
    return;
  }

  try {
    const response = await orchestrateHealing(req.body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
