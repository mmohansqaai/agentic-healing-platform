import type { GeneratedLocatorQuery } from './types';

export function queryKey(query: GeneratedLocatorQuery): string {
  if (query.type === 'css') return `css:${query.value}`;
  return `role:${query.role}:${query.name}`;
}

export function formatLocatorQuery(query: GeneratedLocatorQuery): string {
  if (query.type === 'css') return query.value;
  return `role=${query.role}[name="${query.name}"]`;
}

export function confidenceFromScore(score: number): number {
  return Math.min(1, Math.max(0, score / 100));
}
