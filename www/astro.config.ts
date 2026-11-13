import { defineConfig } from "astro/config";

/**
 * Marketing site for twilda.com.
 * Fully static. Separate from the CMS app build in the repo root.
 */
export default defineConfig({
  output: "static",
  site: "https://twilda.com",
  trailingSlash: "never",
});
