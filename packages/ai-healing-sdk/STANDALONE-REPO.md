# Standalone `ai-healing-sdk` repository

This package is designed to live in **its own git repo** and publish to npm. The SelfHealingPlaywrightFramework monorepo is a development workspace; consumers install only `ai-healing-sdk`.

## Extract a ready-to-push repo

From the monorepo root:

```bash
npm run extract:healing-sdk-repo
```

Output: `dist-packages/ai-healing-sdk-repo/`

```bash
cd dist-packages/ai-healing-sdk-repo
git init
git add .
git commit -m "Initial commit: ai-healing-sdk standalone"
git remote add origin git@github.com:mmohansqaai/ai-healing-sdk.git
git push -u origin main
```

## Before first npm publish

1. Edit `package.json` → set `repository`, `homepage`, `bugs` to your GitHub URLs.
2. `npm login`
3. `npm run build && npm test` (in `example/` after `npm install`)
4. `npm publish --access public`

## What is **not** in this repo

| Stays in monorepo only | Package |
|------------------------|---------|
| Nova Retail tests, pages | `examples/nova-retail-qa` |
| Autonomous / maintenance agent | `autonomous-qa-sdk` |
| healing-service gateway | `services/healing-service` |

## Sync changes from monorepo

After editing `packages/ai-healing-sdk` in the monorepo:

```bash
npm run extract:healing-sdk-repo
# copy or cherry-pick into your standalone repo, or replace tree and commit
```

Or use the standalone repo as the **source of truth** and submodule/vendor it back into the monorepo.

## Consumer install (any Playwright project)

```bash
npm install ai-healing-sdk @playwright/test
```

```typescript
import { enableHealing, healable } from 'ai-healing-sdk';
```

See `example/` in the extracted repo for a minimal working project.
