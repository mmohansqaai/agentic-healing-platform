#!/usr/bin/env node
/**
 * Build a standalone git-ready tree for ai-healing-sdk (no Nova, no monorepo).
 * Output: dist-packages/ai-healing-sdk-repo/
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SDK = join(ROOT, 'packages', 'ai-healing-sdk');
const CORE = join(ROOT, 'packages', 'ai-healing-core');
const PLUG_AND_PLAY = join(ROOT, 'examples', 'playwright-plug-and-play');
const OUT = join(ROOT, 'dist-packages', 'ai-healing-sdk-repo');

const GITIGNORE = `# dependencies
node_modules/
dist/

# playwright
test-results/
playwright-report/
blob-report/

# os
.DS_Store

# env
.env
.env.*
`;

const CI_YML = `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install SDK dependencies
        run: npm install

      - name: Build ai-healing-core + SDK
        run: |
          npm run build --prefix deps/ai-healing-core
          npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run example tests
        working-directory: example
        run: |
          npm install
          npm test
`;

function copyDir(src, dest, { skip = [] } = {}) {
  mkdirSync(dest, { recursive: true });
  for (const name of skip) {
    if (!existsSync(join(src, name))) continue;
  }
  cpSync(src, dest, {
    recursive: true,
    filter: (srcPath) => {
      const rel = srcPath.slice(src.length + 1);
      if (!rel) return true;
      if (rel === 'node_modules' || rel.startsWith('node_modules/')) return false;
      if (rel === 'dist' || rel.startsWith('dist/')) return false;
      for (const s of skip) {
        if (rel === s || rel.startsWith(`${s}/`)) return false;
      }
      return true;
    },
  });
}

function patchExamplePackageJson() {
  const raw = readFileSync(join(PLUG_AND_PLAY, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw);
  pkg.dependencies['ai-healing-sdk'] = 'file:..';
  pkg.scripts = {
    test: 'playwright test',
    'test:headed': 'HEADED=1 playwright test --headed',
  };
  delete pkg.scripts.postinstall;
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function patchSdkPackageJson() {
  const raw = readFileSync(join(SDK, 'package.json'), 'utf8');
  const pkg = JSON.parse(raw);
  pkg.files = ['dist', 'README.md', 'LICENSE', 'STANDALONE-REPO.md'];
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies['ai-healing-core'] = 'file:./deps/ai-healing-core';
  pkg.repository = {
    type: 'git',
    url: 'git+https://github.com/mmohansqaai/ai-healing-sdk.git',
  };
  pkg.bugs = { url: 'https://github.com/mmohansqaai/ai-healing-sdk/issues' };
  pkg.homepage = 'https://github.com/mmohansqaai/ai-healing-sdk#readme';
  pkg.scripts = {
    ...pkg.scripts,
    test: 'npm run build && cd example && npm install && npm test',
    prepublishOnly: 'npm run build',
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function main() {
  console.log(`Extracting standalone ai-healing-sdk → ${OUT}`);
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  copyDir(join(SDK, 'src'), join(OUT, 'src'));
  cpSync(join(SDK, 'tsconfig.json'), join(OUT, 'tsconfig.json'));
  cpSync(join(SDK, 'README.md'), join(OUT, 'README.md'));
  cpSync(join(SDK, 'LICENSE'), join(OUT, 'LICENSE'));
  cpSync(join(SDK, 'STANDALONE-REPO.md'), join(OUT, 'STANDALONE-REPO.md'));

  const coreOut = join(OUT, 'deps', 'ai-healing-core');
  copyDir(join(CORE, 'src'), join(coreOut, 'src'));
  cpSync(join(CORE, 'tsconfig.json'), join(coreOut, 'tsconfig.json'));
  cpSync(join(CORE, 'package.json'), join(coreOut, 'package.json'));
  cpSync(join(CORE, 'README.md'), join(coreOut, 'README.md'));

  writeFileSync(join(OUT, 'package.json'), patchSdkPackageJson());
  writeFileSync(join(OUT, '.gitignore'), GITIGNORE);
  mkdirSync(join(OUT, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(OUT, '.github', 'workflows', 'ci.yml'), CI_YML);

  mkdirSync(join(OUT, 'example'), { recursive: true });
  copyDir(join(PLUG_AND_PLAY, 'tests'), join(OUT, 'example', 'tests'));
  if (existsSync(join(PLUG_AND_PLAY, 'playwright.config.ts'))) {
    cpSync(join(PLUG_AND_PLAY, 'playwright.config.ts'), join(OUT, 'example', 'playwright.config.ts'));
  }
  writeFileSync(join(OUT, 'example', 'package.json'), patchExamplePackageJson());

  console.log('');
  console.log('Done. Next steps:');
  console.log(`  cd ${OUT}`);
  console.log('  npm install && npm run build');
  console.log('  git init && git add . && git commit -m "Initial commit: ai-healing-sdk"');
  console.log('  # Edit package.json repository URLs, then push to GitHub');
  console.log('  # npm publish --access public');
}

main();
