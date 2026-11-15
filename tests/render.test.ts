import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { documentSchema, type TwildaDocument } from "@twilda/core";
import { renderDocument } from "@twilda/core";
import { escapeHtml, safeHref, safeMedia } from "@twilda/core";

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
      status: "draft",
      updatedAt: "2026-11-09T16:00:00.000Z",
      blocks: [
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
    ) as TwildaDocument;
    const draft = documentSchema.parse(JSON.parse(readFileSync("content/lumen-rail/draft.json", "utf8")) as unknown);
    const html = renderDocument(published);
    assert.match(html, /The night timetable is a public document\./);
    assert.match(html, /Story year/);
    assert.match(html, /Cars come off the river span/);
    assert.equal(html.includes("DRAFT-ONLY SENTINEL"), false);
    assert.match(renderDocument(draft), /DRAFT-ONLY SENTINEL/);
  });

  it("prints an external http(s) link in a sources list, download, or embed as the address, with no opener or referrer", () => {
    const base = { id: "links", kind: "article", title: "Links", slug: "links", dek: "", kicker: "", byline: "", status: "draft", updatedAt: "2026-11-09T16:00:00.000Z" };
    const doc = documentSchema.parse({
      ...base,
      blocks: [
        { id: "s1", type: "sources", title: "Sources", items: [{ id: "a", label: "Outside", href: "https://example.org/report?id=1&x=2" }, { id: "b", label: "Inside", href: "/articles/franchise" }] },
        { id: "d1", type: "download", label: "Data", href: "https://example.org/data.csv", description: "" },
      ],
    });
    const html = renderDocument(doc);
    assert.match(html, /<a href="https:\/\/example\.org\/report\?id=1&amp;x=2" rel="noopener noreferrer">Outside<\/a>/);
    assert.match(html, /<a href="\/articles\/franchise">Inside<\/a>/);
    assert.match(html, /<a href="https:\/\/example\.org\/data\.csv" rel="noopener noreferrer">Data<\/a>/);
  });

  it("prints # for a link that is not a site path or a web address, even when the schema is bypassed", () => {
    const hostile = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "//evil.example", "https://u:p@evil.example", "https://xn--pple-43d.example", "https://exa mple.org", "vbscript:x", "  javascript:alert(1)", "/\\evil.example", "ftp://evil.example/x", "mailto:a@b.example"];
    const doc = {
      id: "bad",
      kind: "article",
      title: "Bad",
      slug: "bad",
      dek: "",
      kicker: "",
      byline: "",
      status: "draft",
      updatedAt: "2026-11-09T16:00:00.000Z",
      blocks: [
        { id: "s1", type: "sources", title: "Sources", items: hostile.map((href, n) => ({ id: `i${n}`, label: `l${n}`, href })) },
        { id: "d1", type: "download", label: "d", href: "javascript:alert(1)", description: "" },
        { id: "e1", type: "embed", kind: "video", src: "data:text/html,x", title: "t", caption: "" },
      ],
    } as unknown as TwildaDocument;
    const html = renderDocument(doc);
    assert.equal((html.match(/<a href="#"/g) ?? []).length, hostile.length + 2);
    for (const needle of ["javascript:", "JaVaScRiPt", "data:", "evil.example", "vbscript", "ftp:", "mailto:", "noopener"]) assert.equal(html.includes(needle), false, needle);
  });
});
