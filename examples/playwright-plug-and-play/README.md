# Plug-and-play agentic healing demo

Standalone Playwright project using `ai-healing-sdk` as an external package — no dependency on the parent monorepo `core/` folder.

## Install

```bash
npm install
```

From monorepo root:

```bash
npm run install:plug-and-play-demo
```

## Tier 1 — SDK agentic (in-process, no server)

```bash
npm test
```

Healing uses the pure agentic loop (`agentMode: 'agentic'`) with heuristic tools — no API keys.

## Tier 2 — Remote agentic service

```bash
# terminal 1 (from monorepo root)
npm run healing-service

# terminal 2
export HEALING_SERVICE_URL=http://localhost:3921
export AUTO_HEAL_DISCOVER=1
npm test
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_HEAL_DISCOVER` | off | Enable healing after static locator failure |
| `HEALING_AGENT_MODE` | `agentic` | `agentic` \| `legacy` \| `off` |
| `HEALING_AGENT_MAX_ITERATIONS` | `3` | Agent reflect loop cap |
| `HEALING_SERVICE_URL` | — | Optional remote agent gateway |
