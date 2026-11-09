import { defineConfig } from "astro/config";

/**
 * Public output is a fully static Astro site.
 * There is no adapter and no production SSR.
 * The visual editor is a separate Vite dev server and is not part of this build.
 */
export default defineConfig({
  output: "static",
});
