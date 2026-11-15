import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { documentSchema, type TwildaDocument } from "@twilda/core";
import { contentFingerprint } from "../src/schema/fingerprint";
import { moveItem } from "../src/schema/reorder";
import { createPart } from "../src/schema/templates";

function page(sections: Extract<TwildaDocument, { kind: "page" }>["sections"]): TwildaDocument {
  return documentSchema.parse({
    id: "home",
    kind: "page",
    title: "Field Desk",
    slug: "home",
    dek: "Demo",
    kicker: "Issue",
    status: "published",
    updatedAt: "2026-11-09T16:00:00.000Z",
    sections,
  });
}

describe("sections", () => {
  it("accepts the committed homepage", () => {
    const raw = JSON.parse(readFileSync("content/home/published.json", "utf8")) as unknown;
    const doc = documentSchema.parse(raw);
    assert.equal(doc.kind, "page");
    if (doc.kind !== "page") return;
    assert.deepEqual(
      doc.sections.map((section) => section.type),
      ["carousel", "story-grid", "story-grid", "menu-shelf", "story-grid"],
    );
    assert.match(JSON.stringify(doc), /Doors into the issue/);
    assert.match(JSON.stringify(doc), /Lumen Rail keeps the night timetable public/);
  });

  it("rejects a body block on a page", () => {
    const result = documentSchema.safeParse({
      id: "home",
      kind: "page",
      title: "Field Desk",
      slug: "home",
      status: "draft",
      updatedAt: "2026-11-09T16:00:00.000Z",
      sections: [createPart("paragraph")],
    });
    assert.equal(result.success, false);
  });

  it("rejects a carousel on an article", () => {
    const result = documentSchema.safeParse({
      id: "note",
      kind: "article",
      title: "Note",
      slug: "note",
      status: "draft",
      updatedAt: "2026-11-09T16:00:00.000Z",
      blocks: [createPart("carousel")],
    });
    assert.equal(result.success, false);
  });

  it("moves a section without dropping the others", () => {
    const sections = [createPart("heading"), createPart("paragraph"), createPart("callout")];
    const moved = moveItem(sections, 0, 2);
    assert.deepEqual(
      moved.map((section) => section.id),
      [sections[1]!.id, sections[2]!.id, sections[0]!.id],
    );
    assert.deepEqual(moveItem(sections, 1, 1).map((section) => section.id), sections.map((section) => section.id));
  });

  it("ignores updatedAt when comparing content", () => {
    const shelf = createPart("menu-shelf");
    const first = page([shelf]);
    const second = { ...first, updatedAt: "2026-11-09T18:00:00.000Z" };
    assert.equal(contentFingerprint(first), contentFingerprint(second));
    assert.notEqual(contentFingerprint(first), contentFingerprint({ ...first, title: "Other" }));
  });
});
