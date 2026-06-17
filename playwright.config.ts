import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'https://retail-website-fawn.vercel.app';

export default defineConfig({
  testDir: './tests',
  // Skip tests/traceability/ unless RUN_TRACEABILITY=1 (e.g. npm run test:traceability).
  // Skip *.unit.spec.ts unless RUN_UNIT_TESTS=1 (npm run test:llm-agent / test:unit).
  testIgnore: [
    ...(process.env.RUN_UNIT_TESTS === '1' ? [] : ['**/*.unit.spec.ts']),
  ],
  // Stores traces/screenshots/videos for each run.
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
    // Set PW_USE_SYSTEM_CHROME=1 to use installed Google Chrome (skip `npm run install:browsers`).
    ...(process.env.PW_USE_SYSTEM_CHROME === '1' ? { channel: 'chrome' as const } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
