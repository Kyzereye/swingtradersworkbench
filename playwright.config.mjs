/**
 * End-to-end tests. Starts a test backend (port 3002, StockPxLabs_test, no real email)
 * and a test frontend (port 5174) next to the normal dev servers (3001 / 5173).
 *
 *   npm run test:e2e
 */

import { defineConfig } from "@playwright/test";

export const TEST_DATABASE = "StockPxLabs_test";
const BACKEND_PORT = 3002;
const FRONTEND_PORT = 5174;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// Test files and helpers read this (through backend/src/db.js) to reach the test database.
process.env.MYSQL_DATABASE = TEST_DATABASE;

export default defineConfig({
  testDir: "tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.mjs",
  // Specs share one test database, so run them one at a time.
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: FRONTEND_URL,
    // The installed Google Chrome, so Playwright doesn't need its own browser download.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start --prefix backend",
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      env: {
        PORT: String(BACKEND_PORT),
        MYSQL_DATABASE: TEST_DATABASE,
        EMAIL_TRANSPORT: "log",
        FRONTEND_URL,
        GUEST_LOGIN_ENABLED: "true",
        GUEST_SESSION_SECRET: "e2e-guest-secret",
      },
    },
    {
      command: `npm run dev --prefix frontend -- --port ${FRONTEND_PORT} --strictPort`,
      url: FRONTEND_URL,
      reuseExistingServer: false,
      env: {
        API_TARGET: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
