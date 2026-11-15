import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentSchema, marksFromDom, renderDocument, isSafeLinkTarget, parseMarks, renderMarks, stripMarks, unsafeLinkTargets, escapeMarks } from "@twilda/core";
import { createBlock } from "@twilda/core";

describe("marks: rendering", () => {
  it("renders bold, italic, bold italic, and links", () => {
    assert.equal(renderMarks("a **b** and *c*"), "a <strong>b</strong> and <em>c</em>");
    assert.equal(renderMarks("***both***"), "<strong><em>both</em></strong>");
    assert.equal(renderMarks("see [the report](https://example.com/r?a=1&b=2) now"), 'see <a href="https://example.com/r?a=1&amp;b=2" rel="noopener noreferrer nofollow">the report</a> now');
  });

  it("leaves a plain string exactly as the old renderer printed it", () => {
    for (const plain of ["Plain text.", "Tom & Jerry <3 > 2", "It's 5 * 3 = 15", "a_b_c and 2*3", "price: $5 (approx)", "[not a link]"]) {
      assert.equal(renderMarks(plain), plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;").replace(/"/g, "&quot;"));
    }
  });

  it("emphasis level never makes a link", () => {
    assert.equal(renderMarks("[x](https://example.com)", "emphasis"), "[x](https://example.com)");
    assert.equal(renderMarks("**x**", "emphasis"), "<strong>x</strong>");
  });

  it("backslash escapes the marks", () => {
    assert.equal(renderMarks("\\*not italic\\*"), "*not italic*");
    assert.equal(renderMarks("\\[x\\]\\(https://example.com\\)"), "[x](https://example.com)");
    assert.equal(stripMarks("**b** *i* [l](https://example.com)"), "b i l");
  });

  it("closes only what it opened and prints stray markers as text", () => {
    assert.equal(renderMarks("**open"), "**open");
    assert.equal(renderMarks("*open"), "*open");
    assert.equal(renderMarks("** spaced **"), "** spaced **");
  });
});

describe("marks: hostile content", () => {
  const hostile = [
    "[x](javascript:alert(1))",
    "[x](JaVaScRiPt:alert(1))",
    "[x]( javascript:alert(1))",
    "[x](data:text/html;base64,PHNjcmlwdD4=)",
    "[x](vbscript:msgbox(1))",
    "[x](//evil.test/x)",
    "[x](https://user:pass@example.com/)",
    "[x](https://example/)",
    "[x](https://exa mple.com/)",
    '[x](https://example.com/"onmouseover="alert(1))',
    "[x](https://example.com/<script>)",
    "[x](file:///etc/passwd)",
    "[x](\\\\evil.test)",
  ];

  it("prints an unsafe link target as plain text, never as an href", () => {
    for (const source of hostile) {
      const html = renderMarks(source);
      assert.equal(/<a\b/.test(html), false, source);
      assert.equal(/href=/.test(html), false, source);
      assert.equal(html.includes("<script"), false, source);
    }
  });

  it("flags every unsafe target so the schema can refuse the field", () => {
    for (const source of hostile.filter((value) => /\]\(/.test(value))) {
      assert.ok(unsafeLinkTargets(source).length > 0, source);
    }
    assert.deepEqual(unsafeLinkTargets("[ok](https://example.com) and [ok](/a/b) and [m](mailto:a@b.co)"), []);
  });

  it("escapes HTML in text, in labels, and in nested marks", () => {
    const html = renderMarks('**<img src=x onerror=alert(1)>** *"quoted"* [<b>x</b>](https://example.com)');
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<b>"), false);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  it("does not let a label or a nested mark open a second link or break out of the anchor", () => {
    const html = renderMarks("[a [b](https://one.example.com) c](https://two.example.com)");
    assert.equal((html.match(/<a /g) ?? []).length <= 1, true);
    assert.equal(html.includes("</a></a>"), false);
  });

  it("refuses a field with an unsafe link in the document schema", () => {
    const article = {
      id: "t",
      kind: "article",
      title: "T",
      slug: "t",
      dek: "",
      kicker: "",
      byline: "",
      status: "draft",
      updatedAt: "2026-01-01T00:00:00.000Z",
      blocks: [{ id: "p", type: "paragraph", text: "see [x](javascript:alert(1))" }],
    };
    const result = documentSchema.safeParse(article);
    assert.equal(result.success, false);
    assert.match(JSON.stringify(result.error?.issues), /link target must be/);
    assert.equal(documentSchema.safeParse({ ...article, blocks: [{ id: "p", type: "paragraph", text: "see [x](https://example.com)" }] }).success, true);
  });

  it("isSafeLinkTarget accepts the allowed forms and nothing else", () => {
    for (const ok of ["https://example.com", "http://example.com/a?b=c#d", "mailto:desk@example.com", "/articles/story", "#top"]) assert.equal(isSafeLinkTarget(ok), true, ok);
    for (const bad of ["", " https://example.com", "javascript:1", "ftp://example.com", "//x.test", "https://localhost", "https://a.test/\n", "https://a.test/'", "#", "mailto:nope"]) assert.equal(isSafeLinkTarget(bad), false, JSON.stringify(bad));
  });
});

describe("marks: through the renderer", () => {
  const article = (text: string) => ({
    id: "t",
    kind: "article" as const,
    title: "T",
    slug: "t",
    dek: "A **dek** with [link](https://example.com)",
    kicker: "",
    byline: "",
    status: "draft" as const,
    updatedAt: "2026-01-01T00:00:00.000Z",
    blocks: [{ id: "p", type: "paragraph" as const, text }],
  });

  it("renders paragraph and dek marks, and tags marked fields when annotated", () => {
    const doc = documentSchema.parse(article("One **bold** word.\n\nSecond [link](/articles/x)."));
    const html = renderDocument(doc);
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<a href="\/articles\/x"/);
    assert.equal(html.includes("data-twilda"), false);
    const annotated = renderDocument(doc, { annotate: true });
    assert.match(annotated, /data-twilda-marks="links"/);
  });

  it("round-trips: DOM back to the marked string", () => {
    const fake = (name: string, children: unknown[] = [], attrs: Record<string, string> = {}) => ({
      nodeType: 1,
      nodeName: name.toUpperCase(),
      textContent: null,
      childNodes: children,
      getAttribute: (key: string) => attrs[key] ?? null,
    });
    const text = (value: string) => ({ nodeType: 3, nodeName: "#text", textContent: value, childNodes: [] });
    const root = fake("div", [text("a "), fake("b", [text("bold")]), text(" "), fake("i", [text("it")]), text(" "), fake("a", [text("link")], { href: "https://example.com/a(b)" }), text(" *x*")]);
    const marked = marksFromDom(root as never);
    assert.equal(marked, "a **bold** *it* [link](https://example.com/a%28b%29) \\*x\\*");
    assert.equal(stripMarks(marked), "a bold it link *x*");
    const unsafe = fake("div", [fake("a", [text("bad")], { href: "javascript:alert(1)" })]);
    assert.equal(marksFromDom(unsafe as never), "bad");
    const dirty = fake("div", [fake("script", [text("alert(1)")]), fake("span", [text("kept")], { style: "font-weight: 700" })]);
    assert.equal(marksFromDom(dirty as never), "alert\\(1\\)**kept**");
  });

  it("escapeMarks makes any text safe to store", () => {
    for (const raw of ["a*b*c", "[x](y)", "\\", "**", "plain"]) {
      assert.equal(stripMarks(escapeMarks(raw)), raw);
    }
    assert.equal(parseMarks("plain").length, 1);
    assert.ok(createBlock("paragraph").type === "paragraph");
  });
});
