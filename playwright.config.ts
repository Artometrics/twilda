import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "apps/demo-editor/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    ...devices["Pixel 5"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "npx vite --config apps/demo-editor/vite.config.ts --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
