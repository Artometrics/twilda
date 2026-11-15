import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin } from "vite";

const MEDIA_DIR = fileURLToPath(new URL("../../public/media/", import.meta.url));
const PLATE = /^[a-z0-9][a-z0-9-]*\.(?:svg|jpg|png|webp|gif)$/;
const TYPES: Record<string, string> = { svg: "image/svg+xml", jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const SITE_FILE = fileURLToPath(new URL("../../content/site.json", import.meta.url));
const SITE_VIRTUAL = "virtual:twilda-site";
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
    const match = /^\/media\/([a-z0-9][a-z0-9-]*\.(?:svg|jpg|png|webp|gif))(?:\?.*)?$/.exec(req.url ?? "");
    const file = match?.[1];
    if (!file || !plateFiles().includes(file)) return next();
    res.setHeader("content-type", TYPES[file.split(".").pop() ?? "svg"] ?? "application/octet-stream");
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

/** `content/site.json` as text (or null), so the desk dresses its page the way the site will. */
function twildaSite(): Plugin {
  return {
    name: "twilda-site",
    resolveId: (id) => (id === SITE_VIRTUAL ? `\0${SITE_VIRTUAL}` : undefined),
    load(id) {
      if (id !== `\0${SITE_VIRTUAL}`) return undefined;
      this.addWatchFile(SITE_FILE);
      return `export default ${JSON.stringify(existsSync(SITE_FILE) ? readFileSync(SITE_FILE, "utf8") : null)};`;
    },
  };
}

const FIREBASE_JSON = fileURLToPath(new URL("../../firebase.json", import.meta.url));

/**
 * The headers Firebase Hosting sends for the desk (`firebase.json`, target `twilda-desk`), so
 * `vite preview` and the CSP browser test run under the policy that is deployed. `vite dev`
 * is not given the policy: its hot-reload client injects inline script.
 */
export function deskHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(FIREBASE_JSON, "utf8")) as {
    hosting: Array<{ target?: string; headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }>;
  };
  const desk = config.hosting.find((entry) => entry.target === "twilda-desk");
  const all = desk?.headers?.find((entry) => entry.source === "**");
  // `upgrade-insecure-requests` would make WebKit try https for a local http server, so it is the one directive left out.
  const local = (header: { key: string; value: string }) =>
    header.key === "Content-Security-Policy" ? header.value.replace(/;\s*upgrade-insecure-requests/, "") : header.value;
  return Object.fromEntries(
    (all?.headers ?? [])
      .filter((header) => header.key !== "Cache-Control" && header.key !== "Strict-Transport-Security")
      .map((header) => [header.key, local(header)]),
  );
}

/**
 * Standalone desk. `astro build` does not load this config, and the Astro
 * site never imports this package, so the production `dist/` stays the
 * static magazine.
 */
export default defineConfig({
  plugins: [react(), twildaPlates(), twildaSite()],
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
    headers: deskHeaders(),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
