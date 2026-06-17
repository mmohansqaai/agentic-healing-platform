# How to Use — Agentic Self-Healing Playwright Framework

A practical guide to add self-healing to Playwright tests using `ai-healing-sdk`.

**Related docs**

| Document | When to read |
|----------|----------------|
| [agentic-healing-setup.md](./agentic-healing-setup.md) | LLM / OpenAI / Anthropic service configuration |
| [PRD-Agentic-AI-Conversion.md](./PRD-Agentic-AI-Conversion.md) | Architecture and roadmap |
| [Agentic-Healing-Technical-Presentation-Speaker-Notes.md](./Agentic-Healing-Technical-Presentation-Speaker-Notes.md) | Presentation talking points |
| [packages/ai-healing-sdk/README.md](../packages/ai-healing-sdk/README.md) | SDK API quick reference |

---

## 1. What this does (30 seconds)

When a Playwright locator fails (button moved, label changed, ID updated), the framework:

1. Tries your **original locator** first.
2. If that fails, runs an **agent loop** to find and validate a new locator.
3. Retries the action with the healed locator.

You change very little in your tests. Healing is opt-in via config or environment variables.

**Important:** This is **agentic by architecture** (loop + tools + reflection). **Real LLM (ChatGPT/Claude)** is optional and only used when you run `healing-service` with an API key. The default in-process mode works **without any API key**.

---

## 2. Choose your setup (3 tiers)

| Tier | What you need | Server? | API key? | Best for |
|------|----------------|---------|----------|----------|
| **1 — SDK only** | `ai-healing-sdk` | No | No | Getting started, CI, local dev |
| **2 — Remote service** | SDK + `healing-service` | Yes | No | Shared healing gateway, teams |
| **3 — LLM service** | SDK + `healing-service` + OpenAI/Anthropic | Yes | Yes (on service) | Hard UI failures, real AI |

**Same test code for all tiers** — only environment variables change.

---

## 3. Prerequisites

- **Node.js** 20+
- **npm** 9+
- **Playwright** installed in your project

```bash
npm install @playwright/test
npx playwright install chromium
```

---

## 4. Tier 1 — SDK only (recommended start)

Use this in **any Playwright project**. No monorepo, no server, no API key.

### Step 1: Install the SDK

```bash
npm install ai-healing-sdk @playwright/test
```

**From this monorepo (local path):**

```bash
npm install ./packages/ai-healing-sdk
```

### Step 2: Enable healing in your test

```ts
import { test } from '@playwright/test';
import { enableHealing, healable } from 'ai-healing-sdk';

test.beforeEach(async ({ page }) => {
  enableHealing(page, {
    healingEnabled: true,
    agentMode: 'agentic',
  });
});

test('customer login', async ({ page }) => {
  await page.goto('https://retail-website-two.vercel.app/login');

  await healable.fill(page.getByLabel(/email/i), 'test@demo.com');
  await healable.fill(page.getByLabel(/password/i), 'password123');
  await healable.click(page.getByRole('button', { name: /sign in/i }));
});
```

### Step 3: Turn on auto-heal when running tests

```bash
export AUTO_HEAL_DISCOVER=1
npx playwright test
```

### What changed in your code?

| Before | After |
|--------|-------|
| `await locator.click()` | `await healable.click(locator)` |
| `await locator.fill(value)` | `await healable.fill(locator, value)` |
| — | `enableHealing(page, …)` once per test or in `beforeEach` |

That is the minimum integration.

---

## 5. Tier 2 — Remote healing-service

Use when you want healing logic on a **separate service** (shared across projects or machines).

### Terminal 1 — start the service

From this monorepo root:

```bash
npm run healing-service
```

Service listens on `http://localhost:3921` (default).

### Terminal 2 — run tests

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npx playwright test
```

Your test code stays the same as Tier 1 (`enableHealing` + `healable.*`).

### Optional: mock LLM on the service (still no API key)

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=mock
npm run healing-service
```

