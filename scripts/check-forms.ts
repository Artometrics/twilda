import path from "node:path";
import { checkForms } from "./lib/forms-check";

/**
 * `npm run check:forms [contentDir] [--strict]`
 *
 * A published form needs a form address in content/site.json, and a form address that no page uses
 * widens the Content-Security-Policy for nothing. Errors fail the run; warnings fail only with --strict.
 */
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const dir = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? "content");
const report = checkForms(dir);

for (const warning of report.warnings) console.warn(`warning: ${warning}`);
for (const error of report.errors) console.error(`error: ${error}`);
if (report.errors.length > 0 || (strict && report.warnings.length > 0)) {
  console.error(`check:forms failed for ${path.relative(process.cwd(), dir) || "."}.`);
  process.exit(1);
}
console.log(
  `check:forms passed for ${path.relative(process.cwd(), dir) || "."}: ${report.formSections.length} form section${report.formSections.length === 1 ? "" : "s"}, ${report.site?.forms ? "form address set" : "no form address"}.`,
);
