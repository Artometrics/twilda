import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin } from "vite";

const MEDIA_DIR = fileURLToPath(new URL("../../public/media/", import.meta.url));
const PLATE = /^[a-z0-9-]+\.svg$/;
const VIRTUAL = "virtual:twilda-plates";

function plateFiles(): string[] {
  return existsSync(MEDIA_DIR) ? readdirSync(MEDIA_DIR).filter((name) => PLATE.test(name)).sort() : [];
}

/**
 * The template prints only repo plates at /media/<name>.svg. The desk reads the
 * repo's public/media so its WYSIWYG page shows the same plates the site does:
 * a virtual list for the picker, the files served in dev and preview, and
 * copied into the desk build.
 */
function twildaPlates(): Plugin {
  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const match = /^\/media\/([a-z0-9-]+\.svg)(?:\?.*)?$/.exec(req.url ?? "");
    const file = match?.[1];
    if (!file || !plateFiles().includes(file)) return next();
    res.setHeader("content-type", "image/svg+xml");
    res.end(readFileSync(`${MEDIA_DIR}${file}`));
  };
  return {
    name: "twilda-plates",
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
    load: (id) => (id === `\0${VIRTUAL}` ? `export default ${JSON.stringify(plateFiles().map((name) => `/media/${name}`))};` : undefined),
    configureServer: (server) => void server.middlewares.use(serve),
    configurePreviewServer: (server) => void server.middlewares.use(serve),
    generateBundle() {
      for (const name of plateFiles()) {
        this.emitFile({ type: "asset", fileName: `media/${name}`, source: readFileSync(`${MEDIA_DIR}${name}`) });
      }
    },
  };
}

/**
 * Standalone desk. `astro build` does not load this config, and the Astro
 * site never imports this package, so the production `dist/` stays the
 * static magazine.
 */
export default defineConfig({
  plugins: [react(), twildaPlates()],
  // OAuth client id is public. Vite only inlines VITE_* unless this prefix is listed.
  envPrefix: ["VITE_", "PUBLIC_"],
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
