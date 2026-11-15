import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { advisoriesFrom, evaluateAudit, validateAllowList, type AllowList } from "../../scripts/lib/audit-policy";

const via = (name: string, ghsa: string, severity: string) => ({ source: 1, name, title: `${name} problem`, url: `https://github.com/advisories/${ghsa}`, severity, range: "<1.0.0" });
const report = (...items: Array<ReturnType<typeof via>>) => ({
  vulnerabilities: Object.fromEntries(items.map((item) => [item.name, { name: item.name, via: [item, "transitive-name"] }])),
});
const allow = (...entries: Array<[string, string, string]>): AllowList => ({
  entries: entries.map(([pkg, ghsa, reviewBy]) => ({ package: pkg, ghsa, reviewBy, reason: "Explains in enough words why this advisory does not apply to Twilda." })),
});
const NOW = new Date("2026-11-15T12:00:00Z");

test("a high advisory that is not on the allowlist blocks", () => {
  const verdict = evaluateAudit(report(via("left-pad", "GHSA-aaaa-bbbb-cccc", "high")), allow(), NOW);
  assert.equal(verdict.blocking.length, 1);
  assert.equal(verdict.blocking[0]?.ghsa, "GHSA-aaaa-bbbb-cccc");
});

test("critical blocks and moderate does not", () => {
  const verdict = evaluateAudit(report(via("a", "GHSA-aaaa-bbbb-cccc", "critical"), via("b", "GHSA-dddd-eeee-ffff", "moderate")), allow(), NOW);
  assert.deepEqual(verdict.blocking.map((item) => item.package), ["a"]);
  assert.deepEqual(verdict.below.map((item) => item.package), ["b"]);
});

test("an allowed advisory passes until its review date, then blocks", () => {
  const input = report(via("zod", "GHSA-aaaa-bbbb-cccc", "high"));
  const ok = evaluateAudit(input, allow(["zod", "GHSA-aaaa-bbbb-cccc", "2026-11-15"]), NOW);
  assert.equal(ok.allowed.length, 1);
  assert.equal(ok.blocking.length + ok.expired.length, 0);
  const late = evaluateAudit(input, allow(["zod", "GHSA-aaaa-bbbb-cccc", "2026-11-14"]), NOW);
  assert.equal(late.expired.length, 1);
  assert.equal(late.allowed.length, 0);
});

test("an entry is tied to the package, so a new advisory in the same package still blocks", () => {
  const verdict = evaluateAudit(report(via("zod", "GHSA-zzzz-zzzz-zzzz", "high")), allow(["zod", "GHSA-aaaa-bbbb-cccc", "2027-01-01"]), NOW);
  assert.equal(verdict.blocking.length, 1);
  assert.equal(verdict.stale.length, 1);
  const wrongPackage = evaluateAudit(report(via("other", "GHSA-aaaa-bbbb-cccc", "high")), allow(["zod", "GHSA-aaaa-bbbb-cccc", "2027-01-01"]), NOW);
  assert.equal(wrongPackage.blocking.length, 1);
});

test("garbage input fails closed", () => {
  assert.ok(advisoriesFrom({}).malformed.length > 0);
  assert.ok(advisoriesFrom(null).malformed.length > 0);
  assert.ok(advisoriesFrom({ vulnerabilities: { x: { via: [{ title: "no id or severity" }] } } }).malformed.length > 0);
});

test("the allowlist file is valid, every entry explains itself, and none is already expired", () => {
  const list = validateAllowList(JSON.parse(fs.readFileSync("security/audit-allowlist.json", "utf8")));
  assert.ok(list.entries.length > 0);
  const keys = list.entries.map((entry) => `${entry.package}:${entry.ghsa}`);
  assert.equal(new Set(keys).size, keys.length, "no duplicate entries");
});

test("allowlist validation rejects a lazy entry", () => {
  const entry = { ghsa: "GHSA-aaaa-bbbb-cccc", package: "x", reason: "ok", reviewBy: "2027-01-01" };
  assert.throws(() => validateAllowList({ entries: [entry] }), /explain/);
  assert.throws(() => validateAllowList({ entries: [{ ...entry, reason: "r".repeat(60), reviewBy: "soon" }] }), /YYYY-MM-DD/);
  assert.throws(() => validateAllowList({ entries: [{ ...entry, reason: "r".repeat(60), ghsa: "CVE-1" }] }), /advisory id/);
  assert.throws(() => validateAllowList({}), /entries/);
});
