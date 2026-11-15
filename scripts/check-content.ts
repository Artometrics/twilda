import path from "node:path";
import { auditRepository } from "./lib/content-audit";

const root = path.resolve(process.argv[2] ?? ".");
const problems = auditRepository(root);

if (problems.length === 0) {
  console.log("check:content passed. Content, settings, and public files are clean.");
} else {
  console.error(`check:content found ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const problem of problems) console.error(`  ${problem.file}: ${problem.message}`);
  process.exit(1);
}
