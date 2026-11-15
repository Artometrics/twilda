import path from "node:path";
import { checkForms } from "./lib/forms-check";

/**
 * `npm run headers -- <contentDir> [--json]`
 *
 * Prints the Content-Security-Policy a site should be served with. With no form it is the locked
 * policy in firebase.json. With a form it opens `form-action`, `script-src 'self'`, and (in fetch
 * mode) `connect-src` to the one origin of `forms.endpoint`, and nothing else.
 */
const args = process.argv.slice(2);
const dir = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? "content");
const report = checkForms(dir);
if (report.errors.length > 0 || !report.csp) {
  for (const error of report.errors) console.error(`error: ${error}`);
  process.exit(1);
}
for (const warning of report.warnings) console.error(`warning: ${warning}`);
if (args.includes("--json")) {
  console.log(JSON.stringify({ key: "Content-Security-Policy", value: report.csp }, null, 2));
} else {
  console.log(`Content-Security-Policy: ${report.csp}`);
}
