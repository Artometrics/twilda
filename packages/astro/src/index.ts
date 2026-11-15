import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Plugin } from "vite";

export { loadContentTree } from "@twilda/core/node";
export { renderDocument, renderPreviewPage } from "@twilda/core";

export interface TwildaOptions {
  /**
   * Directory of `articles/*.json` and `pages/*.json`.
   * Absolute, or relative to the Astro project root. Default: `content`.
   */
  contentDir?: string;
}

/**
 * Static Twilda reader for an Astro site.
 *
 * - Refuses any output other than `static`, so the editor cannot ride along on SSR.
 * - Resolves the content directory and exposes it as `__TWILDA_CONTENT__`.
 * - Adds the `twilda:content` module: `loadPublished()` and `renderDocument`.
 *
 * Pages stay responsible for HTML. This does not add an adapter or a route.
 */
export function twilda(options: TwildaOptions = {}): AstroIntegration {
  return {
    name: "@twilda/astro",
    hooks: {
      "astro:config:setup": ({ config, logger, updateConfig }) => {
        if (config.output !== "static") {
          throw new Error('Twilda requires output: "static". Do not add an adapter to host the editor.');
        }
        const contentDir = resolveContentDir(config.root, options.contentDir ?? "content");
        updateConfig({
          vite: {
            define: {
              __TWILDA_CONTENT__: JSON.stringify(contentDir),
            },
            plugins: [contentModule(contentDir)],
          },
        });
        logger.info(`Twilda reading published JSON from ${contentDir}. The editor is not part of this build.`);
      },
    },
  };
}

function resolveContentDir(root: URL, contentDir: string): string {
  if (path.isAbsolute(contentDir)) return contentDir;
  return path.resolve(fileURLToPath(root), contentDir);
}

function contentModule(contentDir: string): Plugin {
  const virtual = "twilda:content";
  const resolved = "\0twilda:content";
  return {
    name: "twilda-content",
    resolveId(id) {
      if (id === virtual) return resolved;
    },
    load(id) {
      if (id !== resolved) return null;
      return `
        import { renderDocument } from "@twilda/core";
        import { loadContentTree } from "@twilda/core/node";
        export const contentDir = ${JSON.stringify(contentDir)};
        export function loadPublished() {
          return loadContentTree(contentDir);
        }
        export { renderDocument };
      `;
    },
  };
}