---

## 6. Tier 3 — Real LLM (OpenAI or Anthropic)

API keys go on the **service only** — never in your Playwright test project.

### OpenAI

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=openai
export HEALING_LLM_API_KEY=sk-your-key-here
export HEALING_LLM_MODEL=gpt-4o-mini   # optional
npm run healing-service
```

### Anthropic

```bash
# Terminal 1
export HEALING_LLM_PROVIDER=anthropic
export HEALING_LLM_API_KEY=sk-ant-your-key-here
export HEALING_LLM_MODEL=claude-3-5-haiku-20241022   # optional
npm run healing-service
```

### Terminal 2 (same for both)

```bash
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npx playwright test
```

See [agentic-healing-setup.md](./agentic-healing-setup.md) for full LLM env reference.

---

## 7. Page objects (strategy chains)

If you already use page objects with explicit fallback locators:

```ts
import { clickHealing, fillHealing, type LocatorStrategy } from 'ai-healing-sdk';

const emailStrategies: LocatorStrategy[] = [
  { name: 'label-email', resolve: (p) => p.getByLabel(/email/i) },
  { name: 'css-email', resolve: (p) => p.locator('input[type="email"]').first() },
];

await fillHealing(page, emailStrategies, 'test@demo.com', {
  autoHeal: { enabled: true, agentMode: 'agentic' },
});

await clickHealing(page, [
  { name: 'btn-signin', resolve: (p) => p.getByRole('button', { name: /sign in/i }) },
], { autoHeal: { enabled: true } });
```

**Order matters:** static strategies run first; the agent loop runs only after all of them fail.

This is how `pages/login.page.ts` and other Nova Retail page objects work in this repo.

---

## 8. Attach healing details to HTML report

```ts
import { attachHealingSummary, healable } from 'ai-healing-sdk';

test('login with report', async ({ page }, testInfo) => {
  enableHealing(page, { healingEnabled: true });

  const result = await healable.click(page.getByRole('button', { name: /sign in/i }));
  await attachHealingSummary(testInfo, 'sign-in-click', result);
});
```

Open the report after the run:

```bash
npx playwright show-report
```

Look for attachments named `*-healing` with the winning strategy and all attempts.

---

## 9. Use in this monorepo (Nova Retail)

### Install and run

```bash
git clone <repo-url>
cd SelfHealingPlaywrightFramework
npm install
npm run install:browsers
```

### Run tests without healing (default)

```bash
npm test
```

Uses static locator chains in page objects only.

### Run with agentic healing

```bash
AUTO_HEAL_DISCOVER=1 npm test
```

### Run plug-and-play demo (external consumer pattern)

```bash
npm run test:plug-and-play
```

### Run healing showcases

```bash
npm run test:healing-showcases
```

### Run LLM agent unit tests (no browser)

```bash
npm run test:llm-agent
```

---

## 10. Environment variables (cheat sheet)

### SDK / test runner

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTO_HEAL_DISCOVER` | `off` | Set to `1` to enable healing after static locator failure |
| `HEALING_AGENT_MODE` | `agentic` | `agentic` \| `legacy` \| `off` |
| `HEALING_AGENT_MAX_ITERATIONS` | `3` | Max agent reflect loops |
| `HEALING_SERVICE_URL` | — | e.g. `http://localhost:3921` for remote service |
| `AUTO_HEAL_DOM_SCAN` | on | Set to `0` to disable DOM scan in legacy mode |
| `AUTO_HEAL_STRATEGIES` | `seed,dom-scan` | Discovery strategies in legacy path |
| `AUTO_HEAL_PERSIST` | `off` | Set to `1` to write healed locators back to page objects |
| `AUTO_HEAL_VERBOSE` | `off` | Verbose healing logs |

### healing-service only (not in tests)

