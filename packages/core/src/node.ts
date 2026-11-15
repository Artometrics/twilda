/**
 * Node-only entry: reads the content tree from disk with `node:fs`.
 * Import it from build scripts and Astro frontmatter. The package root
 * (`@twilda/core`) has no Node imports and bundles for a browser.
 */
export {
  listDocumentIds,
  loadContentTree,
  migrateLegacyLayout,
  readSiteFile,
  type LoadedContent,
  type MigrationReport,
} from "./load";
