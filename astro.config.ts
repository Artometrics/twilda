import { defineConfig } from "astro/config";

/**
 * Public output is a fully static Astro site.
 * There is no adapter and no production SSR.
 * The visual editor is a separate Vite dev server and is not part of this build.
 *
 * The site's Content-Security-Policy (firebase.json) allows no inline style and no script,
 * so the build must never inline either: stylesheets stay files, and small assets stay files
 * instead of becoming `data:` URLs. `tests/dist-headers.test.ts` checks the built output.
 */
export default defineConfig({
  output: "static",
  build: { inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
});
