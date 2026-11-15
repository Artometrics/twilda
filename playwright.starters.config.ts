import { defineConfig, devices } from "@playwright/test";

/** Each starter is built and previewed on its own port, then checked at 320, 390, and 1280 px. */
export const STARTER_PORTS = { corporate: 4401, magazine: 4402, leadgen: 4403 } as const;

export default defineConfig({
  testDir: "tests/e2e-starters",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], trace: "off" },
  webServer: (Object.entries(STARTER_PORTS) as Array<[keyof typeof STARTER_PORTS, number]>).map(([mode, port]) => ({
    command: `npm run starter:build -- ${mode} && node_modules/.bin/astro preview --root examples/starter-${mode} --host 127.0.0.1 --port ${port}`,
    env: { ASTRO_TELEMETRY_DISABLED: "1" },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  })),
});
