import type {
  DomElementSnapshot,
  DriverClickOptions,
  DriverFillOptions,
  DriverVisibleOptions,
  GeneratedLocatorQuery,
  HealingActionType,
  HealingDriver,
} from 'ai-healing-core';

declare const cy: any;
declare const Cypress: any;

function assertCypressRuntime(): void {
  if (typeof cy === 'undefined' || typeof Cypress === 'undefined') {
    throw new Error('Cypress runtime not detected. Use ai-healing-cypress inside Cypress tests.');
  }
}

function queryToCypressSelection(query: GeneratedLocatorQuery) {
  assertCypressRuntime();
  if (query.type === 'css') {
    return cy.get(query.value);
  }

  // Minimal role support without @testing-library/cypress.
  // We approximate by filtering elements by [role] and matching visible text.
  const selector = `[role="${query.role}"]`;
  return cy.get(selector).filter(`:contains("${query.name}")`);
}

async function cypressCount(query: GeneratedLocatorQuery): Promise<number> {
  assertCypressRuntime();
  return await Cypress.Promise.resolve(
    queryToCypressSelection(query).then(($el: any) => ($el?.length ? Number($el.length) : 0))
  );
}

async function cypressIsVisible(query: GeneratedLocatorQuery): Promise<boolean> {
  assertCypressRuntime();
  return await Cypress.Promise.resolve(
    queryToCypressSelection(query).then(($el: any) => Boolean($el && $el.length && $el.is(':visible')))
  );
}

async function cypressClick(query: GeneratedLocatorQuery, options?: DriverClickOptions): Promise<void> {
  assertCypressRuntime();
  const timeout = options?.timeoutMs;
  const force = options?.force;
  await Cypress.Promise.resolve(queryToCypressSelection(query).click({ timeout, force }));
}

async function cypressFill(query: GeneratedLocatorQuery, value: string, options?: DriverFillOptions): Promise<void> {
  assertCypressRuntime();
  const timeout = options?.timeoutMs;
  const selection = queryToCypressSelection(query);
  await Cypress.Promise.resolve(selection.clear({ timeout }));
  await Cypress.Promise.resolve(selection.type(String(value), { timeout }));
}

async function cypressUrl(): Promise<string> {
  assertCypressRuntime();
  return await Cypress.Promise.resolve(cy.url().then((u: string) => u));
}

async function cypressTitle(): Promise<string> {
  assertCypressRuntime();
  return await Cypress.Promise.resolve(cy.title().then((t: string) => t));
}

async function cypressDomSnapshot(actionType: HealingActionType): Promise<DomElementSnapshot[]> {
  assertCypressRuntime();

  const max = 80;
  const clickSelector =
    'button, [role="button"], input[type="submit"], input[type="button"], a[href]:not([href=""])';
  const fillSelector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select';
  const visibleSelector = 'h1, h2, h3, h4, [role="heading"], [role="banner"]';

  const selector =
    actionType === 'click' ? clickSelector : actionType === 'fill' ? fillSelector : visibleSelector;

  return await Cypress.Promise.resolve(
    cy.document().then((doc: Document) => {
      const els = Array.from(doc.querySelectorAll(selector)).slice(0, max);
      const snapshots: DomElementSnapshot[] = els.map((el) => {
        const htmlEl = el as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const inputType =
          tag === 'input' ? (el as HTMLInputElement).type?.toLowerCase?.() : undefined;
        const text = (htmlEl.innerText || htmlEl.textContent || '').trim().slice(0, 140);
        const href = tag === 'a' ? (el as HTMLAnchorElement).href : undefined;

        const ariaLabel =
          (el.getAttribute('aria-label') ?? undefined) ||
          (el.getAttribute('aria-labelledby') ?? undefined);

        const role = el.getAttribute('role') ?? undefined;
        const id = el.getAttribute('id') ?? undefined;
        const name = (el.getAttribute('name') ?? undefined) || undefined;
        const testId =
          el.getAttribute('data-testid') ??
          el.getAttribute('data-test-id') ??
          el.getAttribute('data-test') ??
          undefined;
        const placeholder = el.getAttribute('placeholder') ?? undefined;

        const disabled =
          (el as HTMLInputElement).disabled === true ||
          el.getAttribute('aria-disabled') === 'true' ||
          el.hasAttribute('disabled');

        return {
          tag,
          inputType,
          id,
          name,
          testId,
          role,
          ariaLabel,
          placeholder,
          text: text || undefined,
          href: href || undefined,
          disabled,
        };
      });

      return snapshots;
    })
  );
}

export class CypressHealingDriver implements HealingDriver {
  readonly framework = 'cypress' as const;
  private lastKnownUrl = '';

  url(): string {
    return this.lastKnownUrl;
  }

  private async refreshUrl(): Promise<void> {
    try {
      this.lastKnownUrl = await cypressUrl();
    } catch {
      // Keep last known URL if current lookup fails.
    }
  }

  async title(): Promise<string> {
    await this.refreshUrl();
    return cypressTitle();
  }

  async captureDomSnapshot(actionType: HealingActionType): Promise<DomElementSnapshot[]> {
    await this.refreshUrl();
    return cypressDomSnapshot(actionType);
  }

  async count(query: GeneratedLocatorQuery): Promise<number> {
    await this.refreshUrl();
    return cypressCount(query);
  }

  async click(query: GeneratedLocatorQuery, options?: DriverClickOptions): Promise<void> {
    await this.refreshUrl();
    return cypressClick(query, options);
  }

  async fill(query: GeneratedLocatorQuery, value: string, options?: DriverFillOptions): Promise<void> {
    await this.refreshUrl();
    return cypressFill(query, value, options);
  }

  async isVisible(query: GeneratedLocatorQuery, _options?: DriverVisibleOptions): Promise<boolean> {
    await this.refreshUrl();
    return cypressIsVisible(query);
  }

  /** Cypress-native URL accessor (recommended). */
  async urlAsync(): Promise<string> {
    return cypressUrl();
  }
}

export function createCypressDriver(): CypressHealingDriver {
  return new CypressHealingDriver();
}

