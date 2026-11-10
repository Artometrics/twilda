import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "phone",
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true },
    },
    {
      name: "desk",
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
  ],
});
