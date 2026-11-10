import type { AstroIntegration } from "astro";

/**
 * Marks an Astro app as a Twilda static reader.
 * It does not add an adapter, a route, or client JavaScript.
 * Pages import `loadContentTree` and `renderDocument` themselves.
 */
export function twilda(): AstroIntegration {
  return {
    name: "twilda",
    hooks: {
      "astro:config:setup": ({ config, logger }) => {
        if (config.output !== "static") {
          throw new Error('Twilda requires output: "static". Do not add an adapter to host the editor.');
        }
        logger.info("Twilda: static output only. The editor is not part of this build.");
      },
    },
  };
}

export { loadContentTree } from "../../core/src/load";
export { renderDocument, renderPreviewPage } from "../../core/src/render";
