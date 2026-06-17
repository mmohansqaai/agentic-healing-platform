# ai-healing-sdk

Plug-and-play **agentic** self-healing for Playwright tests.

Zero Nova / autonomous dependencies — ship this package alone to npm or a dedicated git repo.

## Install

```bash
npm install ai-healing-sdk @playwright/test
```

**Standalone repo:** see [STANDALONE-REPO.md](./STANDALONE-REPO.md) (extract from monorepo with `npm run extract:healing-sdk-repo` at workspace root).

**Example project:** `examples/playwright-plug-and-play` in the dev monorepo, or `example/` in the extracted standalone repo.

## Quick start (pure agentic, in-process)

```ts
import { test } from '@playwright/test';
import { enableHealing, healable } from 'ai-healing-sdk';

test('login with agentic healing', async ({ page }) => {
  enableHealing(page, {
    healingEnabled: true,
    agentMode: 'agentic', // default when healing is enabled
  });

  await page.goto('https://your-app.com/login');
  await healable.fill(page.getByLabel(/email/i), 'user@example.com');
  await healable.click(page.getByRole('button', { name: /sign in/i }));
});
```

When a locator fails, the SDK runs an **observe → tool use → validate → reflect** agent loop (no LLM API key required by default).

## Remote agentic healing-service (optional)

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
```

Point `HEALING_SERVICE_URL` at your own [healing-service](https://github.com/YOUR_ORG/healing-service) deployment if you use the HTTP transport. LLM keys stay on the service, not in Playwright tests.

## Legacy rule-only mode

```bash
export HEALING_AGENT_MODE=legacy
```

## Strategy-based API (page objects)

```ts
import { clickHealing, type LocatorStrategy } from 'ai-healing-sdk';

const strategies: LocatorStrategy[] = [
  { name: 'primary', resolve: (p) => p.getByRole('button', { name: /submit/i }) },
];

await clickHealing(page, strategies, { autoHeal: { enabled: true } });
```
