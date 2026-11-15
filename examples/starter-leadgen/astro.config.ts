import { defineConfig } from "astro/config";
import { twilda } from "@twilda/astro";

/**
 * Fully static output, no adapter. The build never inlines a stylesheet or a small asset,
 * so the site works under a Content-Security-Policy with style-src 'self' and script-src 'none'.
 */
export default defineConfig({
  output: "static",
  integrations: [twilda({ contentDir: "./content" })],
  build: { inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
});
