import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { twildaApi } from "./api-plugin";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * Dev-only editor. `astro build` does not load this config.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  // Astro runs its own Vite server. A shared node_modules/.vite cache makes
  // the two servers invalidate each other (504 Outdated Optimize Dep).
  cacheDir: fileURLToPath(new URL("../node_modules/.vite-twilda-editor", import.meta.url)),
  plugins: [react(), twildaApi()],
  server: {
    // Loopback only, so `npm run dev:editor` cannot bind a public interface.
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
});
