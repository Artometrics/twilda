import { defineConfig } from "astro/config";

/**
 * Marketing site for twilda.com.
 * Fully static. Separate from the CMS app build in the repo root.
 *
 * Its Content-Security-Policy (firebase.json, target www) allows no inline style and no script,
 * so stylesheets stay files and small assets stay files instead of `data:` URLs.
 * `tests/dist-headers.test.ts` builds this site and checks the output against that policy.
 */
export default defineConfig({
  output: "static",
  site: "https://twilda.com",
  trailingSlash: "never",
  build: { inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
});
