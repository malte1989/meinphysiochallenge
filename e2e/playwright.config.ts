import { defineConfig } from '@playwright/test';

// Läuft gegen `docker compose up` (Oberfläche auf :5173). Videos und Traces dienen als Material für das Loom.
export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    video: 'on',
    trace: 'on',
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1100, height: 900 } } }],
});
