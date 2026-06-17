# Agentic healing with LLM

> **New to this framework?** Start with [How-To-Use-Agentic-Healing.md](./How-To-Use-Agentic-Healing.md) for full step-by-step instructions.

Configure the healing-service sidecar for LLM-powered locator recovery. API keys stay on the **service**, never in Playwright tests.

## Quick start (mock LLM — no API key)

```bash
# terminal 1
export HEALING_LLM_PROVIDER=mock
npm run healing-service

# terminal 2
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
export HEALING_AGENT_MODE=agentic
npm test
```

## OpenAI

```bash
export HEALING_LLM_PROVIDER=openai
export HEALING_LLM_API_KEY=sk-...
export HEALING_LLM_MODEL=gpt-4o-mini   # optional
npm run healing-service
```

## Anthropic

```bash
export HEALING_LLM_PROVIDER=anthropic
export HEALING_LLM_API_KEY=sk-ant-...
export HEALING_LLM_MODEL=claude-3-5-haiku-20241022   # optional
npm run healing-service
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALING_LLM_PROVIDER` | `mock` | `mock`, `heuristic`, `openai`, `anthropic` |
| `HEALING_LLM_API_KEY` | — | Required for `openai` / `anthropic` (service only) |
| `HEALING_LLM_MODEL` | provider default | Model override |
| `HEALING_LLM_MAX_TOKENS` | `2000` | Max completion tokens |
| `HEALING_LLM_TIMEOUT_MS` | `30000` | API timeout |
| `HEALING_AGENT_MODE` | `agentic` | SDK agent loop mode |
| `HEALING_SERVICE_URL` | — | Route healing to service |

## Plug-and-play (consumer project)

```ts
enableHealing(page, { healingEnabled: true, agentMode: 'agentic' });
```

Set `HEALING_SERVICE_URL` only — no LLM keys in the test project.

## Legacy rule-only service

```bash
export HEALING_LLM_PROVIDER=heuristic
```

Skips `llm-locator-agent`; uses rule-based `locator-agent` only.
