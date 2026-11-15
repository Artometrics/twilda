import path from "node:path";
import { migrateLegacyLayout } from "../packages/core/src/load";

/**
 * Move the retired `content/articles|pages/<slug>.json` layout into
 * `content/<id>/draft.json` and `published.json`.
 *
 *   npm run migrate:content -- examples/studio/content --remove
 *   npm run migrate:content -- content --dry-run
 */
const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const root = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? "content");

const report = migrateLegacyLayout(root, {
  remove: flags.has("--remove"),
  force: flags.has("--force"),
  dryRun: flags.has("--dry-run"),
});
for (const item of report.moved) console.log(`${flags.has("--dry-run") ? "would move" : "moved"} ${path.relative(process.cwd(), item.from)} -> content/${item.id}/`);
for (const item of report.skipped) console.warn(`skipped ${path.relative(process.cwd(), item.from)}: ${item.reason}`);
if (report.moved.length === 0 && report.skipped.length === 0) console.log("Nothing to migrate.");
