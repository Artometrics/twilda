import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CHROME, MAGAZINE_CSS, documentSchema, escapeHtml, renderDocument, renderPreviewPage, type TwildaDocument } from "@twilda/core";
import { corpus } from "../fixtures/render-corpus";
import { RICH_ARTICLE, RICH_PAGE, STRUCTURAL_KEYS, XSS_PAYLOADS, assertInertMarkup, scanTags, stringLeaves, withLeaf } from "./support";

const CSV = { "content/data/chart.csv": "Year,Count\n2025,3\n2026,4\n" };

test("scanner self-check: the helper really does flag hostile markup", () => {
  assert.throws(() => assertInertMarkup(`<p>ok</p><script>alert(1)</script>`));
  assert.throws(() => assertInertMarkup(`<img src="/media/x.png" onerror="alert(1)">`));
  assert.throws(() => assertInertMarkup(`<a href="javascript:alert(1)">x</a>`));
  assert.throws(() => assertInertMarkup(`<p>text <b</p>`));
  assert.throws(() => assertInertMarkup(`<a href="https://example.com/" >x</a>`));
  assert.throws(() => assertInertMarkup(`<iframe src="https://evil.example/embed/x"></iframe>`));
  assert.throws(() => assertInertMarkup(`<p style="x">y</p>`));
  assert.doesNotThrow(() => assertInertMarkup(`<p class="a">&lt;script&gt;</p>`));
});

test("every shipped and hostile fixture renders to inert markup, annotated or not", () => {
  for (const entry of corpus()) {
    for (const annotate of [false, true]) {
      assertInertMarkup(renderDocument(entry.doc, { annotate, dataFiles: CSV }), `${entry.name} annotate=${annotate}`);
    }
  }
});

function leafCases(doc: TwildaDocument): Array<{ path: Array<string | number>; value: string }> {
  return stringLeaves(doc).filter((leaf) => !STRUCTURAL_KEYS.has(String(leaf.path[leaf.path.length - 1])));
}

for (const [label, doc] of [
  ["article", RICH_ARTICLE],
  ["page", RICH_PAGE],
] as const) {
  test(`${label}: every editable string field survives every XSS payload (renderer alone, schema bypassed)`, () => {
    const leaves = leafCases(doc);
    assert.ok(leaves.length > 30, "the fixture must exercise many fields");
    let renders = 0;
    for (const leaf of leaves) {
      for (const payload of XSS_PAYLOADS) {
        const hostile = withLeaf(doc, leaf.path, payload);
        for (const annotate of [false, true]) {
          const html = renderDocument(hostile, { annotate, dataFiles: CSV });
          assertInertMarkup(html, `${label} ${leaf.path.join(".")} annotate=${annotate} payload=${JSON.stringify(payload).slice(0, 40)}`);
          renders += 1;
        }
      }
    }
    assert.ok(renders > 1000);
  });

  test(`${label}: the same payloads through the schema are rejected or rendered inert`, () => {
    let accepted = 0;
    let rejected = 0;
    for (const leaf of leafCases(doc)) {
      for (const payload of XSS_PAYLOADS) {
        const hostile = withLeaf(doc, leaf.path, payload);
        const parsed = documentSchema.safeParse(hostile);
        if (!parsed.success) {
          rejected += 1;
          continue;
        }
        accepted += 1;
        assertInertMarkup(renderDocument(parsed.data, { annotate: true, dataFiles: CSV }), `${label} ${leaf.path.join(".")}`);
      }
    }
    assert.ok(accepted > 0 && rejected > 0, `expected both outcomes, got accepted=${accepted} rejected=${rejected}`);
  });
}

test("plain text fields are entity-encoded, not interpreted", () => {
  const payload = `</title><script>alert(1)</script>"'&`;
  const hostile = { ...RICH_ARTICLE, title: payload, kicker: payload, dek: payload, byline: payload } as TwildaDocument;
  const html = renderDocument(hostile);
  assert.ok(html.includes(escapeHtml(payload)), "the title is present as encoded text");
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes(payload));
  const preview = renderPreviewPage(hostile);
  assert.equal(scanTags(preview.split("<body>")[0] as string).tags.filter((tag) => tag.name === "script").length, 0);
  assert.ok(preview.includes(`<title>${escapeHtml(payload)}</title>`));
});

test("ids and refs cannot break out of an attribute", () => {
  for (const payload of [`x" onmouseover="alert(1)`, `x' onfocus='alert(1)`, `x"><script>alert(1)</script>`]) {
    for (const [index, block] of (RICH_ARTICLE as { blocks: Array<{ id: string }> }).blocks.entries()) {
      void block;
      const hostile = withLeaf(RICH_ARTICLE, ["blocks", index, "id"], payload);
      assertInertMarkup(renderDocument(hostile, { annotate: true, dataFiles: CSV }), `block ${index} id`);
    }
  }
});

test("masthead and colophon fields cannot inject markup", () => {
  for (const payload of XSS_PAYLOADS) {
    const chrome = {
      name: payload,
      issueLabel: payload,
      note: payload,
      colophon: payload,
      nav: [
        { label: payload, href: "/ok" },
        { label: "Link", href: payload },
        { label: "Fine", href: "javascript:alert(1)" },
      ],
    };
    assertInertMarkup(renderDocument(RICH_ARTICLE, { chrome }), `chrome payload ${JSON.stringify(payload).slice(0, 30)}`);
  }
  assertInertMarkup(renderDocument(RICH_ARTICLE, { chrome: DEFAULT_CHROME }), "default chrome");
});

test("chart CSV cells are text, whatever the file contains", () => {
  const rows = XSS_PAYLOADS.map((payload) => `"${payload.replace(/"/g, '""')}",${payload.includes(",") ? '"x,y"' : "1"}`);
  const csv = `Label,Value\n${rows.join("\n")}\n`;
  for (const doc of [RICH_ARTICLE]) {
    assertInertMarkup(renderDocument(doc, { annotate: true, dataFiles: { "content/data/chart.csv": csv } }), "hostile csv");
  }
});

test("a hostile document never produces a script, style, or form element anywhere", () => {
  for (const payload of XSS_PAYLOADS) {
    const doc = documentSchema.safeParse({ ...RICH_ARTICLE, title: payload, dek: payload });
    const source = doc.success ? doc.data : RICH_ARTICLE;
    const html = renderPreviewPage(source, { dataFiles: CSV });
    const body = html.slice(html.indexOf("<body>"));
    const names = new Set(scanTags(body).tags.map((tag) => tag.name));
    for (const banned of ["script", "style", "form", "input", "object", "embed", "base", "meta", "link", "svg", "math"]) {
      assert.ok(!names.has(banned), `${banned} appeared for payload ${payload}`);
    }
  }
});

test("the template stylesheet contains no scriptable constructs", () => {
  assert.ok(!/expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding/i.test(MAGAZINE_CSS));
  assert.ok(!/url\(\s*["']?(?:https?:|\/\/|data:)/i.test(MAGAZINE_CSS), "the stylesheet must not fetch remote or data URLs");
});
