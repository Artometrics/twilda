import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ARTOMETRICS_DRAFTS } from "../backend/artometrics";
import { createBlock, type ArticleDoc, type Block, type MediaAsset } from "../model";
import { createBundle } from "./bundle";
import { checkArticle, countVerify } from "./check";
import { escapeText, exportArticle, exportJson, frontmatter, safeHref } from "./mdx";
import { crc32, createZip, dataUrlBytes, textBytes } from "./zip";

function article(blocks: Block[], patch: Partial<ArticleDoc> = {}): ArticleDoc {
  return {
    id: "demo",
    kind: "article",
    title: "Demo: a \"quoted\" title",
    slug: "demo",
    kicker: "DRAFT · Culture",
    dek: "One line.\nSecond line.",
    byline: "Kyle McAuliffe",
    updatedAt: "2026-11-12T10:00:00.000Z",
    blocks,
    ...patch,
  };
}

describe("frontmatter", () => {
  it("quotes strings as JSON, which is valid YAML, and marks drafts", () => {
    const text = frontmatter(article([]));
    assert.equal(
      text,
      [
        "---",
        'title: "Demo: a \\"quoted\\" title"',
        'slug: "demo"',
        'description: "One line. Second line."',
        'kicker: "DRAFT · Culture"',
        'author: "Kyle McAuliffe"',
        "updatedDate: 2026-11-12T10:00:00.000Z",
        "draft: true",
        "---",
      ].join("\n"),
    );
  });

  it("can write draft: false and skips empty optional fields", () => {
    const text = frontmatter(article([], { dek: "", kicker: "", byline: "" }), false);
    assert.ok(text.includes("draft: false"));
    assert.ok(!text.includes("description:"));
    assert.ok(!text.includes("author:"));
  });
});

describe("escapeText and safeHref", () => {
  it("escapes characters that Markdown or MDX would read as syntax", () => {
    assert.equal(escapeText("a *b* _c_ {d} <e>"), "a \\*b\\* \\_c\\_ \\{d\\} \\<e\\>");
    assert.equal(escapeText("# not a heading"), "\\# not a heading");
    assert.equal(escapeText("- not a list"), "\\- not a list");
    assert.equal(escapeText("1. not a list"), "1\\. not a list");
  });

  it("allows http(s), mailto and relative links and drops the rest", () => {
    assert.equal(safeHref("https://artometrics.com/franchise"), "https://artometrics.com/franchise");
    assert.equal(safeHref("/downloads/x.csv"), "/downloads/x.csv");
    assert.equal(safeHref("javascript:alert(1)"), "");
    assert.equal(safeHref("data:text/html,hi"), "");
    assert.equal(safeHref("//evil.test/x"), "");
    assert.equal(safeHref("https://"), "");
    assert.equal(safeHref(""), "");
  });
});

describe("exportArticle", () => {
  const blocks: Block[] = [
    { id: "h", type: "heading", level: 2, text: "A heading" },
    { id: "p", type: "paragraph", text: "First *paragraph* with {braces}.\n\nSecond paragraph." },
    {
      id: "k",
      type: "key-findings",
      title: "Key findings",
      findings: [{ id: "f1", label: "One", detail: "The first thing." }],
    },
    { id: "c", type: "chart", title: "Chart", caption: "A caption.", src: "https://artometrics.com/franchise", alt: "Bars." },
    { id: "co", type: "callout", title: "Note", text: "Callout body." },
    { id: "dl", type: "download", label: "CSV", href: "https://example.com/data.csv", description: "All rows." },
    {
      id: "s",
      type: "sources",
      items: [{ id: "s1", label: "Source (2026)", href: "https://example.com/a(b)" }],
    },
  ];

  it("writes MDX with only the components it uses", () => {
    const out = exportArticle(article(blocks), { flavor: "mdx" });
    assert.equal(out.filename, "demo.mdx");
    assert.ok(out.text.startsWith("---\ntitle:"));
    assert.ok(out.text.includes('import { Callout, Chart, Download, KeyFindings } from "../../components/twilda/index.ts";'));
    assert.ok(out.text.includes('<Chart title={"Chart"} src={"https://artometrics.com/franchise"} alt={"Bars."} caption={"A caption."} />'));
    assert.ok(out.text.includes("<KeyFindings"));
    assert.ok(out.text.includes("## A heading"));
    assert.ok(out.text.includes("\\{braces\\}"));
    assert.ok(out.text.includes("1. [Source (2026)](https://example.com/a%28b%29)"));
  });

  it("writes plain Markdown with no imports or components", () => {
    const out = exportArticle(article(blocks), { flavor: "md" });
    assert.equal(out.filename, "demo.md");
    assert.ok(!out.text.includes("import "));
    assert.ok(!/<(Chart|Callout|Download|KeyFindings)/.test(out.text));
    assert.ok(out.text.includes("> [Open the chart](https://artometrics.com/franchise)"));
    assert.ok(out.text.includes("- **One:** The first thing."));
    assert.ok(out.text.includes("**Download:** [CSV](https://example.com/data.csv) — All rows."));
  });

  it("omits the import line when no component is used", () => {
    const out = exportArticle(article([blocks[0]!, blocks[1]!]), { flavor: "mdx" });
    assert.ok(!out.text.includes("import "));
  });

  it("skips empty blocks instead of writing empty markup", () => {
    const blank: Block[] = [
      { id: "p", type: "paragraph", text: "  " },
      { id: "h", type: "heading", level: 2, text: "" },
      { id: "s", type: "sources", items: [{ id: "s1", label: "", href: "" }] },
    ];
    const out = exportArticle(article(blank), { flavor: "md" });
    assert.equal(out.text, `${frontmatter(article([]))}\n`);
  });

  it("never writes an unsafe link", () => {
    const bad: Block = { id: "d", type: "download", label: "x", href: "javascript:alert(1)", description: "" };
    const out = exportArticle(article([bad]), { flavor: "md" });
    assert.ok(!out.text.includes("javascript:"));
  });

  it("turns uploaded images into relative files and lists them once", () => {
    const media: MediaAsset[] = [
      {
        name: "Plate Photo.PNG",
        path: "media/plate.png",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        width: 10,
        height: 10,
        scaled: false,
        originalWidth: 10,
        originalHeight: 10,
      },
    ];
    const doc = article([
      { id: "i1", type: "image", src: "media/plate.png", alt: "A plate", caption: "Cap" },
      { id: "i2", type: "image", src: "media/plate.png", alt: "Again", caption: "" },
    ]);
    const out = exportArticle(doc, { flavor: "md", media });
    assert.equal(out.images.length, 1);
    assert.equal(out.images[0]?.file, "images/demo-1-plate-photo.png");
    assert.ok(out.text.includes("![A plate](./images/demo-1-plate-photo.png)"));
    assert.equal(out.text.match(/plate-photo\.png/g)?.length, 2);
  });

  it("exportJson is re-importable text", () => {
    const doc = article(blocks);
    assert.deepEqual(JSON.parse(exportJson(doc)), doc);
  });
});

