# ai-healing-selenium

Selenium WebDriver adapter that implements `HealingDriver` from `ai-healing-core`.

## Install (in a Selenium project)

```bash
npm install ai-healing-core ai-healing-selenium selenium-webdriver
```

## Usage

```ts
import { Builder } from 'selenium-webdriver';
import { enableHealing, healable } from 'ai-healing-selenium';

const driver = await new Builder().forBrowser('chrome').build();

enableHealing(driver, {
  healingEnabled: true,
  healingServiceUrl: 'http://localhost:3921',
});

await driver.get('https://example.com');
await healable.click('#login');
await healable.fill('input[name="email"]', 'user@demo.com');
await healable.expectVisible({ type: 'role', role: 'alert', name: 'Success' });

await driver.quit();
```

## Driver-only API

```ts
import { createSeleniumDriver } from 'ai-healing-selenium';

const healingDriver = createSeleniumDriver(driver);
await healingDriver.click({ type: 'css', value: 'button[type="submit"]' });
```

## Notes

- `selenium-webdriver` is a **peerDependency** — your test project must install it.
- `GeneratedLocatorQuery.type = 'role'` uses XPath text matching (best-effort without Testing Library).
