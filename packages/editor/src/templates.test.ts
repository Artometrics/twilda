import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentSchema, renderDocument } from "@twilda/core";
import { DRAFT_TEMPLATES, createFromTemplate, templatesFor, templatesForMode } from "./templates";

describe("draft templates", () => {
  for (const template of DRAFT_TEMPLATES) {
    it(`${template.id}: builds a draft that already satisfies the schema and renders in the template`, () => {
      const doc = createFromTemplate({ templateId: template.id, title: "A Test Draft", now: "2026-11-15T00:00:00.000Z" });
      assert.equal(doc.kind, template.kind);
      assert.equal(doc.status, "draft");
      assert.equal(doc.slug, "a-test-draft");
      assert.equal(doc.id, doc.slug);
      const parsed = documentSchema.safeParse(doc);
      assert.equal(parsed.success, true, parsed.success ? "" : JSON.stringify(parsed.error.issues));
      const html = renderDocument(doc);
      assert.match(html, /A Test Draft/);
      assert.equal(html.includes("plate-missing"), false, "template plates are repo media");
      const parts = doc.kind === "article" ? doc.blocks : doc.sections;
      assert.equal(parts.length, template.outline.length, "outline names every part");
      assert.equal(new Set(parts.map((part) => part.id)).size, parts.length, "part ids are unique");
    });
  }

  it("gives each draft fresh part ids and a unique slug", () => {
    const a = createFromTemplate({ templateId: "feature", title: "Same" });
    const b = createFromTemplate({ templateId: "feature", title: "Same", taken: [a.id] });
    assert.equal(b.slug, "same-2");
    const idsA = new Set((a.kind === "article" ? a.blocks : []).map((block) => block.id));
    for (const block of b.kind === "article" ? b.blocks : []) assert.equal(idsA.has(block.id), false);
  });

  it("carries the kicker, dek, and byline, and a page has no byline", () => {
    const article = createFromTemplate({ templateId: "data-story", title: "T", kicker: "DRAFT · Sports", dek: "Dek", byline: "Me" });
    assert.equal(article.kicker, "DRAFT · Sports");
    assert.equal(article.dek, "Dek");
    assert.equal(article.kind === "article" ? article.byline : "", "Me");
    const page = createFromTemplate({ templateId: "front-page", title: "Home", byline: "ignored" });
    assert.equal("byline" in page, false);
  });

  it("offers article and page templates, and rejects an unknown one", () => {
    assert.ok(templatesFor("article").length >= 3);
    assert.ok(templatesFor("page").length >= 2);
    assert.throws(() => createFromTemplate({ templateId: "nope", title: "x" }), /Unknown template/);
  });

  it("a page that opens with a hero puts the typed title, kicker, and dek in the hero, which carries the h1", () => {
    const doc = createFromTemplate({ templateId: "landing-page", title: "Ship It", kicker: "New", dek: "A short pitch." });
    if (doc.kind !== "page") throw new Error("page expected");
    const lead = doc.sections[0];
    assert.equal(lead?.type, "hero");
    if (lead?.type === "hero") assert.deepEqual([lead.title, lead.kicker, lead.dek], ["Ship It", "New", "A short pitch."]);
    assert.equal((renderDocument(doc).match(/<h1[ >]/g) ?? []).length, 1);
  });

  it("each mode offers its own starting points, and every template belongs to at least one mode", () => {
    const ids = (mode: "corporate" | "magazine" | "leadgen", kind: "article" | "page") => templatesForMode(mode).filter((template) => template.kind === kind).map((template) => template.id);
    assert.ok(ids("corporate", "page").includes("company-home"));
    assert.ok(ids("leadgen", "page").includes("landing-page"));
    assert.ok(ids("magazine", "page").includes("cover-front"));
    assert.equal(ids("corporate", "page").includes("front-page"), false);
    for (const template of DRAFT_TEMPLATES) {
      assert.ok((["corporate", "magazine", "leadgen"] as const).some((mode) => ids(mode, template.kind).includes(template.id)), template.id);
    }
    for (const mode of ["corporate", "magazine", "leadgen"] as const) {
      for (const kind of ["article", "page"] as const) assert.ok(ids(mode, kind).length >= 1, `${mode} ${kind}`);
    }
  });
});
