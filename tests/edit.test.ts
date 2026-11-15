import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { documentSchema, type TwildaDocument } from "@twilda/core";
import { applyEdit, fieldLabel, normalizeMultiline } from "@twilda/core/edit";

const article = documentSchema.parse(JSON.parse(readFileSync("content/lumen-rail/draft.json", "utf8"))) as TwildaDocument;

/** A new block with no text yet: the schema refuses it, a draft in progress holds it. */
function withEmptyParagraph(): TwildaDocument {
  if (article.kind !== "article") throw new Error("article expected");
  const blocks = article.blocks.map((block, index) => (index === 1 && block.type === "paragraph" ? { ...block, text: "" } : block));
  return { ...article, blocks } as TwildaDocument;
}

describe("applyEdit lenient mode", () => {
  it("accepts an edit when another field in the draft is not valid yet", () => {
    const unfinished = withEmptyParagraph();
    assert.equal(applyEdit(unfinished, "title", "A new title").ok, false, "strict mode refuses");
    const lenient = applyEdit(unfinished, "title", "A new title", { lenient: true });
    assert.equal(lenient.ok, true);
    if (lenient.ok) {
      assert.equal(lenient.doc.title, "A new title");
      assert.equal(lenient.doc.kind === "article" && lenient.doc.blocks[1]?.type === "paragraph" && lenient.doc.blocks[1].text, "", "the unfinished field is left as it was");
    }
  });

  it("still refuses a value the schema rejects for the field being edited", () => {
    const unfinished = withEmptyParagraph();
    const result = applyEdit(unfinished, "title", "", { lenient: true });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /title/);
  });

  it("refuses paths that are not string leaves or that try to reach into the prototype", () => {
    assert.equal(applyEdit(article, "blocks", "x", { lenient: true }).ok, false);
    assert.equal(applyEdit(article, "__proto__.polluted", "x", { lenient: true }).ok, false);
    assert.equal(applyEdit(article, "blocks.99.text", "x", { lenient: true }).ok, false);
    assert.equal(({} as Record<string, unknown>).polluted, undefined);
  });
});

describe("normalizeMultiline", () => {
  it("keeps one blank line between paragraphs and drops stray whitespace", () => {
    assert.equal(normalizeMultiline("  One \u00a0 line \n\n\n\n Two\r\nthree  "), "One line\n\nTwo\nthree");
  });
});

describe("fieldLabel", () => {
  it("names a field the way a person would", () => {
    assert.equal(fieldLabel("title"), "title");
    assert.equal(fieldLabel("dek"), "summary");
    assert.equal(fieldLabel("blocks.2.src"), "image");
    assert.equal(fieldLabel("blocks.2.items.1"), "item");
    assert.equal(fieldLabel("sections.0.slides.1.imageAlt"), "image alt");
  });
});
