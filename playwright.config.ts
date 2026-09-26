import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
  webServer: {
    command: "npx next dev --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "file:./prisma/dev.db",
      AUTH_SECRET:
        process.env.AUTH_SECRET || "ci-test-secret-at-least-32-characters-long",
      AUTH_TRUST_HOST: "true",
    },
  },
});
