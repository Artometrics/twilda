import { defineConfig, devices } from "@playwright/test";

/**
 * Runs the desk under the Content-Security-Policy that Firebase Hosting sends for it
 * (`firebase.json`, target `twilda-desk`). `vite preview` serves the production build with
 * those headers; `vite dev` cannot, because its hot-reload client injects inline script.
 */
export default defineConfig({
  testDir: "./e2e-csp",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:5175", trace: "retain-on-failure" },
  webServer: {
    command: "npx vite build && npx vite preview --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 14"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  ],
});
