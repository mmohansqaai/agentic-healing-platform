#!/usr/bin/env node
/**
 * Extract healing platform monorepo (everything except Nova) into dist-packages/agentic-healing-platform.
 * Includes packages/ai-healing-sdk — all-in-one workspace (still publishable as separate npm package).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = join(ROOT, 'dist-packages', 'agentic-healing-platform');

const COPY_DIRS = [
  'packages/ai-healing-core',
  'packages/ai-healing-sdk',
  'packages/ai-healing-cypress',
  'packages/ai-healing-selenium',
  'packages/ai-healing-java',
  'packages/llm-provider',
  'examples/playwright-plug-and-play',
  'agents/locator-agent',
  'agents/llm-locator-agent',
  'services/healing-service',
  'core',
];

const COPY_FILES = [
  'playwright.config.ts',
  'playwright.phase2.config.ts',
  'playwright.phase3.config.ts',
  '.gitignore',
];

const ROOT_UNIT_TESTS = [
  'agentic-healing.unit.spec.ts',
  'ai-healing-sdk-phase1.spec.ts',
  'dom-scan-discovery.unit.spec.ts',
  'healing-service.unit.spec.ts',
  'locator-agent.unit.spec.ts',
  'llm-locator-agent.unit.spec.ts',
  'llm-provider.unit.spec.ts',
  'sdk-external-package.spec.ts',
  'self-healing-auto-heal.spec.ts',
];

const INTEGRATION_FROM_NOVA = [
  'healing-service-phase2.spec.ts',
  'locator-agent-phase3.spec.ts',
  'fixtures.ts',
  'demo-toast-helpers.ts',
];

const DOCS = [
  'agentic-healing-setup.md',
  'How-To-Use-Agentic-Healing.md',
  'PRD-Agentic-AI-Conversion.md',
  'dashboard-ingest.md',
];

const SCRIPTS = [
  'extract-healing-sdk-repo.mjs',
  'publish-healing-sdk-github.sh',
  'extract-healing-platform-repo.mjs',
  'publish-healing-platform-github.sh',
  'build-dashboard-payload.mjs',
];

function copyFiltered(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (p) => {
      const rel = p.slice(src.length + 1);
      if (!rel) return true;
      if (rel === 'node_modules' || rel.startsWith('node_modules/')) return false;
      if (rel === 'dist' || rel.startsWith('dist/')) return false;
      return true;
    },
  });
}

function patchJsonFile(filePath, mutator) {
  const pkg = JSON.parse(readFileSync(filePath, 'utf8'));
  mutator(pkg);
  writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function stripNovaDeps(dir) {
  for (const rel of [
    'package.json',
    join('agents', 'locator-agent', 'package.json'),
    join('agents', 'llm-locator-agent', 'package.json'),
    join('services', 'healing-service', 'package.json'),
    join('packages', 'llm-provider', 'package.json'),
    join('examples', 'playwright-plug-and-play', 'package.json'),
  ]) {
    const p = join(dir, rel);
    if (!existsSync(p)) continue;
    patchJsonFile(p, (pkg) => {
      delete pkg.dependencies?.['autonomous-agent-contracts'];
      delete pkg.dependencies?.['autonomous-test-agent'];
      delete pkg.dependencies?.['autonomous-qa-sdk'];
    });
  }
}

function patchHealingService(dir) {
  const serverPath = join(dir, 'services', 'healing-service', 'src', 'api', 'server.ts');
  writeFileSync(
    serverPath,
    `import express from 'express';
import { postHeal } from './heal-route';

export function createHealingServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'healing-service', version: '0.1.0' });
  });

  app.post('/heal', postHeal);

  return app;
}

export function startHealingServer(port = Number(process.env.HEALING_SERVICE_PORT || 3921)) {
  const app = createHealingServer();
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.info(\`[healing-service] listening on http://localhost:\${port}\`);
  });
}
`
  );
  const autonomousRoute = join(dir, 'services', 'healing-service', 'src', 'api', 'autonomous-plan-route.ts');
  if (existsSync(autonomousRoute)) rmSync(autonomousRoute);
}

function patchPlaywrightPhaseConfigs(dir) {
  for (const name of ['playwright.phase2.config.ts', 'playwright.phase3.config.ts']) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, 'utf8');
    text = text.replace(/testDir:\s*'\.\/examples\/nova-retail-qa\/tests'/, "testDir: './tests/integration'");
    writeFileSync(p, text);
  }
}

function writeRootPackageJson() {
  return {
    name: 'agentic-healing-platform',
    version: '1.0.0',
    private: true,
    description:
      'All-in-one agentic healing monorepo — ai-healing-sdk + healing-service + locator/LLM agents (no Nova).',
    workspaces: ['packages/*', 'services/*', 'agents/*'],
    scripts: {
      'build:core': 'npm run build -w ai-healing-core',
      'build:cypress': 'npm run build:core && npm run build -w ai-healing-cypress',
      'build:selenium': 'npm run build:core && npm run build -w ai-healing-selenium',
      'build:java': 'mvn -q -f packages/ai-healing-java/pom.xml package',
      'build:sdk': 'npm run build:core && npm run build -w ai-healing-sdk',
      'pack:sdk': 'npm run build:sdk && mkdir -p dist-packages && npm pack -w ai-healing-sdk --pack-destination ./dist-packages',
      'build:llm-provider': 'npm run build -w llm-provider',
      'build:locator-agent': 'npm run build:sdk && npm run build -w locator-agent',
      'build:llm-locator-agent':
        'npm run build:sdk && npm run build -w llm-provider && npm run build -w locator-agent && npm run build -w llm-locator-agent',
      'build:healing-service': 'npm run build:llm-locator-agent && npm run build -w healing-service',
      'healing-service': 'npm run build:healing-service && npm run start -w healing-service',
      'install:plug-and-play-demo': 'npm run build:sdk && npm install --prefix examples/playwright-plug-and-play',
      'test:plug-and-play': 'npm run install:plug-and-play-demo && npm run test:headed --prefix examples/playwright-plug-and-play',
      'test:plug-and-play:ci': 'npm run install:plug-and-play-demo && npm test --prefix examples/playwright-plug-and-play',
      'test:unit':
        'npm run build:llm-locator-agent && RUN_UNIT_TESTS=1 playwright test tests/*.unit.spec.ts',
      'test:healing-service-phase2':
        'HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 playwright test --config=playwright.phase2.config.ts',
      'test:locator-agent-phase3':
        'HEALING_SERVICE_URL=http://localhost:3921 AUTO_HEAL_DISCOVER=1 playwright test --config=playwright.phase3.config.ts',
      'test:llm-agent':
        'npm run build:llm-locator-agent && RUN_UNIT_TESTS=1 playwright test tests/llm-provider.unit.spec.ts tests/llm-locator-agent.unit.spec.ts tests/agentic-healing.unit.spec.ts',
      test: 'playwright test',
      'install:browsers': 'playwright install chromium',
      'extract:healing-sdk-repo': 'node scripts/extract-healing-sdk-repo.mjs',
      'publish:healing-sdk-github': 'bash scripts/publish-healing-sdk-github.sh',
    },
    dependencies: {
      'ai-healing-sdk': 'file:packages/ai-healing-sdk',
    },
    devDependencies: {
      '@playwright/test': '^1.51.0',
      '@types/node': '^22.10.0',
      typescript: '^5.7.0',
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/mmohansqaai/agentic-healing-platform.git',
    },
    homepage: 'https://github.com/mmohansqaai/agentic-healing-platform#readme',
    bugs: { url: 'https://github.com/mmohansqaai/agentic-healing-platform/issues' },
  };
}

function writeReadme() {
  return `# agentic-healing-platform

**All-in-one** agentic healing monorepo — SDK + service + agents. **No Nova / autonomous QA.**

## What's inside (one clone)

| Path | Package |
|------|---------|
| \`packages/ai-healing-core\` | Framework-agnostic \`HealingDriver\` + contracts (SaaS spine) |
| \`packages/ai-healing-sdk\` | Plug-and-play Playwright client (publish to npm) |
| \`packages/ai-healing-cypress\` | Cypress adapter (\`enableHealing\`, \`healable\`) |
| \`packages/ai-healing-selenium\` | Selenium WebDriver adapter (\`enableHealing\`, \`healable\`) |
| \`packages/ai-healing-java\` | Selenium Java HTTP client + \`Healable\` wrappers |
| \`services/healing-service\` | HTTP gateway (\`POST /heal\`) |
| \`agents/locator-agent\` | Multi-strategy locator recovery |
| \`agents/llm-locator-agent\` | LLM proposals + merge |
| \`packages/llm-provider\` | OpenAI / Anthropic / mock |
| \`examples/playwright-plug-and-play\` | Minimal demo |

Nova autonomous QA stays in [SelfHealingPlaywrightFramework](https://github.com/mmohansqaai/SelfHealingPlaywrightFramework).

## Quick start

\`\`\`bash
npm install
npm run build:healing-service
npm run healing-service          # http://localhost:3921
npm run test:plug-and-play
npm run test:unit
\`\`\`

## Use SDK (from this repo or npm)

**In-repo** (workspace):

\`\`\`typescript
import { enableHealing, healable } from 'ai-healing-sdk';
\`\`\`

**External project** (after \`npm publish\` or \`npm run publish:healing-sdk-github\`):

\`\`\`bash
npm install ai-healing-sdk @playwright/test
\`\`\`

## Publish SDK only (optional)

\`\`\`bash
npm run pack:sdk
npm run publish:healing-sdk-github   # sync to github.com/mmohansqaai/ai-healing-sdk
\`\`\`

See \`docs/agentic-healing-setup.md\`.
`;
}

function writeCiYml() {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:unit

  plug-and-play:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:plug-and-play:ci

  java-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
          cache: maven
      - run: mvn -q -f packages/ai-healing-java/pom.xml package
`;
}

function patchPlugAndPlayDep() {
  /* plug-and-play keeps file:../../packages/ai-healing-sdk from source copy */
}

