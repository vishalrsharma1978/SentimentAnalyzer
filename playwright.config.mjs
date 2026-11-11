import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: 'http://localhost:8094', viewport: { width: 1440, height: 1000 }, actionTimeout: 15000, trace: 'retain-on-failure' },
  webServer: {
    command: 'npx expo start --web --port 8094',
    url: 'http://localhost:8094',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
