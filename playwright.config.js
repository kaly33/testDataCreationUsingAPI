// @ts-check
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  testDir: './src/tests',
  timeout: 60000, // 1 minute - faster timeout for UI tests
  reporter: 'list',
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    // Use a standard user agent to avoid detection as automation
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    launchOptions: {
      slowMo: 1000 // Add 1 second delay between actions
    }
  },
});