| Variable | Default | Purpose |
|----------|---------|---------|
| `HEALING_LLM_PROVIDER` | `mock` | `mock` \| `heuristic` \| `openai` \| `anthropic` |
| `HEALING_LLM_API_KEY` | — | Required for OpenAI/Anthropic |
| `HEALING_LLM_MODEL` | provider default | Model override |
| `HEALING_SERVICE_PORT` | `3921` | Service port |

---

## 11. `enableHealing` options

```ts
enableHealing(page, {
  healingEnabled: true,       // master switch (or use AUTO_HEAL_DISCOVER=1)
  agentMode: 'agentic',       // 'agentic' | 'legacy' | 'off'
  maxAgentIterations: 3,
  confidenceThreshold: 0.7,   // min confidence for persistence
  persistenceEnabled: false,  // auto-write healed locators to disk
  telemetryEnabled: true,
  verboseLogs: false,
  healingServiceUrl: 'http://localhost:3921', // optional override
});
```

---

## 12. How healing behaves (flow)

```
Your locator (static)
        │
        ▼
     Success? ──yes──► Test continues
        │
        no
        ▼
  Healing enabled?
        │
        no ──► Test fails (normal Playwright error)
        │
        yes
        ▼
  Agent loop (up to 3 iterations)
    • Capture DOM + failure hints
    • Run tools (heuristics, optional LLM on service)
    • Propose new locators
    • Validate in browser (count + retry action)
    • Reflect on failure → next iteration
        │
        ▼
  Healed? ──yes──► Test continues + report attachment
        │
        no ──► Test fails with agent exhaustion error
```

---

## 13. What is / is not healed

| Healed | Not healed |
|--------|----------------|
| Broken CSS selector | Wrong expected URL or title |
| Changed button label / role | Incorrect assertion value |
| Moved input field | Business logic bugs |
| Missing `data-testid` (if alternative found) | Test data / API failures |

Healing fixes **locators**, not **test intent**.

---

## 14. Troubleshooting

### Healing never runs

- Confirm `AUTO_HEAL_DISCOVER=1` or `healingEnabled: true`.
- Confirm you use `healable.click` / `healable.fill` (not raw `locator.click`).
- Static locator might still be passing — healing only runs after failure.

### `fetch failed` to healing-service

- Start the service: `npm run healing-service`.
- Set `HEALING_SERVICE_URL=http://localhost:3921`.
- Or use Tier 1 (no service) and unset `HEALING_SERVICE_URL`.

### LLM errors

- Set `HEALING_LLM_API_KEY` on the **service** terminal, not the test terminal.
- Try `HEALING_LLM_PROVIDER=mock` first to verify the path works.
- Use `HEALING_LLM_PROVIDER=heuristic` to disable LLM and use rules only.

### Tests pass but wrong element clicked

- Lower risk: use static strategy chains with specific locators first.
- Enable `discoverOnly: true` in demos until you trust heal quality.
- Review `attachHealingSummary` output in the HTML report.

### Want old behavior (no agent loop)

```bash
export HEALING_AGENT_MODE=legacy
```

---

## 15. Quick copy-paste recipes

### Recipe A — New project, minimal

```bash
npm install ai-healing-sdk @playwright/test
```

```ts
enableHealing(page, { healingEnabled: true });
await healable.click(page.getByRole('button', { name: 'Submit' }));
```

```bash
AUTO_HEAL_DISCOVER=1 npx playwright test
```

### Recipe B — This monorepo + healing

```bash
AUTO_HEAL_DISCOVER=1 npm test
```

### Recipe C — Service + mock LLM

```bash
# Terminal 1
HEALING_LLM_PROVIDER=mock npm run healing-service

# Terminal 2
HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 npm test
```

### Recipe D — Service + OpenAI

```bash
# Terminal 1
HEALING_LLM_PROVIDER=openai HEALING_LLM_API_KEY=sk-... npm run healing-service

# Terminal 2
HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 npm test
```

