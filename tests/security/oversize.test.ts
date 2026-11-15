import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_JSON_BOUNDS, TwildaError, assertJsonBounds, defaultSite, documentSchema, parseDocument, parseSite, renderDocument, serializeSite } from "@twilda/core";
import { MAX_DOCUMENT_CHARS } from "../../packages/core/src/serialize";
import { MAX_SITE_CHARS } from "../../packages/core/src/site";
import { RICH_ARTICLE, RICH_PAGE, STRUCTURAL_KEYS, stringLeaves, withLeaf } from "./support";

const code = (error: unknown) => (error instanceof TwildaError ? error.code : String(error));

function timed<T>(label: string, limitMs: number, run: () => T): T {
  const started = performance.now();
  const value = run();
  const ms = performance.now() - started;
  assert.ok(ms < limitMs, `${label} took ${Math.round(ms)}ms (limit ${limitMs}ms)`);
  return value;
}

function arrayPaths(value: unknown, trail: Array<string | number> = []): Array<Array<string | number>> {
  if (Array.isArray(value)) return [trail, ...value.flatMap((item, index) => arrayPaths(item, [...trail, index]))];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => arrayPaths(item, [...trail, key]));
  return [];
}

test("a document file over the size cap is refused before it is parsed", () => {
  const huge = `{"id":"x","pad":"${"a".repeat(MAX_DOCUMENT_CHARS)}"}`;
  assert.throws(() => timed("oversize document", 500, () => parseDocument(huge)), (error) => code(error) === "too-large");
  const site = `{"version":1,"pad":"${"a".repeat(MAX_SITE_CHARS)}"}`;
  assert.throws(() => timed("oversize site", 500, () => parseSite(site)), (error) => code(error) === "invalid-site");
});

test("deeply nested JSON is refused without a stack overflow", () => {
  for (const depth of [1_000, 100_000]) {
    const text = `${"[".repeat(depth)}${"]".repeat(depth)}`;
    assert.throws(() => timed(`depth ${depth}`, 2000, () => parseDocument(text)), (error) => error instanceof TwildaError);
    const objects = `${'{"a":'.repeat(depth)}1${"}".repeat(depth)}`;
    assert.throws(() => timed(`object depth ${depth}`, 2000, () => parseDocument(objects)), (error) => error instanceof TwildaError);
  }
  const nested = JSON.parse(`${"[".repeat(5_000)}${"]".repeat(5_000)}`) as unknown;
  assert.throws(() => assertJsonBounds(nested), (error) => code(error) === "too-large");
});

test("very wide lists and objects are refused by a cheap walk before schema validation", () => {
  const blocks = Array.from({ length: 100_000 }, (_, index) => ({ id: `b${index}`, type: "paragraph", text: "x" }));
  const text = JSON.stringify({ ...RICH_ARTICLE, blocks });
  assert.ok(text.length < MAX_DOCUMENT_CHARS, "stays under the byte cap so the structural guard is what stops it");
  assert.throws(() => timed("100k blocks", 1500, () => parseDocument(text)), (error) => code(error) === "too-large");

  const keys = Object.fromEntries(Array.from({ length: 5_000 }, (_, index) => [`k${index}`, 1]));
  assert.throws(() => assertJsonBounds(keys), (error) => code(error) === "too-large");

  const manyNodes = Array.from({ length: 100 }, () => Array.from({ length: 1_000 }, () => 1));
  assert.throws(() => assertJsonBounds(manyNodes), (error) => code(error) === "too-large");
});

test("real documents sit far inside the structural bounds", () => {
  for (const doc of [RICH_ARTICLE, RICH_PAGE]) assert.doesNotThrow(() => assertJsonBounds(JSON.parse(JSON.stringify(doc))));
  assert.doesNotThrow(() => parseSite(serializeSite(defaultSite())));
  assert.ok(DEFAULT_JSON_BOUNDS.maxNodes >= 10_000);
});

test("every string field has a length cap", () => {
  for (const doc of [RICH_ARTICLE, RICH_PAGE]) {
    for (const leaf of stringLeaves(doc)) {
      if (STRUCTURAL_KEYS.has(String(leaf.path[leaf.path.length - 1]))) continue;
      const big = withLeaf(doc, leaf.path, "a".repeat(150_000));
      assert.equal(documentSchema.safeParse(big).success, false, `${leaf.path.join(".")} accepts 150k characters`);
    }
  }
});

test("every list has a maximum length", () => {
  for (const doc of [RICH_ARTICLE, RICH_PAGE]) {
    for (const trail of arrayPaths(doc)) {
      const copy = structuredClone(doc) as unknown as Record<string | number, unknown>;
      let cursor: unknown = copy;
      for (const key of trail) cursor = (cursor as Record<string | number, unknown>)[key];
      const list = cursor as unknown[];
      const last = list[list.length - 1];
      for (let i = 0; i < 500; i += 1) list.push(structuredClone(last));
      assert.equal(documentSchema.safeParse(copy).success, false, `${trail.join(".")} accepts 500 more items`);
    }
  }
});

test("validation of a hostile oversized list is fast and bounded in memory", () => {
  const before = process.memoryUsage().heapUsed;
  const blocks = Array.from({ length: 50_000 }, (_, index) => ({ id: `b${index}`, type: "paragraph", text: "x" }));
  const text = JSON.stringify({ ...RICH_ARTICLE, blocks });
  assert.throws(() => parseDocument(text));
  const grown = process.memoryUsage().heapUsed - before;
  assert.ok(grown < 400_000_000, `heap grew by ${Math.round(grown / 1e6)}MB`);
});

test("the renderer does no unbounded work on maximum-size fields", () => {
  const longText = "word ".repeat(2_000);
  const doc = documentSchema.safeParse(withLeaf(RICH_ARTICLE, ["blocks", 2, "text"], longText));
  if (doc.success) timed("render long paragraph", 500, () => renderDocument(doc.data, { annotate: true }));
  const bold = "**a** ".repeat(1_500);
  const bolded = documentSchema.safeParse(withLeaf(RICH_ARTICLE, ["blocks", 2, "text"], bold));
  if (bolded.success) timed("render many marks", 500, () => renderDocument(bolded.data));
});
