declare module 'selenium-webdriver' {
  export class WebDriver {
    getCurrentUrl(): Promise<string>;
    getTitle(): Promise<string>;
    findElements(locator: By): Promise<WebElement[]>;
    wait<T>(condition: (...args: unknown[]) => T | PromiseLike<T>, timeout?: number): Promise<T>;
    executeScript<T>(script: string | Function, ...args: unknown[]): Promise<T>;
  }

  export interface WebElement {
    click(): Promise<void>;
    clear(): Promise<void>;
    sendKeys(...keys: string[]): Promise<void>;
    isDisplayed(): Promise<boolean>;
  }

  export class By {
    static css(selector: string): By;
    static xpath(expression: string): By;
  }

  export namespace until {
    function elementsLocated(locator: By): (...args: unknown[]) => Promise<WebElement[]>;
  }
}
