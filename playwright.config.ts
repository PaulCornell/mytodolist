import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  // All tests share one server and database, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build the client first so the tests always run against the current code.
    command: "npm run build && node src/server.ts",
    url: `http://localhost:${PORT}/api/tasks`,
    // An in-memory database: empty on start, gone when the server stops.
    env: { DB_PATH: ":memory:", PORT: String(PORT) },
    reuseExistingServer: false,
  },
});
