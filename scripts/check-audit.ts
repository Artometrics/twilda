import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { SEVERITY_RANK, evaluateAudit, validateAllowList, type Severity } from "./lib/audit-policy";

/**
 * `tsx scripts/check-audit.ts [--dir <path>]... [--allowlist <file>] [--level high] [--from <audit.json>]`
 * Runs `npm audit --json` in each directory (default: the root, www/, and packages/editor/) and applies the reviewed allowlist.
 */
const args = process.argv.slice(2);
const dirs: string[] = [];
let allowFile = "security/audit-allowlist.json";
let level: Severity = "high";
const from: string[] = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--dir") dirs.push(args[++i] as string);
  else if (arg === "--allowlist") allowFile = args[++i] as string;
  else if (arg === "--level") level = args[++i] as Severity;
  else if (arg === "--from") from.push(args[++i] as string);
  else throw new Error(`Unknown argument ${String(arg)}`);
}
if (!(level in SEVERITY_RANK)) throw new Error(`Unknown level ${level}`);
if (dirs.length === 0 && from.length === 0) dirs.push(".", "www", "packages/editor");

const merged: Record<string, unknown> = {};
const merge = (label: string, report: { vulnerabilities?: Record<string, unknown>; error?: { summary?: string } }) => {
  if (report.error) {
    console.error(`npm audit could not run in ${label}: ${report.error.summary ?? "unknown error"}. It needs the npm registry.`);
    process.exit(2);
  }
  for (const [name, value] of Object.entries(report.vulnerabilities ?? {})) merged[`${label}:${name}`] = value;
};

for (const dir of dirs) {
  const result = spawnSync("npm", ["audit", "--json"], { cwd: path.resolve(dir), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    merge(dir, JSON.parse(result.stdout) as never);
  } catch {
    console.error(`npm audit printed something that is not JSON in ${dir}:\n${result.stdout.slice(0, 400)}${result.stderr.slice(0, 400)}`);
    process.exit(2);
  }
}
for (const file of from) merge(file, JSON.parse(fs.readFileSync(file, "utf8")) as never);

const allow = validateAllowList(JSON.parse(fs.readFileSync(allowFile, "utf8")));
const verdict = evaluateAudit({ vulnerabilities: merged }, allow, new Date(), level);

const line = (a: { ghsa: string; package: string; severity: string; title: string }) => `  ${a.severity.padEnd(8)} ${a.package.padEnd(8)} ${a.ghsa}  ${a.title}`;
if (verdict.allowed.length) {
  console.log(`Accepted (${verdict.allowed.length}), each with a reason and review date in ${allowFile}:`);
  for (const { advisory, entry } of verdict.allowed) console.log(`${line(advisory)}  [review by ${entry.reviewBy}]`);
}
if (verdict.below.length) console.log(`Below ${level}: ${verdict.below.length} advisories reported only (${[...new Set(verdict.below.map((a) => a.package))].join(", ")}).`);
if (verdict.stale.length) {
  console.log(`Stale allowlist entries (no longer reported, remove them):`);
  for (const entry of verdict.stale) console.log(`  ${entry.package} ${entry.ghsa}`);
}
let failed = false;
for (const problem of verdict.malformed) {
  console.error(`Unreadable audit entry: ${problem}`);
  failed = true;
}
if (verdict.expired.length) {
  failed = true;
  console.error("Allowlist entries past their review date. Re-check each one, then upgrade or extend with a new reason:");
  for (const entry of verdict.expired) console.error(`  ${entry.package} ${entry.ghsa} (review by ${entry.reviewBy})`);
}
if (verdict.blocking.length) {
  failed = true;
  console.error(`New ${level}-or-worse advisories that are not on the allowlist:`);
  for (const advisory of verdict.blocking) console.error(line(advisory));
}
if (failed) process.exit(1);
console.log(`check:audit passed (threshold ${level}).`);
