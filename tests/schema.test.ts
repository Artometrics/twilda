import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentFingerprint } from "../src/schema/fingerprint";
import { moveItem } from "../src/schema/reorder";
import { documentSchema, type ContentDocument } from "../src/schema/sections";
import { createSection } from "../src/schema/templates";
import { readFileSync } from "node:fs";

function page(sections: ContentDocument["sections"]): ContentDocument {
  return documentSchema.parse({
    id: "home",
    kind: "page",
    title: "Field Desk",
    slug: "home",
    dek: "Demo",
    kicker: "Issue",
    byline: "",
    updatedAt: "2026-11-09T16:00:00.000Z",
    sections,
  });
}

describe("sections", () => {
  it("accepts the committed homepage", () => {
    const raw = JSON.parse(readFileSync("content/home/published.json", "utf8")) as unknown;
    const doc = documentSchema.parse(raw);
    assert.equal(doc.kind, "page");
    assert.deepEqual(
      doc.sections.map((section) => section.type),
      ["carousel", "story-grid", "magazine-feature", "headline-facts", "category-tiles"],
    );
  });

  it("rejects a body block on a page", () => {
    const result = documentSchema.safeParse({
      id: "home",
      kind: "page",
      title: "Field Desk",
      slug: "home",
      updatedAt: "2026-11-09T16:00:00.000Z",
      sections: [createSection("paragraph")],
    });
    assert.equal(result.success, false);
  });

  it("rejects a carousel on an article", () => {
    const result = documentSchema.safeParse({
      id: "note",
      kind: "article",
      title: "Note",
      slug: "note",
      updatedAt: "2026-11-09T16:00:00.000Z",
      sections: [createSection("carousel")],
    });
    assert.equal(result.success, false);
  });

  it("moves a section without dropping the others", () => {
    const sections = [createSection("heading"), createSection("paragraph"), createSection("list")];
    const moved = moveItem(sections, 0, 2);
    assert.deepEqual(
      moved.map((section) => section.id),
      [sections[1]!.id, sections[2]!.id, sections[0]!.id],
    );
    assert.deepEqual(moveItem(sections, 1, 1).map((section) => section.id), sections.map((section) => section.id));
  });

  it("ignores updatedAt when comparing content", () => {
    const first = page([createSection("headline-facts")]);
    const second = { ...first, updatedAt: "2026-11-09T18:00:00.000Z" };
    assert.equal(contentFingerprint(first), contentFingerprint(second));
    assert.notEqual(contentFingerprint(first), contentFingerprint({ ...first, title: "Other" }));
  });
});
