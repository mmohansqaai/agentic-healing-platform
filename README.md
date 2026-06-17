# agentic-healing-platform

**All-in-one** agentic healing monorepo — SDK + service + agents. **No Nova / autonomous QA.**

## What's inside (one clone)

| Path | Package |
|------|---------|
| `packages/ai-healing-core` | Framework-agnostic `HealingDriver` + contracts (SaaS spine) |
| `packages/ai-healing-sdk` | Plug-and-play Playwright client (publish to npm) |
| `packages/ai-healing-cypress` | Cypress adapter (`enableHealing`, `healable`) |
| `packages/ai-healing-selenium` | Selenium WebDriver adapter (`enableHealing`, `healable`) |
| `packages/ai-healing-java` | Selenium Java HTTP client + `Healable` wrappers |
| `services/healing-service` | HTTP gateway (`POST /heal`) |
| `agents/locator-agent` | Multi-strategy locator recovery |
| `agents/llm-locator-agent` | LLM proposals + merge |
| `packages/llm-provider` | OpenAI / Anthropic / mock |
| `examples/playwright-plug-and-play` | Minimal demo |

Nova autonomous QA stays in [SelfHealingPlaywrightFramework](https://github.com/mmohansqaai/SelfHealingPlaywrightFramework).

## Quick start

```bash
npm install
npm run build:healing-service
npm run healing-service          # http://localhost:3921
npm run test:plug-and-play
npm run test:unit
```

## Use SDK (from this repo or npm)

**In-repo** (workspace):

```typescript
import { enableHealing, healable } from 'ai-healing-sdk';
```

**External project** (after `npm publish` or `npm run publish:healing-sdk-github`):

```bash
npm install ai-healing-sdk @playwright/test
```

## Publish SDK only (optional)

```bash
npm run pack:sdk
npm run publish:healing-sdk-github   # sync to github.com/mmohansqaai/ai-healing-sdk
```

See `docs/agentic-healing-setup.md`.
