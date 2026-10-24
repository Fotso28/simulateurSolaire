import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['E2E_PORT'] ?? 4300);
const baseURL = `http://localhost:${port}`;
const ci = !!process.env['CI'];

/**
 * Tests e2e du front : build de production (`nx build web`) servi par
 * `serve.mjs`. Sans `E2E_API_URL`, `/api/*` répond 503 et le front prend ses
 * replis locaux ; les appels de partage sont simulés par `page.route`.
 */
export default defineConfig({
  testDir: './src',
  outputDir: '../../dist/.playwright/apps/web-e2e/test-results',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: '../../dist/.playwright/apps/web-e2e/report',
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    locale: 'fr-FR',
    // Le service worker masquerait les `page.route` : seul le test hors-ligne l'active.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 800 },
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'node apps/web-e2e/serve.mjs',
    cwd: '../..',
    url: baseURL,
    reuseExistingServer: !ci,
    env: { E2E_PORT: String(port) },
  },
});
