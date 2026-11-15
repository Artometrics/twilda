/**
 * Node-only entry: reads the content tree from disk with `node:fs`.
 * Import it from build scripts and Astro frontmatter. The package root
 * (`@twilda/core`) has no Node imports and bundles for a browser.
 */
export { loadContentTree, type LoadedContent } from "./load";
