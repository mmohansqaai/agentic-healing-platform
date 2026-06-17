# ai-healing-cypress

Cypress adapter that implements `HealingDriver` from `ai-healing-core`.

## Install (in a Cypress project)

```bash
npm install ai-healing-core ai-healing-cypress
```

## Usage

```ts
import { enableHealing, healable } from 'ai-healing-cypress';

enableHealing({
  healingEnabled: true,
  healingServiceUrl: 'http://localhost:3921',
});

await healable.click('button[type="submit"]');
await healable.fill({ type: 'css', value: 'input[name="email"]' }, 'user@demo.com');
await healable.expectVisible({ type: 'role', role: 'alert', name: 'Success' });
```

## Notes

- This package is intentionally light and keeps `cypress` as a **peerDependency** (so the monorepo doesn’t have to install Cypress to build).
- `GeneratedLocatorQuery.type = 'role'` is currently a **best-effort** approximation in Cypress without `@testing-library/cypress`.

