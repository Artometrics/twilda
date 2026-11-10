import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { documentSchema, type ContentDocument } from "../src/schema/sections";
import { renderDocument } from "../src/render/document";
import { escapeHtml, safeHref, safeMedia } from "../src/render/escape";

describe("render", () => {
  it("escapes author text", () => {
    assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    assert.equal(safeHref("javascript:alert(1)"), "#");
    assert.equal(safeHref("//evil.example"), "#");
    assert.equal(safeHref("/articles/lumen-rail"), "/articles/lumen-rail");
    assert.equal(safeMedia("/media/plate-yard.svg"), "/media/plate-yard.svg");
    assert.equal(safeMedia("/media/../secret.svg"), null);
    assert.equal(safeMedia("https://example.com/a.svg"), null);
  });

  it("renders a hostile paragraph as text", () => {
    const doc = documentSchema.parse({
      id: "note",
      kind: "article",
      title: "Note <em>",
      slug: "note",
      dek: "",
      kicker: "",
      byline: "",
      updatedAt: "2026-11-09T16:00:00.000Z",
      sections: [
        {
          id: "p1",
          type: "paragraph",
          text: `<img src=x onerror="alert(1)">`,
        },
      ],
    });
    const html = renderDocument(doc);
    assert.equal(html.includes("<img src=x"), false);
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.match(html, /Note &lt;em&gt;/);
  });

  it("renders the published article without the draft sentinel", () => {
    const published = documentSchema.parse(
      JSON.parse(readFileSync("content/lumen-rail/published.json", "utf8")) as unknown,
    ) as ContentDocument;
    const draft = documentSchema.parse(
      JSON.parse(readFileSync("content/lumen-rail/draft.json", "utf8")) as unknown,
    );
    const html = renderDocument(published);
    assert.match(html, /The night timetable is a public document\./);
    assert.equal(html.includes("DRAFT-ONLY SENTINEL"), false);
    assert.match(renderDocument(draft), /DRAFT-ONLY SENTINEL/);
  });
});
