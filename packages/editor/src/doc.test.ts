import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SLUG_PATTERN, createArticle, normalizeDoc, parseDocJson, slugify, uniqueSlug } from "./doc";
import { BLOCK_CATALOG, createBlock, fingerprint, type ArticleDoc } from "./model";

describe("slugs", () => {
  it("turns titles into hyphenated lowercase slugs", () => {
    assert.equal(slugify("Franchise: Why the Toy Aisle Outearns the Box Office"), "franchise-why-the-toy-aisle-outearns-the-box-office");
    assert.equal(slugify("Café & Crème"), "cafe-and-creme");
    assert.equal(slugify("   !!!  "), "untitled");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = slugify("word ".repeat(40), 20);
    assert.ok(slug.length <= 20);
    assert.match(slug, SLUG_PATTERN);
  });

  it("avoids taken slugs", () => {
    assert.equal(uniqueSlug("My piece", []), "my-piece");
    assert.equal(uniqueSlug("My piece", ["my-piece"]), "my-piece-2");
    assert.equal(uniqueSlug("My piece", ["my-piece", "my-piece-2"]), "my-piece-3");
  });
});

describe("createArticle", () => {
  it("starts with one empty paragraph and a valid slug", () => {
    const doc = createArticle({ title: "  Hello World  ", now: "2026-11-12T00:00:00.000Z" });
    assert.equal(doc.id, "hello-world");
    assert.equal(doc.slug, "hello-world");
    assert.equal(doc.title, "Hello World");
    assert.equal(doc.blocks.length, 1);
    assert.equal(doc.blocks[0]?.type, "paragraph");
    assert.equal(doc.updatedAt, "2026-11-12T00:00:00.000Z");
  });

  it("does not collide with existing ids", () => {
    const doc = createArticle({ title: "Hello", taken: ["hello"] });
    assert.equal(doc.id, "hello-2");
  });

  it("falls back to a title when none is typed", () => {
    assert.equal(createArticle({ title: "" }).title, "Untitled draft");
  });
});

describe("createBlock", () => {
  it("makes every catalogue type with a stable shape", () => {
    for (const entry of BLOCK_CATALOG) {
      const block = createBlock(entry.type, `${entry.type}-1`);
      assert.equal(block.type, entry.type);
      assert.equal(block.id, `${entry.type}-1`);
    }
  });

  it("gives a chart block an embed link and alt text", () => {
    const chart = createBlock("chart", "c1");
    assert.equal(chart.type, "chart");
    if (chart.type === "chart") {
      assert.equal(typeof chart.src, "string");
      assert.equal(typeof chart.alt, "string");
    }
  });
});

describe("normalizeDoc", () => {
  const article = (): ArticleDoc => ({
    id: "a",
    kind: "article",
    title: "A",
    slug: "a",
    kicker: "",
    dek: "",
    byline: "",
    updatedAt: "2026-11-12T00:00:00.000Z",
    blocks: [createBlock("paragraph", "p1"), createBlock("sources", "s1")],
  });

  it("round-trips a document unchanged", () => {
    const doc = article();
    assert.equal(fingerprint(normalizeDoc(JSON.parse(JSON.stringify(doc)))), fingerprint(doc));
  });

  it("fills defaults for fields an older file lacks", () => {
    const raw = { ...article(), blocks: [{ id: "c1", type: "chart", title: "T", caption: "C", src: "https://x.test/c" }] };
    const doc = normalizeDoc(raw);
    assert.equal(doc.kind, "article");
    if (doc.kind === "article") {
      const chart = doc.blocks[0];
      assert.equal(chart?.type, "chart");
      if (chart?.type === "chart") assert.equal(chart.alt, "");
    }
  });

  it("rejects things that are not documents", () => {
    assert.throws(() => normalizeDoc(null), /document/i);
    assert.throws(() => normalizeDoc({ id: "x" }), Error);
    assert.throws(() => normalizeDoc({ ...article(), kind: "poem" }), Error);
  });

  it("rejects unknown block types and duplicate block ids", () => {
    assert.throws(() => normalizeDoc({ ...article(), blocks: [{ id: "x", type: "carousel" }] }), /carousel|block/i);
    const dup = { ...article(), blocks: [createBlock("paragraph", "same"), createBlock("paragraph", "same")] };
    assert.throws(() => normalizeDoc(dup), /same|duplicate|unique/i);
  });

  it("parseDocJson explains bad JSON in plain words", () => {
    assert.throws(() => parseDocJson("{not json"), /JSON/);
    assert.equal(parseDocJson(JSON.stringify(article())).title, "A");
  });
});
