import type { GeneratedLocatorQuery } from 'ai-healing-sdk';
import type { LocatorProposal } from './types';

const ALLOWED_ROLES = new Set([
  'alert',
  'button',
  'checkbox',
  'combobox',
  'heading',
  'link',
  'listbox',
  'menuitem',
  'option',
  'radio',
  'searchbox',
  'switch',
  'tab',
  'textbox',
]);

function parseQuery(raw: unknown): GeneratedLocatorQuery | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const q = raw as Record<string, unknown>;
  if (q.type === 'css' && typeof q.value === 'string' && q.value.trim()) {
    return { type: 'css', value: q.value.trim() };
  }
  if (q.type === 'role' && typeof q.role === 'string' && typeof q.name === 'string') {
    const role = q.role.trim().toLowerCase();
    const name = q.name.trim();
    if (!ALLOWED_ROLES.has(role) || !name) return undefined;
    return { type: 'role', role: role as 'button', name };
  }
  return undefined;
}

export function parseLocatorProposals(payload: unknown): LocatorProposal[] {
  const root = typeof payload === 'string' ? safeJsonParse(payload) : payload;
  if (!root || typeof root !== 'object') return [];

  const list = (root as { candidates?: unknown }).candidates;
  if (!Array.isArray(list)) return [];

  const out: LocatorProposal[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const query = parseQuery(row.query);
    if (!query) continue;
    const confidence = typeof row.confidence === 'number' ? Math.min(1, Math.max(0, row.confidence)) : 0.7;
    const reasoning = typeof row.reasoning === 'string' ? row.reasoning.slice(0, 500) : 'LLM proposal';
    out.push({ query, confidence, reasoning });
  }
  return out.slice(0, 5);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return undefined;
    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}
