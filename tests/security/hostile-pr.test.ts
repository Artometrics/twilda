import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultSite, serializeDocument, serializeSite } from "@twilda/core";
import { loadContentTree } from "@twilda/core/node";
import { auditRepository, unsafeJsonKeys } from "../../scripts/lib/content-audit";
import { listPublished, readPublished } from "../../src/content/store";
import { readSite } from "../../src/content/site";
import { RICH_ARTICLE } from "./support";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
const SAFE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>`;

function repo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "twilda-pr-"));
}

function write(root: string, file: string, content: string | Buffer): void {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function cleanRepo(): string {
  const root = repo();
  const published = { ...RICH_ARTICLE, id: "note", slug: "note", status: "published" } as typeof RICH_ARTICLE;
  write(root, "content/note/published.json", serializeDocument(published));
  write(root, "content/note/draft.json", serializeDocument({ ...published, status: "draft" }));
  write(root, "content/site.json", serializeSite(defaultSite()));
  write(root, "content/data/chart.csv", "a,b\n1,2\n");
  write(root, "public/media/plate.svg", SAFE_SVG);
  write(root, "public/media/photo.jpg", Buffer.concat([JPEG, Buffer.from("payload")]));
  write(root, "public/favicon.svg", SAFE_SVG);
  write(root, "public/robots.txt", "User-agent: *\nDisallow: /\n");
  return root;
}

const messages = (root: string) => auditRepository(root).map((problem) => `${problem.file}: ${problem.message}`);

test("a clean tree passes the audit (and the real repository does too)", () => {
  assert.deepEqual(messages(cleanRepo()), []);
  assert.deepEqual(auditRepository(path.resolve(".")), []);
});

test("a PR that adds script-capable files to a public folder is flagged", () => {
  for (const [file, content] of [
    ["public/evil.html", "<script>alert(1)</script>"],
    ["public/evil.js", "alert(1)"],
    ["public/evil.xml", "<x/>"],
    ["public/evil.svgz", "x"],
    ["public/sub/evil.php", "<?php"],
    ["public/media/evil.js", "alert(1)"],
    ["public/media/Evil.JPG", JPEG],
    ["public/media/evil name.jpg", JPEG],
    ["public/media/nested/evil.jpg", JPEG],
    ["public/unknown.bin", "x"],
    ["public/noext", "x"],
  ] as Array<[string, string | Buffer]>) {
    const root = cleanRepo();
    write(root, file, content);
    assert.ok(messages(root).some((line) => line.startsWith(`${file}:`)), `not flagged: ${file}`);
  }
});

test("a PR that adds a hostile SVG is flagged", () => {
  for (const svg of [
    `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>`,
    `<html><body>not an svg</body></html>`,
  ]) {
    const root = cleanRepo();
    write(root, "public/media/evil.svg", svg);
    assert.ok(messages(root).some((line) => line.startsWith("public/media/evil.svg:")), svg);
  }
});

test("a PR that adds a polyglot or mislabeled raster image is flagged", () => {
  const root = cleanRepo();
  write(root, "public/media/poly.jpg", Buffer.concat([JPEG, Buffer.from("<script>alert(1)</script>")]));
  write(root, "public/media/lie.png", JPEG);
  write(root, "public/media/text.gif", "GIF-not-really <html>");
  const found = messages(root);
  for (const name of ["poly.jpg", "lie.png", "text.gif"]) assert.ok(found.some((line) => line.startsWith(`public/media/${name}:`)), name);
});

test("a PR that adds a symbolic link anywhere in a served or read folder is flagged", () => {
  for (const [file, target] of [
    ["public/media/leak.jpg", "/etc/passwd"],
    ["content/note/extra.json", "../../public/robots.txt"],
    ["content/site2.json", "/etc/hostname"],
    ["public/linkdir", "../content"],
  ] as const) {
    const root = cleanRepo();
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.symlinkSync(target, path.join(root, file));
    assert.ok(messages(root).some((line) => line.startsWith(`${file}:`) && /symbolic link/.test(line)), file);
  }
});

test("a PR that edits content into something hostile is flagged", () => {
  const cases: Array<[string, string, RegExp]> = [
    ["content/note/published.json", `{"id":"note"}`, /./],
    ["content/note/published.json", "not json", /JSON/],
    ["content/note/published.json", serializeDocument({ ...RICH_ARTICLE, id: "other", slug: "other", status: "published" }), /folder/],
    ["content/note/published.json", serializeDocument({ ...RICH_ARTICLE, id: "note", slug: "note", status: "draft" }), /published\.json must say/],
    ["content/note/published.json", JSON.stringify({ ...RICH_ARTICLE, id: "note", slug: "note", status: "published", title: "x" }).replace("{", '{"__proto__":{"polluted":true},'), /__proto__/],
    ["content/note/published.json", JSON.stringify({ ...RICH_ARTICLE, id: "note", slug: "note", status: "published", blocks: [{ id: "a", type: "paragraph", text: "x".repeat(200_000) }] }), /./],
    ["content/note/published.json", JSON.stringify({ ...RICH_ARTICLE, id: "note", slug: "note", status: "published", blocks: [{ id: "a", type: "embed", kind: "video", src: "javascript:alert(1)", title: "x", caption: "" }] }), /./],
    ["content/site.json", serializeSite(defaultSite()).replace('"paper": "#f3efe4"', '"paper": "red;}</style><script>alert(1)</script>"'), /paper/],
    ["content/site.json", "{}", /./],
    ["content/data/chart.csv", "a,b\u0000\n", /NUL/],
    ["content/data/big.csv", "x".repeat(1_100_000), /limited/],
    ["content/Bad-Id/draft.json", "{}", /not a file/],
    ["content/note/evil.html", "<script>", /not a file/],
    ["content/evil.js", "alert(1)", /not a file/],
    ["content/data/evil.html", "<script>", /not a file/],
  ];
  for (const [file, content, expected] of cases) {
    const root = cleanRepo();
    write(root, file, content);
    const found = messages(root).filter((line) => line.startsWith(`${file}:`));
    assert.ok(found.length > 0 && found.some((line) => expected.test(line)), `${file} ${expected}: ${JSON.stringify(found)}`);
  }
});

test("unsafeJsonKeys finds polluting keys at any depth", () => {
  assert.deepEqual(unsafeJsonKeys('{"a":{"b":[{"__proto__":1}]}}'), ["__proto__"]);
  assert.deepEqual(unsafeJsonKeys('{"a":{"constructor":{"prototype":{}}}}').sort(), ["constructor", "prototype"]);
  assert.deepEqual(unsafeJsonKeys('{"a":1}'), []);
});

test("the static build's reader refuses what the audit flags", () => {
  const root = cleanRepo();
  const content = path.join(root, "content");
  assert.equal(listPublished(content).length, 1, "the clean fixture is readable");

  const linked = cleanRepo();
  fs.rmSync(path.join(linked, "content/note/published.json"));
  fs.symlinkSync(path.join(root, "content/note/published.json"), path.join(linked, "content/note/published.json"));
  assert.throws(() => readPublished("note", path.join(linked, "content")), /symbolic link/);
  assert.throws(() => loadContentTree(path.join(linked, "content")), /symbolic link/);

  const siteLinked = cleanRepo();
  fs.rmSync(path.join(siteLinked, "content/site.json"));
  fs.symlinkSync(path.join(root, "content/site.json"), path.join(siteLinked, "content/site.json"));
  assert.throws(() => readSite(path.join(siteLinked, "content")), /symbolic link/);

  const big = cleanRepo();
  write(big, "content/note/published.json", `{"id":"note","pad":"${"a".repeat(9_000_000)}"}`);
  assert.throws(() => readPublished("note", path.join(big, "content")), /too large/);
  assert.throws(() => loadContentTree(path.join(big, "content")), /too large/);

  const mismatched = cleanRepo();
  write(mismatched, "content/note/published.json", serializeDocument({ ...RICH_ARTICLE, id: "other", slug: "other", status: "published" }));
  assert.throws(() => readPublished("note", path.join(mismatched.toString(), "content")), /does not match folder/);
});

test("a draft is never read by the static build, even when it is the only file", () => {
  const root = repo();
  write(root, "content/secret/draft.json", serializeDocument({ ...RICH_ARTICLE, id: "secret", slug: "secret", status: "draft", title: "Unannounced" }));
  assert.deepEqual(loadContentTree(path.join(root, "content")).articles, []);
  assert.deepEqual(listPublished(path.join(root, "content")), []);
  assert.equal(readPublished("secret", path.join(root, "content")), null);
});

test("a published.json that says draft is not published", () => {
  const root = repo();
  write(root, "content/early/published.json", serializeDocument({ ...RICH_ARTICLE, id: "early", slug: "early", status: "draft" }));
  assert.deepEqual(loadContentTree(path.join(root, "content")).articles, []);
});
