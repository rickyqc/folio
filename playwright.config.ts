import { defineConfig, devices } from '@playwright/test';

// Pages are built first by `npm run test:e2e` into dist-e2e/sample and dist-e2e/full.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4400',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node scripts/serve.mjs dist-e2e 4400',
      url: 'http://localhost:4400/sample/',
      reuseExistingServer: !process.env['CI'],
    },
    {
      // Folio's website, served at the root the way Vercel serves it.
      command: 'node scripts/serve.mjs dist-e2e/website 4401',
      url: 'http://localhost:4401/',
      reuseExistingServer: !process.env['CI'],
    },
  ],
});
