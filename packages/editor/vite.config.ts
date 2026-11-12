import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Standalone desk. `astro build` does not load this config, and the Astro
 * site never imports this package, so the production `dist/` stays the
 * static magazine.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    fs: { allow: ["../.."] },
  },
  preview: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
