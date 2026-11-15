import path from "node:path";
import { type SiteSettings } from "@twilda/core";
import { readSiteFile } from "@twilda/core/node";

/**
 * `content/site.json`: the masthead and theme tokens, one file in git. A missing file
 * means the built-in Field Desk look, so a fresh clone builds without one.
 */
export function readSite(root = path.resolve(process.cwd(), "content")): SiteSettings {
  return readSiteFile(root);
}
