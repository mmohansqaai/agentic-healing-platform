import type { Page } from '@playwright/test';
import type { GeneratedLocatorQuery } from 'ai-healing-core';
import { queryKey as coreQueryKey } from 'ai-healing-core';

export { queryKey } from 'ai-healing-core';

type AriaRole = Parameters<Page['getByRole']>[0];

export function resolveQuery(page: Page, query: GeneratedLocatorQuery) {
  if (query.type === 'css') return page.locator(query.value).first();
  return page.getByRole(query.role as AriaRole, { name: new RegExp(escapeRegExp(query.name), 'i') }).first();
}

export function generatedQueryToLocatorFactory(query: GeneratedLocatorQuery) {
  return (page: Page) => {
    if (query.type === 'css') return page.locator(query.value);
    return page.getByRole(query.role as AriaRole, { name: new RegExp(escapeRegExp(query.name), 'i') });
  };
}

export function generatedQueryKey(query: GeneratedLocatorQuery): string {
  return coreQueryKey(query);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
