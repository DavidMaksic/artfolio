import { defineConfig } from '@playwright/test';

// Load server's env variables
import dotenv from 'dotenv';
import path from 'path';
if (!process.env.CI) {
   dotenv.config({ path: path.resolve('server/.env') });
}

export default defineConfig({
   testDir: './e2e',
   timeout: 30 * 1000,
   expect: {
      timeout: 5000,
   },
   forbidOnly: !!process.env.CI,
   retries: process.env.CI ? 2 : 0,
   workers: process.env.CI ? 1 : undefined,
   reporter: 'html',
   use: {
      actionTimeout: 0,
      baseURL: process.env.CI
         ? 'http://localhost:4173'
         : 'http://localhost:5173',
      trace: 'on-first-retry',
      headless: !!process.env.CI,
   },
   globalSetup: './e2e/global-setup.ts',
   webServer: [
      {
         command: 'npm run dev --workspace=server',
         url: 'http://localhost:4000/health',
         reuseExistingServer: !process.env.CI,
         timeout: 120_000,
      },
      {
         command: process.env.CI
            ? 'npm run preview'
            : 'npm run dev --workspace=client',
         url: process.env.CI
            ? 'http://localhost:4173'
            : 'http://localhost:5173',
         reuseExistingServer: !process.env.CI,
         timeout: 120_000,
      },
   ],
});
