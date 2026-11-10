import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: here,
  publicDir: fileURLToPath(new URL("../../examples/studio/public", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("../../demo-dist", import.meta.url)),
    emptyOutDir: false,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true,
  },
});
