/**
 * Turn `npm audit --json` into a pass or fail against a reviewed allowlist.
 *
 * A bare `npm audit` fails forever once an upstream fix needs a major upgrade, and a team that
 * sees a permanent red check stops reading it. This keeps the check meaningful: every high or
 * critical advisory must either be absent or be listed in `security/audit-allowlist.json` with
 * a reason and a review date. A new advisory fails the build. An expired entry fails the build.
 * An entry nothing reports any more is flagged so the list does not rot.
 */

export type Severity = "info" | "low" | "moderate" | "high" | "critical";
export const SEVERITY_RANK: Record<Severity, number> = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

export interface Advisory {
  ghsa: string;
  package: string;
  severity: Severity;
  title: string;
  range: string;
}

export interface AllowEntry {
  ghsa: string;
  package: string;
  reason: string;
  /** ISO date (YYYY-MM-DD) after which the entry no longer excuses the advisory. */
  reviewBy: string;
}

export interface AllowList {
  entries: AllowEntry[];
}

export interface AuditVerdict {
  blocking: Advisory[];
  allowed: Array<{ advisory: Advisory; entry: AllowEntry }>;
  below: Advisory[];
  expired: AllowEntry[];
  stale: AllowEntry[];
  malformed: string[];
}

interface NpmVia {
  source?: number;
  name?: string;
  title?: string;
  url?: string;
  severity?: string;
  range?: string;
}

interface NpmAuditReport {
  vulnerabilities?: Record<string, { via?: Array<string | NpmVia> }>;
}

const GHSA = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i;

export function advisoriesFrom(report: unknown): { advisories: Advisory[]; malformed: string[] } {
  const advisories = new Map<string, Advisory>();
  const malformed: string[] = [];
  const vulnerabilities = (report as NpmAuditReport | null)?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") {
    return { advisories: [], malformed: ["The audit output has no `vulnerabilities` object. Is it `npm audit --json`?"] };
  }
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === "string") continue;
      const match = GHSA.exec(via.url ?? "");
      const id = match ? `GHSA-${match[0].slice(5).toLowerCase()}` : via.source ? `npm-${via.source}` : "";
      const severity = (via.severity ?? "") as Severity;
      if (!id || !(severity in SEVERITY_RANK)) {
        malformed.push(`${name}: advisory without an id or severity`);
        continue;
      }
      advisories.set(`${via.name ?? name}:${id}`, {
        ghsa: id,
        package: via.name ?? name,
        severity,
        title: via.title ?? "",
        range: via.range ?? "",
      });
    }
  }
  return { advisories: [...advisories.values()], malformed };
}

export function evaluateAudit(report: unknown, allow: AllowList, now: Date, threshold: Severity = "high"): AuditVerdict {
  const { advisories, malformed } = advisoriesFrom(report);
  const verdict: AuditVerdict = { blocking: [], allowed: [], below: [], expired: [], stale: [], malformed };
  const byKey = new Map(allow.entries.map((entry) => [`${entry.package}:${entry.ghsa.toLowerCase()}`, entry]));
  const seen = new Set<string>();
  const today = now.toISOString().slice(0, 10);

  for (const advisory of advisories) {
    if (SEVERITY_RANK[advisory.severity] < SEVERITY_RANK[threshold]) {
      verdict.below.push(advisory);
      continue;
    }
    const key = `${advisory.package}:${advisory.ghsa.toLowerCase()}`;
    const entry = byKey.get(key);
    if (!entry) {
      verdict.blocking.push(advisory);
      continue;
    }
    seen.add(key);
    if (entry.reviewBy < today) verdict.expired.push(entry);
    else verdict.allowed.push({ advisory, entry });
  }
  for (const entry of allow.entries) {
    if (!seen.has(`${entry.package}:${entry.ghsa.toLowerCase()}`)) verdict.stale.push(entry);
  }
  return verdict;
}

export function validateAllowList(value: unknown): AllowList {
  const entries = (value as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries)) throw new Error("allowlist must be { entries: [...] }");
  for (const entry of entries as Array<Record<string, unknown>>) {
    for (const key of ["ghsa", "package", "reason", "reviewBy"]) {
      if (typeof entry[key] !== "string" || !(entry[key] as string).trim()) throw new Error(`allowlist entry is missing "${key}": ${JSON.stringify(entry)}`);
    }
    if (!/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(entry.ghsa as string)) throw new Error(`allowlist entry has a bad advisory id: ${String(entry.ghsa)}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewBy as string)) throw new Error(`allowlist reviewBy must be YYYY-MM-DD: ${String(entry.reviewBy)}`);
    if ((entry.reason as string).trim().length < 40) throw new Error(`allowlist reason for ${String(entry.ghsa)} must explain why the advisory does not apply`);
  }
  return { entries: entries as AllowEntry[] };
}