function main() {
  console.log(`Extracting agentic-healing-platform → ${OUT}`);
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  for (const rel of COPY_DIRS) {
    copyFiltered(join(ROOT, rel), join(OUT, rel));
  }

  for (const f of COPY_FILES) {
    const src = join(ROOT, f);
    if (existsSync(src)) cpSync(src, join(OUT, f));
  }

  mkdirSync(join(OUT, 'tests'), { recursive: true });
  for (const f of ROOT_UNIT_TESTS) {
    const src = join(ROOT, 'tests', f);
    if (existsSync(src)) cpSync(src, join(OUT, 'tests', f));
  }

  const intDir = join(OUT, 'tests', 'integration');
  mkdirSync(intDir, { recursive: true });
  const novaTests = join(ROOT, 'examples', 'nova-retail-qa', 'tests');
  for (const f of INTEGRATION_FROM_NOVA) {
    cpSync(join(novaTests, f), join(intDir, f));
  }
  copyFiltered(join(ROOT, 'examples', 'nova-retail-qa', 'pages'), join(OUT, 'pages'));

  for (const f of INTEGRATION_FROM_NOVA) {
    const p = join(intDir, f);
    if (!existsSync(p)) continue;
    let text = readFileSync(p, 'utf8');
    text = text.replace(/from '\.\/fixtures'/g, "from './fixtures'");
    text = text.replace(/from '\.\.\/pages\//g, "from '../../pages/");
    writeFileSync(p, text);
  }
  const fixturesPath = join(intDir, 'fixtures.ts');
  if (existsSync(fixturesPath)) {
    let text = readFileSync(fixturesPath, 'utf8');
    text = text.replace(/from '\.\.\/pages\//g, "from '../../pages/");
    writeFileSync(fixturesPath, text);
  }

  mkdirSync(join(OUT, 'docs'), { recursive: true });
  for (const f of DOCS) {
    const src = join(ROOT, 'docs', f);
    if (existsSync(src)) cpSync(src, join(OUT, 'docs', f));
  }

  mkdirSync(join(OUT, 'scripts'), { recursive: true });
  for (const f of SCRIPTS) {
    const src = join(ROOT, 'scripts', f);
    if (existsSync(src)) cpSync(src, join(OUT, 'scripts', f));
  }

  mkdirSync(join(OUT, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(OUT, '.github', 'workflows', 'ci.yml'), writeCiYml());

  writeFileSync(join(OUT, 'package.json'), `${JSON.stringify(writeRootPackageJson(), null, 2)}\n`);
  writeFileSync(join(OUT, 'README.md'), writeReadme());

  const gitignore = readFileSync(join(OUT, '.gitignore'), 'utf8');
  writeFileSync(
    join(OUT, '.gitignore'),
    `${gitignore.replace(/maintenance-output\/\n/g, '').replace(/autonomous-review\/\n/g, '').replace(/\.maintenance-.*\n/g, '')}`
  );

  stripNovaDeps(OUT);
  patchHealingService(OUT);
  patchPlaywrightPhaseConfigs(OUT);

  const pwConfig = join(OUT, 'playwright.config.ts');
  if (existsSync(pwConfig)) {
    let text = readFileSync(pwConfig, 'utf8');
    text = text.replace(/Nova QA lives.*\n/, '');
    writeFileSync(pwConfig, text);
  }

  console.log('Done.');
}

main();
