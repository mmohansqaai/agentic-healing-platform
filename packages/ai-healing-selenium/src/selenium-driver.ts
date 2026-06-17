import type {
  DomElementSnapshot,
  DriverClickOptions,
  DriverFillOptions,
  DriverVisibleOptions,
  GeneratedLocatorQuery,
  HealingActionType,
  HealingDriver,
} from 'ai-healing-core';
import { By, until, type WebDriver, type WebElement } from 'selenium-webdriver';

const DEFAULT_TIMEOUT_MS = 5_000;

function escapeXPathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.split("'").join("', \"'\", '")}')`;
}

function queryToBy(query: GeneratedLocatorQuery): By {
  if (query.type === 'css') {
    return By.css(query.value);
  }

  const role = query.role.replace(/"/g, '\\"');
  const name = escapeXPathLiteral(query.name);
  return By.xpath(
    `//*[@role="${role}" and contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), translate(${name}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]`
  );
}

async function findElements(driver: WebDriver, query: GeneratedLocatorQuery): Promise<WebElement[]> {
  return driver.findElements(queryToBy(query));
}

async function waitForElements(
  driver: WebDriver,
  query: GeneratedLocatorQuery,
  timeoutMs: number
): Promise<WebElement[]> {
  const locator = queryToBy(query);
  await driver.wait(until.elementsLocated(locator), timeoutMs);
  return driver.findElements(locator);
}

async function firstElement(
  driver: WebDriver,
  query: GeneratedLocatorQuery,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<WebElement> {
  const elements = await waitForElements(driver, query, timeoutMs);
  if (!elements.length) {
    throw new Error(`No elements found for query: ${query.type === 'css' ? query.value : `role=${query.role}[name="${query.name}"]`}`);
  }
  return elements[0];
}

async function captureDomSnapshotFromDriver(
  driver: WebDriver,
  actionType: HealingActionType
): Promise<DomElementSnapshot[]> {
  const max = 80;
  const clickSelector =
    'button, [role="button"], input[type="submit"], input[type="button"], a[href]:not([href=""])';
  const fillSelector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select';
  const visibleSelector = 'h1, h2, h3, h4, [role="heading"], [role="banner"]';

  const selector =
    actionType === 'click' ? clickSelector : actionType === 'fill' ? fillSelector : visibleSelector;

  return driver.executeScript(
    (sel: string, limit: number) => {
      const els = Array.from(document.querySelectorAll(sel)).slice(0, limit);
      return els.map((el) => {
        const htmlEl = el as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const inputType =
          tag === 'input' ? (el as HTMLInputElement).type?.toLowerCase?.() : undefined;
        const text = (htmlEl.innerText || htmlEl.textContent || '').trim().slice(0, 140);
        const href = tag === 'a' ? (el as HTMLAnchorElement).href : undefined;
        const ariaLabel =
          el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby') ?? undefined;
        const role = el.getAttribute('role') ?? undefined;
        const id = el.getAttribute('id') ?? undefined;
        const name = el.getAttribute('name') ?? undefined;
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
          id: id || undefined,
          name: name || undefined,
          testId: testId || undefined,
          role: role || undefined,
          ariaLabel: ariaLabel || undefined,
          placeholder: placeholder || undefined,
          text: text || undefined,
          href: href || undefined,
          disabled,
        };
      });
    },
    selector,
    max
  ) as Promise<DomElementSnapshot[]>;
}

export class SeleniumHealingDriver implements HealingDriver {
  readonly framework = 'selenium' as const;

  constructor(private readonly driver: WebDriver) {}

  url(): string {
    // Sync HealingDriver contract — callers needing fresh URL should await urlAsync().
    return '';
  }

  async urlAsync(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  async title(): Promise<string> {
    return this.driver.getTitle();
  }

  async captureDomSnapshot(actionType: HealingActionType): Promise<DomElementSnapshot[]> {
    return captureDomSnapshotFromDriver(this.driver, actionType);
  }

  async count(query: GeneratedLocatorQuery): Promise<number> {
    const elements = await findElements(this.driver, query);
    return elements.length;
  }

  async click(query: GeneratedLocatorQuery, options?: DriverClickOptions): Promise<void> {
    const element = await firstElement(this.driver, query, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    if (options?.force) {
      await this.driver.executeScript('arguments[0].click();', element);
      return;
    }
    await element.click();
  }

  async fill(query: GeneratedLocatorQuery, value: string, options?: DriverFillOptions): Promise<void> {
    const element = await firstElement(this.driver, query, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    await element.clear();
    await element.sendKeys(String(value));
  }

  async isVisible(query: GeneratedLocatorQuery, options?: DriverVisibleOptions): Promise<boolean> {
    try {
      const element = await firstElement(this.driver, query, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      return element.isDisplayed();
    } catch {
      return false;
    }
  }
}

export function createSeleniumDriver(webdriver: WebDriver): SeleniumHealingDriver {
  return new SeleniumHealingDriver(webdriver);
}