describe("check", () => {
  it("counts [VERIFY] notes anywhere in the article", () => {
    const doc = article(
      [
        { id: "p", type: "paragraph", text: "A [VERIFY: figure] claim and [verify later] another." },
        { id: "c", type: "callout", title: "Hold on [VERIFY]", text: "ok" },
      ],
      { dek: "Dek [VERIFY: dek]" },
    );
    assert.equal(countVerify(doc), 4);
  });

  it("reports missing citations, dek and bad slugs", () => {
    const doc = article([{ id: "p", type: "paragraph", text: "Hi" }], { dek: "", slug: "Bad Slug", byline: "" });
    const issues = checkArticle(doc);
    const messages = issues.map((issue) => issue.message).join("\n");
    assert.match(messages, /slug/);
    assert.match(messages, /citation/i);
    assert.match(messages, /dek/i);
    assert.ok(issues.some((issue) => issue.level === "error"));
  });

  it("flags blocks that still hold the starter text", () => {
    const doc = article([createBlock("paragraph", "p"), createBlock("heading", "h")]);
    const starter = checkArticle(doc).filter((issue) => /starter text/.test(issue.message));
    assert.equal(starter.length, 2);
  });

  it("is quiet for a finished article", () => {
    const doc = article([
      { id: "p", type: "paragraph", text: "Hi" },
      { id: "s", type: "sources", items: [{ id: "s1", label: "Source", href: "https://example.com/a" }] },
    ]);
    assert.deepEqual(checkArticle(doc), []);
  });
});

describe("zip", () => {
  it("matches the standard CRC-32 check value", () => {
    assert.equal(crc32(textBytes("123456789")), 0xcbf43926);
  });

  it("decodes data URLs", () => {
    assert.deepEqual([...dataUrlBytes("data:text/plain;base64,aGk=")], [104, 105]);
  });

  it("writes a readable archive with central directory entries", () => {
    const bytes = createZip(
      [
        { name: "a.txt", data: textBytes("alpha") },
        { name: "images/b.bin", data: new Uint8Array([1, 2, 3]) },
      ],
      new Date("2026-11-12T10:00:00Z"),
    );
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(view.getUint32(0, true), 0x04034b50);
    const eocd = bytes.byteLength - 22;
    assert.equal(view.getUint32(eocd, true), 0x06054b50);
    assert.equal(view.getUint16(eocd + 10, true), 2);
    const centralAt = view.getUint32(eocd + 16, true);
    assert.equal(view.getUint32(centralAt, true), 0x02014b50);
    assert.equal(view.getUint32(centralAt + 16, true), crc32(textBytes("alpha")));
  });

  it("bundles mdx, md, json and images", () => {
    const doc = article([{ id: "p", type: "paragraph", text: "Hi" }]);
    const bundle = createBundle(doc, [], {}, new Date("2026-11-12T10:00:00Z"));
    assert.equal(bundle.filename, "demo-twilda.zip");
    const text = new TextDecoder("latin1").decode(bundle.bytes);
    for (const name of ["demo.mdx", "demo.md", "demo.json"]) assert.ok(text.includes(name), name);
  });
});

describe("sample drafts", () => {
  it("are three articles that export without unsafe markup", () => {
    assert.equal(ARTOMETRICS_DRAFTS.length, 3);
    for (const doc of ARTOMETRICS_DRAFTS) {
      assert.equal(doc.kind, "article");
      if (doc.kind !== "article") continue;
      assert.match(doc.kicker, /DRAFT/);
      assert.equal(doc.id, doc.slug);
      for (const flavor of ["md", "mdx"] as const) {
        const out = exportArticle(doc, { flavor });
        assert.ok(out.text.includes("draft: true"));
        assert.ok(!out.text.includes("javascript:"));
      }
      const sources = doc.blocks.filter((block) => block.type === "sources");
      assert.ok(sources.length > 0, `${doc.id} cites sources`);
      assert.ok(countVerify(doc) > 0, `${doc.id} keeps its VERIFY notes visible`);
      assert.deepEqual(
        checkArticle(doc).filter((issue) => issue.level === "error"),
        [],
      );
    }
  });
});
