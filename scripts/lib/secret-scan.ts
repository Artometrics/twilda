import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * A dependency-free secret check for the working tree. It looks for the shapes of real
 * credentials (tokens with a vendor prefix, private keys, credentials inside URLs, key files
 * by name). CI also runs gitleaks over the full history; this one runs offline, in `npm test`,
 * and on every pull request, so a token is caught before it is ever pushed.
 *
 * A line may opt out with the marker `twilda-secret-allow` and a reason, for a fixture that
 * must contain a token-shaped string. The patterns are anchored to vendor formats on purpose:
 * a generic "looks random" rule flags lockfile hashes and teaches people to ignore the check.
 */

export interface Finding {
  file: string;
  line: number;
  rule: string;
  /** The match with its middle replaced, so the report never reprints a secret. */
  sample: string;
}

interface Rule {
  id: string;
  pattern: RegExp;
}

export const RULES: Rule[] = [
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/ },
  { id: "github-fine-grained-token", pattern: /\bgithub_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}\b/ },
  { id: "npm-token", pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { id: "aws-access-key-id", pattern: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}\b/ },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: "google-oauth-refresh-token", pattern: /\b1\/\/0[0-9A-Za-z_-]{40,}\b/ },
  { id: "google-oauth-client-secret", pattern: /\bGOCSPX-[A-Za-z0-9_-]{28}\b/ },
  { id: "slack-token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: "stripe-live-key", pattern: /\b[sr]k_live_[0-9a-zA-Z]{24,}\b/ },
  { id: "sendgrid-key", pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/ },
  { id: "private-key-block", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/ },
  { id: "service-account-private-key", pattern: /"private_key"\s*:\s*"-----BEGIN/ },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { id: "credentials-in-url", pattern: /\bhttps?:\/\/[^\s/:@'"<>]{2,}:[^\s/@'"<>]{3,}@[A-Za-z0-9.-]+/ },
  {
    id: "assigned-secret",
    pattern: /\b(?:secret|password|passwd|api[_-]?key|private[_-]?key|access[_-]?token|auth[_-]?token)\b["']?\s*[:=]\s*["'][A-Za-z0-9/+_=.-]{24,}["']/i,
  },
];

const FILE_NAME_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: "env-file", pattern: /(?:^|\/)\.env(?:\.(?!example$|sample$|template$)[A-Za-z0-9_-]+)?$/ },
  { id: "private-key-file", pattern: /(?:^|\/)(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$|\.(?:pem|p12|pfx|jks|keystore)$/ },
  { id: "service-account-file", pattern: /(?:^|\/)(?:service-?account[^/]*|[^/]*firebase-adminsdk[^/]*)\.json$/i },
  { id: "credentials-file", pattern: /(?:^|\/)(?:\.npmrc|\.netrc|\.git-credentials|credentials\.json|\.firebase\/hosting[^/]*)$/ },
];

/** Placeholders that are not secrets even when they match a pattern's shape. */
const ALLOW_VALUE = /(?:EXAMPLE|PLACEHOLDER|REDACTED|XXXXXXXX|your[_-]?token|<[^>]+>)/i;

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "dist-edit", ".astro", "test-results", "playwright-report"]);
const SKIP_FILES = new Set(["package-lock.json"]);
const TEXT_LIMIT = 2_000_000;

function mask(value: string): string {
  if (value.length <= 10) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
}

/** Scan one text for credential shapes. */
export function scanText(file: string, text: string): Finding[] {
  const found: Finding[] = [];
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line.includes("twilda-secret-allow")) return;
    if (line.length > 20_000) return;
    for (const rule of RULES) {
      const match = rule.pattern.exec(line);
      if (!match) continue;
      if (ALLOW_VALUE.test(match[0])) continue;
      found.push({ file, line: index + 1, rule: rule.id, sample: mask(match[0]) });
    }
  });
  return found;
}

export function scanFileName(file: string): Finding[] {
  const rel = file.split(path.sep).join("/");
  return FILE_NAME_RULES.filter((rule) => rule.pattern.test(rel)).map((rule) => ({ file: rel, line: 0, rule: rule.id, sample: path.basename(rel) }));
}

/** Files git tracks, or every file under `root` when it is not a git checkout. */
export function listFiles(root: string): string[] {
  try {
    const out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    return out.toString("utf8").split("\0").filter(Boolean);
  } catch {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(path.relative(root, full));
      }
    };
    walk(root);
    return files;
  }
}

export function scanRepository(root: string): Finding[] {
  const findings: Finding[] = [];
  for (const rel of listFiles(root)) {
    const parts = rel.split(/[\\/]/);
    if (parts.some((part) => SKIP_DIRS.has(part))) continue;
    if (SKIP_FILES.has(path.basename(rel))) continue;
    findings.push(...scanFileName(rel));
    const full = path.join(root, rel);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(full);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > TEXT_LIMIT) continue;
    const bytes = fs.readFileSync(full);
    if (bytes.subarray(0, 4000).includes(0)) continue;
    findings.push(...scanText(rel.split(path.sep).join("/"), bytes.toString("utf8")));
  }
  return findings;
}
