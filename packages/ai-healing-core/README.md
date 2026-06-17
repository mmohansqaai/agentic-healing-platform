# ai-healing-core

Framework-agnostic spine for agentic test healing — **SaaS-ready**.

## Why this package exists

| Layer | Package | Role |
|-------|---------|------|
| **Core** (this) | `ai-healing-core` | `HealingDriver` interface, `HealingRequest`/`Response`, shared types |
| **Adapters** | `ai-healing-sdk` (Playwright), future Cypress/Selenium | Implement `HealingDriver` |
| **Cloud** | `healing-service` in agentic-healing-platform | Same contracts server-side |

One healing brain, many frameworks, one billable API.

## HealingDriver (implement per framework)

```typescript
import type { HealingDriver } from 'ai-healing-core';

// Playwright: ai-healing-sdk → createPlaywrightDriver(page)
// Cypress:   @ai-healing/cypress → createCypressDriver()  (planned)
// Selenium:  @ai-healing/selenium → createSeleniumDriver(driver)  (planned)
```

## Adapters roadmap

| Phase | Adapter | Status |
|-------|---------|--------|
| 1 | Playwright (`ai-healing-sdk`) | ✅ `createPlaywrightDriver` |
| 2 | Cypress (`ai-healing-cypress`) | ✅ `enableHealing`, `healable` |
| 3 | Selenium JS (`ai-healing-selenium`) | ✅ `enableHealing(driver)`, `healable` |
| 4 | Selenium Java (`ai-healing-java`) | ✅ HTTP client + `Healable` |

## Cloud contract

Any adapter builds a `HealingRequest` and POSTs to healing-service:

```typescript
import type { HealingRequest } from 'ai-healing-core';

const request: HealingRequest = {
  framework: 'cypress',
  action: 'click',
  failedLocator: 'button.submit',
  error: 'not found',
  url: driver.url(),
  domSnapshot: await driver.captureDomSnapshot('click'),
};
```

No Playwright dependency in this package.
