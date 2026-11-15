import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanFileName, scanRepository, scanText } from "../../scripts/lib/secret-scan";

// Token-shaped strings are assembled at run time so this file is itself clean.
const rep = (char: string, count: number) => char.repeat(count);
const SECRETS: Array<[string, string, string]> = [
  ["github-token", "ghp", `_${rep("a", 36)}`],
  ["github-token", "gho", `_${rep("B", 40)}`],
  ["github-fine-grained-token", "github_pat", `_${rep("A", 22)}_${rep("b", 59)}`],
  ["npm-token", "npm", `_${rep("c", 36)}`],
  ["aws-access-key-id", "AKIA", rep("A", 16)],
  ["google-api-key", "AIza", "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG"],
  ["slack-token", "xoxb", `-${rep("1", 12)}-${rep("a", 8)}`],
  ["stripe-live-key", "sk_live", `_${rep("a", 26)}`],
  ["private-key-block", "-----BEGIN RSA PRIVATE", " KEY-----"],
  ["private-key-block", "-----BEGIN PRIVATE", " KEY-----"],
  ["service-account-private-key", `"private_key": "${"-----"}BEGIN`, " PRIVATE KEY-----"],
  ["jwt", `eyJ${rep("a", 12)}`, `.eyJ${rep("b", 12)}.${rep("c", 12)}`],
  ["credentials-in-url", "https://deploy", `:${rep("p", 12)}@git.internal.test/repo.git`],
  ["assigned-secret", 'const apiKey = "', `${rep("k", 30)}";`],
  ["google-oauth-refresh-token", "1//", `0${rep("g", 44)}`],
];

test("every credential shape is found, and the report never reprints the secret", () => {
  for (const [rule, head, tail] of SECRETS) {
    const text = `line one\nconst x = '${head}${tail}'\nline three`;
    const hits = scanText("a.ts", rule === "assigned-secret" ? `${head}${tail}` : text);
    assert.ok(hits.some((hit) => hit.rule === rule), `${rule} was not found in ${head}…`);
    for (const hit of hits) assert.ok(!hit.sample.includes(`${head}${tail}`) || `${head}${tail}`.length <= 10, `${rule} sample leaks the secret`);
  }
});

test("ordinary text, hashes, and short placeholders are not flagged", () => {
  const clean = [
    "const token = readToken();",
    'placeholder="ghp_your-token"',
    "github_pat_policy_walk_0123456789",
    "gho_csp_walk_token",
    `integrity sha512-${rep("A", 86)}==`,
    "const password = '';",
    `const color = "${rep("a", 40)}"`,
    "https://example.com/path",
    "https://user@example.com/",
    "AKIAEXAMPLEEXAMPLE0",
    "<!-- twilda-secret-allow: fixture -->",
    `token = "${rep("T", 30)}" // twilda-secret-allow: documented fake`,
  ];
  for (const line of clean) assert.deepEqual(scanText("a.ts", line), [], line);
});

test("key and credential files are flagged by name", () => {
  for (const name of [".env", "apps/x/.env.local", ".env.production", "keys/id_rsa", "ca.pem", "store.p12", "service-account.json", "my-firebase-adminsdk-abc.json", ".npmrc", ".netrc", "credentials.json"]) {
    assert.ok(scanFileName(name).length > 0, name);
  }
  for (const name of [".env.example", "src/env.ts", "docs/pem-notes.md", "package.json", "firebase.json", ".firebaserc"]) {
    assert.deepEqual(scanFileName(name), [], name);
  }
});

test("a repository scan finds a planted secret and passes the real tree", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-secrets-"));
  fs.writeFileSync(path.join(root, "ok.txt"), "nothing here\n");
  assert.deepEqual(scanRepository(root), []);
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.ts"), `export const t = "${SECRETS[0]?.[1]}${SECRETS[0]?.[2]}";\n`);
  fs.writeFileSync(path.join(root, ".env"), "X=1\n");
  const found = scanRepository(root).map((finding) => `${finding.file}:${finding.rule}`).sort();
  assert.deepEqual(found, [".env:env-file", "src/a.ts:github-token"]);
  assert.deepEqual(scanRepository(path.resolve(".")), [], "the repository tree must hold no credential-shaped strings");
});