---

## 15. Phase 8 — Autonomous login (NL goal, zero locators in spec)

Run a journey from a **natural-language goal** with no pre-written locators in the test file. The mock planner parses login credentials from the goal text; actions use hint-based discovery plus agentic healing on failure.

```typescript
import { test, expect } from '@playwright/test';
import { enableHealing, runAutonomousTest, attachAutonomousTrace } from 'ai-healing-sdk';

test('autonomous login @autonomous-login', async ({ page }, testInfo) => {
  enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });

  const result = await runAutonomousTest(page, {
    goal: 'Log in with test@demo.com / password123 and leave the login page.',
    startUrl: '/login',
    maxSteps: 25,
    healOnFailure: true,
  });

  await attachAutonomousTrace(testInfo, result);

  expect(result.status).toBe('completed');
  await expect(page).not.toHaveURL(/\/login\/?$/);
});
```

```bash
# Build workspace packages, then run the demo
npm run test:autonomous-login
```

Optional: `POST /autonomous/plan` on `healing-service` returns the same mock plan JSON (execution stays in the SDK).

---

## 16. Phase 9 — Multi-step checkout + verification + replan

Autonomous journeys now support **add-to-cart → checkout** with:

- **Verification agent** — URL, cart, and products checks recorded in `result.verifications`
- **Replan on assertion failure** — up to `maxReplans` recovery steps (default 2)
- **10-journey evaluation set** — `NOVA_RETAIL_EVALUATION_JOURNEYS` in `autonomous-test-agent`

```typescript
const result = await runAutonomousTest(page, {
  goal: 'Log in with test@demo.com / password123, add the first product to cart, and reach checkout.',
  startUrl: '/login',
  maxSteps: 30,
  maxReplans: 2,
  timeoutPerActionMs: 20_000,
});
```

```bash
npm run test:autonomous-checkout
# All autonomous demos + evaluation plan unit tests
npm run test:autonomous
RUN_UNIT_TESTS=1 npx playwright test tests/autonomous-evaluation.unit.spec.ts
```

---

## 17. Phase 10 — Production governance (CI-safe autonomous suite)

Production-ready autonomous runs add **env-based secrets**, **domain allowlists**, **cost caps**, **human review**, and **suite KPIs**.

### Environment variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `AUTONOMOUS_CUSTOMER_EMAIL` | Injected into `{{CUSTOMER_EMAIL}}` goals | `test@demo.com` |
| `AUTONOMOUS_CUSTOMER_PASSWORD` | Injected into `{{CUSTOMER_PASSWORD}}` goals | (set in CI secrets) |
| `AUTONOMOUS_ALLOWED_DOMAINS` | Comma-separated hostname allowlist | `vercel.app` |
| `AUTONOMOUS_MAX_COST_USD` | Per-run cost cap (estimated) | `0.25` |
| `AUTONOMOUS_MAX_SUITE_COST_USD` | Suite rollup cap | `0.50` |
| `AUTONOMOUS_PLANNER` | `mock` (CI default) or `llm` | `mock` |

### Secret-safe goals (recommended for CI)

```typescript
import { AUTONOMOUS_GOAL_TEMPLATES, runAutonomousSuite, AUTONOMOUS_CI_SMOKE_JOURNEYS } from 'ai-healing-sdk';

const suite = await runAutonomousSuite(page, AUTONOMOUS_CI_SMOKE_JOURNEYS, {
  defaults: {
    plannerMode: 'mock',
    governance: { maxCostUsdPerRun: 0.25, maxCostUsdPerSuite: 0.5 },
  },
});
// suite.kpis.goalCompletionRate, avgStepsExecuted, totalEstimatedCostUsd
```

Templates use placeholders — never commit real passwords in goal strings:

```text
Log in with {{CUSTOMER_EMAIL}} / {{CUSTOMER_PASSWORD}}, add the first product to cart, and reach checkout.
```

