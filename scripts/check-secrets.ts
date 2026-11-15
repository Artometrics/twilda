import path from "node:path";
import { scanRepository } from "./lib/secret-scan";

const root = path.resolve(process.argv[2] ?? ".");
const findings = scanRepository(root);

if (findings.length === 0) {
  console.log("check:secrets passed. No credential-shaped strings or key files in the tree.");
} else {
  console.error(`check:secrets found ${findings.length} possible secret${findings.length === 1 ? "" : "s"}:`);
  for (const finding of findings) console.error(`  ${finding.file}${finding.line ? `:${finding.line}` : ""}  ${finding.rule}  ${finding.sample}`);
  console.error("\nIf one is real: revoke it first, then remove it from the tree. History keeps it until it is rotated.");
  console.error("If one is a fixture, build it at run time or add a `twilda-secret-allow: <reason>` comment on that line.");
  process.exit(1);
}
