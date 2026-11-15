import fs from "node:fs";
import path from "node:path";
import { defaultSite, parseSite, type SiteSettings } from "@twilda/core";

/**
 * `content/site.json`: the masthead and theme tokens, one file in git. A missing file
 * means the built-in Field Desk look, so a fresh clone builds without one.
 */
export function readSite(root = path.resolve(process.cwd(), "content")): SiteSettings {
  const file = path.join(root, "site.json");
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultSite();
    throw error;
  }
  return parseSite(raw);
}
