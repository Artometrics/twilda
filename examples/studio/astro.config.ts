import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { twilda } from "@twilda/astro";

const contentDir = fileURLToPath(new URL("./content", import.meta.url));

export default defineConfig({
  output: "static",
  outDir: "../../demo-dist/preview",
  integrations: [twilda({ contentDir })],
  build: {
    inlineStylesheets: "always",
  },
});