### Human review + generated specs

Failed runs set `result.governance.needsHumanReview = true`. Attach review package to the HTML report or write artifacts:

```typescript
import { attachAutonomousHumanReview, writeAutonomousReviewArtifact } from 'ai-healing-sdk';

if (result.governance.needsHumanReview) {
  await attachAutonomousHumanReview(testInfo, result);
  writeAutonomousReviewArtifact(result); // autonomous-review/*.txt, *.json, optional *.spec.ts
}
```

### CI / nightly

```bash
npm run test:autonomous-ci-smoke
```

GitHub Actions: `.github/workflows/autonomous-nightly.yml` (schedule + manual dispatch). Release-gate PR CI still runs healing showcases only; autonomous smoke is a separate governed job.

---

## 18. Phase 11 — Maintenance agent (locator persistence + tickets)

After autonomous runs, the **maintenance agent** tracks repeated failures, proposes locator patches for human PR review, and emits Jira/Linear-ready ticket JSON.

### Enable

```bash
MAINTENANCE_AGENT=1 npm run test:autonomous-ci-smoke
```

| Variable | Purpose |
|----------|---------|
| `MAINTENANCE_AGENT` | Run maintenance analysis after each autonomous journey |
| `MAINTENANCE_TICKET_THRESHOLD` | Failures before ticket creation (default `3`) |
| `MAINTENANCE_OUTPUT_DIR` | Artifacts root (default `maintenance-output/`) |
| `MAINTENANCE_TICKET_PROVIDER` | `mock`, `jira`, or `linear` |
| `MAINTENANCE_PROPOSE_PERSIST` | Set to `0` to skip locator proposals |
| `MAINTENANCE_PUBLISH_JIRA` | Set to `1` to create Jira issues via REST API (requires `JIRA_*` below) |
| `MAINTENANCE_PUBLISH_CI_SUMMARY` | Set to `1` to post a **Task** per CI run with suite KPIs (default on when `MAINTENANCE_PUBLISH_JIRA=1` in CI) |
| `JIRA_CI_SUMMARY_ISSUE_TYPE` | Comma-separated issue types to try (default `Story,Task,Bug`) |
| `JIRA_PUBLISH_EVERY_RUN` | Set to `1` to force one Jira issue per CI workflow run |
| `JIRA_BASE_URL` | Jira Cloud site URL (e.g. `https://yourteam.atlassian.net`) |
| `JIRA_EMAIL` | Atlassian account email for API token auth |
| `JIRA_API_TOKEN` | [API token](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT_KEY` | Project key (e.g. `QA`) |
| `JIRA_ISSUE_TYPE` | Optional issue type name (default `Bug`) |

### Workflow

1. **Healed steps** → persistence proposal JSON + `*-APPLY.md` in `maintenance-output/patches/` (pending review)
2. **Failed steps** → failure counter in `.maintenance-failures.json`
3. **Repeated failures** (≥ threshold) → ticket JSON in `maintenance-output/tickets/`
4. **After human approval** → `applyMaintenanceProposal('path/to/proposal.json')` writes to page objects

```typescript
import { runAutonomousTestWithMaintenance, runMaintenanceAgentAsync, applyMaintenanceProposal } from 'ai-healing-sdk';

const { result, maintenance } = await runAutonomousTestWithMaintenance(page, options);
// maintenance?.proposals, maintenance?.tickets

// With live Jira publish after CI smoke:
const maintenance = await runMaintenanceAgentAsync(result, {
  publishTicketsLive: process.env.MAINTENANCE_PUBLISH_JIRA === '1',
});
// maintenance.publishResults → [{ published, externalId, externalUrl, ... }]

// Post-review:
applyMaintenanceProposal('maintenance-output/patches/prop-fill-email-123.json');
```

### Live Jira publish

**Two Jira behaviors:**

1. **CI run ticket (every run)** — GitHub Actions step `Publish Jira ticket (every run)` runs `npm run publish:ci-jira-ticket` with `if: always()`. One issue per workflow run; title like `[Autonomous QA] Run #123 PASS — 2026-06-12`.
2. **Maintenance bug tickets (Bug)** — only when the **same step fails repeatedly** (≥ `MAINTENANCE_TICKET_THRESHOLD`, default 3).

When `MAINTENANCE_PUBLISH_JIRA=1` and `JIRA_*` credentials are set, the SDK calls Jira Cloud REST API v3 and dedupes maintenance bugs by failure ID (`.maintenance-jira-published.json`). Persist `.maintenance-failures.json` between CI runs (GitHub Actions cache) so failure counts accumulate across nights.

```bash
# After a smoke run with repeated failures:
MAINTENANCE_PUBLISH_JIRA=1 npm run publish:maintenance-tickets

# Or inline during CI smoke:
MAINTENANCE_AGENT=1 MAINTENANCE_PUBLISH_JIRA=1 npm run test:autonomous-ci-smoke
```

GitHub Actions: add repository secrets `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` and set `MAINTENANCE_PUBLISH_JIRA: "1"` in `.github/workflows/autonomous-nightly.yml` when ready.

Manual / MCP: use `formatJiraIssueFields(ticket)` for custom integrations.

---

## 19. Phase 12 — LLM planner spike

The **LLM planner** turns natural-language goals into action plans via OpenAI, Anthropic, or a **mock LLM** (no API key — reuses deterministic plan JSON for CI).

### Enable locally

```bash
# Mock LLM (no API key) — same login plan shape, routed through LLM parse path
AUTONOMOUS_PLANNER=llm AUTONOMOUS_LLM_PROVIDER=mock npm run test:autonomous-llm-login

# Real OpenAI
AUTONOMOUS_PLANNER=llm AUTONOMOUS_LLM_PROVIDER=openai \
  AUTONOMOUS_LLM_API_KEY=sk-... npm run test:autonomous-llm-login
```

| Variable | Purpose |
|----------|---------|
| `AUTONOMOUS_PLANNER` | `mock` (default) or `llm` |
| `AUTONOMOUS_LLM_PROVIDER` | `mock`, `openai`, or `anthropic` |
| `AUTONOMOUS_LLM_API_KEY` | API key (or `HEALING_LLM_API_KEY`) |
| `AUTONOMOUS_LLM_MODEL` | Model override (default `gpt-4o-mini` / Claude Haiku) |
| `AUTONOMOUS_LLM_FALLBACK_MOCK` | Set to `1` to fall back to mock planner if LLM fails |
| `RUN_AUTONOMOUS_LLM` | Required to run `autonomous-login-llm.spec.ts` |

### In code

```typescript
import { runAutonomousTest } from 'ai-healing-sdk';

const result = await runAutonomousTest(page, {
  goal: 'Log in with test@demo.com / password123 and leave the login page.',
  startUrl: '/login',
  plannerMode: 'llm',
  governance: { requireMockPlannerInCi: false },
});
// result.planner → llm-autonomous-planner-v1-mock | openai | anthropic
```

### CI

- **Release gate** (`autonomous-nightly.yml`) still uses `AUTONOMOUS_PLANNER=mock` for deterministic smoke.
- **LLM spike workflow**: `.github/workflows/autonomous-llm-spike.yml` (manual dispatch, provider choice).

Service endpoint: `POST /autonomous/plan` with `{ "goal": "...", "plannerMode": "llm" }`.

---

## 20. Phase 13 — Page-state LLM planning + 10-journey eval

The LLM planner receives **live page state** (URL, title, visible buttons/inputs) before planning. On step failure, **LLM replan** proposes recovery steps (with rule-based fallback for assertions).

### Run evaluation harness

```bash
# Mock LLM — all 10 journeys, target 100% (mock plans are deterministic)
AUTONOMOUS_PLANNER=llm AUTONOMOUS_LLM_PROVIDER=mock npm run test:autonomous-eval

# Real OpenAI — target ≥70% completion (PRD metric)
AUTONOMOUS_PLANNER=llm AUTONOMOUS_LLM_PROVIDER=openai \
  AUTONOMOUS_LLM_API_KEY=sk-... npm run test:autonomous-eval
```

| Variable | Purpose |
|----------|---------|
| `RUN_AUTONOMOUS_EVAL` | Enable `autonomous-evaluation.spec.ts` |
| `AUTONOMOUS_ALLOW_LLM_IN_CI` | Allow LLM planner when `CI=true` |
| `AUTONOMOUS_LLM_REPLAN` | Set to `0` to disable LLM recovery replans |
| `AUTONOMOUS_EVAL_MIN_COMPLETION_RATE` | Pass threshold (default `0.7` for LLM, `1.0` for mock) |
| `AUTONOMOUS_MAX_SUITE_COST_USD` | Suite cost cap for eval run |

Credentials in goals sent to the LLM are **redacted** (`{{REDACTED_EMAIL}}` / `{{REDACTED_PASSWORD}}`).

### CI

Weekly + manual: `.github/workflows/autonomous-llm-eval.yml` — runs 10 Nova Retail journeys with LLM planner.

---

## 21. Phase 14 — LLM verification + held-out goals

After the agent signals `complete`, an **LLM verification agent** checks whether the goal was truly satisfied (not just that steps ran). Rule-based checks still run first; LLM adds a strict `llm-goal-satisfied` verdict.

### Enable

```bash
AUTONOMOUS_LLM_VERIFY=1 AUTONOMOUS_PLANNER=llm npm run test:autonomous-llm-login
```

| Variable | Purpose |
|----------|---------|
| `AUTONOMOUS_LLM_VERIFY` | Force LLM verification (default on when `plannerMode=llm`) |
| `RUN_AUTONOMOUS_HELD_OUT` | Run 5 paraphrased goals not in mock templates |
| `AUTONOMOUS_HELD_OUT_MIN_RATE` | Pass threshold for held-out set (default `0.6`) |

### Held-out eval (generalization)

```bash
AUTONOMOUS_PLANNER=llm AUTONOMOUS_LLM_PROVIDER=openai \
  AUTONOMOUS_LLM_API_KEY=sk-... npm run test:autonomous-held-out
```

Held-out goals use phrasing like *"Authenticate as…"* and *"shopping basket"* — mock planner templates do not match verbatim. Real OpenAI/Anthropic recommended for held-out; mock LLM uses extended goal-parser + strict verification.

---

## 22. Phase 15 — Closed-loop maintenance (Jira + PR bot)

Phase 15 closes the maintenance loop: repeated failures produce **rich Jira tickets** with linked locator proposals and LLM replan hints; after human approval, an optional **PR bot** opens a draft GitHub PR.

### Jira tickets with proposals + planner hints

When `MAINTENANCE_AGENT=1` and a step crosses the failure threshold, ticket bodies now include:

- **Linked locator proposals** — patch snippet, target file/method, approve commands
- **LLM replan / recovery hints** — replanned step IDs, target hints, page URLs from the failing run

Live publish (`MAINTENANCE_PUBLISH_JIRA=1`) sends the enriched body to Jira with fenced code blocks in ADF.

### Approve → draft PR workflow

```bash
# 1. Review proposal in maintenance-output/patches/
# 2. Approve (human gate)
npm run maintenance:approve -- maintenance-output/patches/prop-fill-email-123.json

# 3. Dry run — list what would be applied
MAINTENANCE_PR_DRY_RUN=1 npm run maintenance:open-pr

# 4. Apply approved patches + open draft PR (requires gh CLI + git push access)
MAINTENANCE_OPEN_PR=1 npm run maintenance:open-pr
```

| Variable | Purpose |
|----------|---------|
| `MAINTENANCE_OUTPUT_DIR` | Root for patches/tickets (default `maintenance-output/`) |
| `MAINTENANCE_PR_DRY_RUN` | List approved proposals without applying |
| `MAINTENANCE_OPEN_PR` | Apply approved proposals and run `gh pr create --draft` |
| `MAINTENANCE_PR_BASE` | Base branch for PR (default `main`) |

### GitHub Actions

- **Autonomous Nightly** — unchanged; uploads `maintenance-output/` artifacts
- **Maintenance PR Bot** — manual dispatch: `.github/workflows/maintenance-pr-bot.yml`
  - Dry run (default) or apply + open draft PR

### Exit criteria (Phase 15)

Repeated failure → Jira ticket with proposal link → human approves → draft PR updates page objects → re-run nightly green.

---

## 24. Phase 16 — Fully Autonomous v1 polish

Phase 16 adds **safety**, **leadership KPIs**, **trace→spec quality**, and an optional **vision spike** — positioning the platform as **Fully Autonomous v1** (with honest scope).

### Destructive action guard

Blocks pay / place-order / delete clicks unless the goal explicitly allows them:

```bash
# Blocked: goal "Browse catalog" + click "pay place order"
# Allowed: goal "Complete purchase and place order"
# Override: AUTONOMOUS_ALLOW_DESTRUCTIVE=1
```

| Variable | Purpose |
|----------|---------|
| `AUTONOMOUS_ALLOW_DESTRUCTIVE` | Allow all destructive clicks (use with care) |
| `allowDestructiveActions` | Per-run SDK option |

Blocked actions appear in governance as `destructiveActionsBlocked`.

### Dashboard KPIs

Suite KPIs now include **heal rate**, **LLM planner runs**, and **destructive actions blocked**:

```bash
npm run test:autonomous-ci-smoke   # writes autonomous-review/kpi-summary.json
npm run write:autonomous-kpis
```

Document shape: `{ "kind": "autonomous-kpi-v1", "kpis": { ... } }` — ingest into your Real-Time Testing Dashboard or Confluence.

### Trace → spec (human review)

Successful autonomous runs write review artifacts to `autonomous-review/`:

- `*-trace.txt` — full execution trace
- `*-generated.spec.ts` — starter Playwright spec with `@phase16-review-required`
- `*-review.json` — metadata for CI attachments

Generated specs include `enableHealing` and comments for self-healed steps. **Do not auto-merge.**

### Vision spike (optional)

```bash
AUTONOMOUS_VISION=1 AUTONOMOUS_PLANNER=llm npm run test:autonomous-llm-login
```

Captures a JPEG screenshot metadata note for the LLM planner prompt (DOM summary remains primary). Full vision LLM routing is experimental.

### Fully Autonomous v1 — honest positioning

| In scope | Out of scope |
|----------|--------------|
| NL goals + LLM/mock planner + verification | Any app, any goal without eval |
| Self-healing + maintenance closed loop | Zero human review |
| Governed CI (mock planner nightly, LLM eval weekly) | 100% deterministic real-LLM CI |
| Held-out generalization harness | Replacing all hand-written tests |

---

## 25. Next steps

1. Start with **Tier 1** in your project (`healable` + `AUTO_HEAL_DISCOVER=1`).
2. Add **HTML report attachments** for visibility.
3. Move to **Tier 2/3** when you need a shared service or real LLM.
4. Read the technical deck: `docs/Agentic-Healing-Technical-Presentation.pptx` (generate with `npm run deck:agentic`).
5. Roadmap to **fully autonomous AI agent**: [PRD-Fully-Autonomous-AI-Agent.md](./PRD-Fully-Autonomous-AI-Agent.md).

---

*Last updated: 2026-06-12*
