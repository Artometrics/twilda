import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { twilda } from "../../packages/astro/src/index";

const contentDir = fileURLToPath(new URL("./content", import.meta.url));

export default defineConfig({
  output: "static",
  outDir: "../../demo-dist/preview",
  integrations: [twilda()],
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    define: {
      __TWILDA_CONTENT__: JSON.stringify(contentDir),
    },
  },
});
