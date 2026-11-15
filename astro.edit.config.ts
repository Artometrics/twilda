import { defineConfig } from "astro/config";

/**
 * Phase 0 click-to-edit build target. Not the production site.
 *
 * `npm run build:edit` writes `dist-edit/`. It renders the same page template as
 * `astro build` plus `data-twilda-ref` hooks and the click-edit script.
 * `astro.config.ts` stays the production config: its output has no editing code.
 * Do not deploy `dist-edit/` over the public site. It contains the draft and the editor.
 */
export default defineConfig({
  output: "static",
  srcDir: "./click-edit",
  outDir: "./dist-edit",
  publicDir: "./public",
});
