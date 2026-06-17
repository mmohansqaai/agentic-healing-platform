import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'https://retail-website-fawn.vercel.app';
const healingServicePort = process.env.HEALING_SERVICE_PORT ?? '3921';
const healingServiceUrl = process.env.HEALING_SERVICE_URL ?? `http://localhost:${healingServicePort}`;

export default defineConfig({
  testDir: './tests/integration',
  testMatch: ['**/healing-service-phase2.spec.ts'],
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    headless: false,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
    channel: (process.env.PW_USE_SYSTEM_CHROME === '0' ? undefined : 'chrome') as 'chrome' | undefined,
  },
  projects: [
    {
      name: 'healing-service-phase2',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
      },
    },
  ],
  webServer: {
    command: 'npm run build:healing-service && npm run start -w healing-service',
    url: `${healingServiceUrl}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      HEALING_SERVICE_PORT: healingServicePort,
      HEALING_SERVICE_VERBOSE: '1',
    },
  },
});
