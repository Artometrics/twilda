import { defineConfig } from "astro/config";

const proxy = (process.env.PUBLIC_TWILDA_DEVICE_FLOW_PROXY ?? "").trim();
let proxyOrigin = "";
try {
  proxyOrigin = proxy ? new URL(proxy).origin : "";
} catch {
  proxyOrigin = "";
}

/**
 * The policy `astro preview` sends for the edit build. `astro dev` injects inline scripts
 * of its own, so the strict policy applies to the built output only. Nothing here is deployed.
 * The device-flow proxy, when one is configured at build time, is the only extra connect origin.
 */
export const EDIT_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'none'",
  `connect-src 'self' https://api.github.com${proxyOrigin ? ` ${proxyOrigin}` : ""}`,
  "worker-src 'none'",
  "manifest-src 'none'",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
].join("; ");

/**
 * Phase 0 click-to-edit build target. Not the production site.
 *
 * `npm run build:edit` writes `dist-edit/`. It renders the same page template as
 * `astro build` plus `data-twilda-ref` hooks and the click-edit script.
 * `astro.config.ts` stays the production config: its output has no editing code.
 * Do not deploy `dist-edit/` over the public site. It contains the draft and the editor.
 */
export default defineConfig({
  output: "static",
  srcDir: "./click-edit",
  outDir: "./dist-edit",
  publicDir: "./public",
  build: { inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
  server: {
    headers: {
      "Content-Security-Policy": EDIT_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
