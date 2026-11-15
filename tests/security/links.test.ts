import assert from "node:assert/strict";
import test from "node:test";
import {
  documentSchema,
  hasPunycodeHost,
  isSafeHref,
  isSafeLinkTarget,
  isSitePath,
  isWebUrl,
  labelContradictsTarget,
  renderDocument,
  renderMarks,
  safeHref,
  safeMedia,
  siteSchema,
  defaultSite,
  unsafeLinkTargets,
  marksFromDom,
} from "@twilda/core";
import { RICH_ARTICLE, RICH_PAGE, assertInertMarkup, withLeaf } from "./support";

/** Targets a browser would follow somewhere other than where a quick read suggests. */
const HOSTILE_TARGETS: string[] = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  " javascript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:alert(1)",
  "java\rscript:alert(1)",
  "&#106;avascript:alert(1)",
  "%6Aavascript:alert(1)",
  "\u0000javascript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "data:image/svg+xml,<svg onload=alert(1)>",
  "file:///etc/passwd",
  "blob:https://example.com/uuid",
  "ftp://example.com/x",
  "//evil.example/path",
  "/\\evil.example",
  "\\\\evil.example\\share",
  "/\t/evil.example",
  "https://user:pass@example.com/",
  "https://example.com@evil.example/",
  "https://\u0435xample.com/",
  "https://xn--xample-9ve.com/",
  "https://exam\u200bple.com/",
  "https://example.com/\u202eexe.txt",
  "https://example.com/ with space",
  'https://example.com/"onmouseover="alert(1)',
  "https://example.com/<script>",
  "https://example.com/`x`",
  "https:example.com",
  "http:/example.com",
  "https://",
  "http://[::1",
  `https://example.com/${"a".repeat(500)}`,
  "mailto:",
  "mailto:a@b",
  "tel:+1555",
  "sms:+1555",
  "",
  " ",
  "#",
];

test("hostile link targets are refused by every link validator", () => {
  for (const target of HOSTILE_TARGETS) {
    assert.equal(isSafeHref(target), false, `isSafeHref accepted ${JSON.stringify(target)}`);
    assert.equal(isSafeLinkTarget(target), false, `isSafeLinkTarget accepted ${JSON.stringify(target)}`);
    assert.equal(isWebUrl(target), false, `isWebUrl accepted ${JSON.stringify(target)}`);
    assert.equal(safeHref(target), "#", `safeHref passed ${JSON.stringify(target)}`);
  }
});

test("ordinary link targets still work", () => {
  for (const ok of ["/", "/articles/one", "/a/b.c_d-e?x=1&y=2#top", "https://example.com", "http://example.com/a?b=1", "https://sub.example.co.uk/path"]) {
    assert.equal(isSafeHref(ok), true, ok);
  }
  for (const ok of ["#top", "mailto:desk@example.com", "https://example.com/a(b)".replace(/[()]/g, "")]) {
    assert.equal(isSafeLinkTarget(ok), true, ok);
  }
  assert.equal(isSitePath("//x"), false);
  for (const path of ["/a/../b", "/../b", "/a/./b", "/%2e%2e/b", "/a/%2E/b", "/a/.%2e/b", "/media/../../etc/passwd"]) {
    assert.equal(isSitePath(path), false, `site path accepted ${path}`);
  }
  for (const path of ["/a/b.c", "/a..b", "/.well-known/x", "/a?next=../b", "/a#../b"]) assert.equal(isSitePath(path), true, path);
});

test("look-alike hosts are detected through punycode", () => {
  assert.equal(hasPunycodeHost("xn--80ak6aa92e.com"), true);
  assert.equal(hasPunycodeHost("sub.xn--e1afmkfd.example"), true);
  assert.equal(hasPunycodeHost("example.com"), false);
  assert.equal(isWebUrl("https://аррӏе.com/"), false, "Cyrillic homograph of apple.com");
});

test("link text that names one site while pointing at another is a phishing shape", () => {
  assert.equal(labelContradictsTarget("https://bank.example", "https://evil.example/login"), true);
  assert.equal(labelContradictsTarget("bank.example", "https://evil.example"), true);
  assert.equal(labelContradictsTarget("www.bank.example/login", "https://evil.example/"), true);
  assert.equal(labelContradictsTarget("bank.example", "https://www.bank.example/other"), false);
  assert.equal(labelContradictsTarget("the report", "https://evil.example"), false);
  assert.equal(labelContradictsTarget("v1.2 notes", "https://example.com/notes"), false);
  assert.deepEqual(unsafeLinkTargets("[https://bank.example](https://evil.example)"), ["https://evil.example"]);
  assert.deepEqual(unsafeLinkTargets("[bank.example](https://bank.example)"), []);
});

test("a mismatched or hostile link in marks is printed as plain text, never as an anchor", () => {
  for (const source of [
    "[https://bank.example](https://evil.example)",
    ...HOSTILE_TARGETS.filter((target) => !/[()\\]/.test(target) && !/\s/.test(target)).map((target) => `[click](${target})`),
  ]) {
    const html = renderMarks(source);
    assert.ok(!html.includes("<a "), `anchor rendered for ${source}`);
    assertInertMarkup(`<p>${html}</p>`, source);
  }
});

test("hostile links in any link-bearing field are rejected by the schema and neutralised by the renderer", () => {
  const fields: Array<{ trail: Array<string | number>; doc: typeof RICH_ARTICLE }> = [
    { trail: ["blocks", 7, "items", 0, "href"], doc: RICH_ARTICLE },
    { trail: ["blocks", 13, "href"], doc: RICH_ARTICLE },
    { trail: ["sections", 0, "slides", 0, "href"], doc: RICH_PAGE },
    { trail: ["sections", 2, "stories", 0, "href"], doc: RICH_PAGE },
    { trail: ["sections", 3, "items", 0, "href"], doc: RICH_PAGE },
  ];
  for (const { trail, doc } of fields) {
    for (const target of HOSTILE_TARGETS) {
      const hostile = withLeaf(doc, trail, target);
      assert.equal(documentSchema.safeParse(hostile).success, false, `${trail.join(".")} accepted ${JSON.stringify(target)}`);
      assertInertMarkup(renderDocument(hostile), `${trail.join(".")} ${JSON.stringify(target)}`);
    }
  }
});

test("hostile masthead links are rejected by the site schema and neutralised by the renderer", () => {
  for (const target of HOSTILE_TARGETS) {
    const site = defaultSite();
    site.chrome.nav = [{ label: "Home", href: target }];
    assert.equal(siteSchema.safeParse(site).success, false, JSON.stringify(target));
    assertInertMarkup(renderDocument(RICH_ARTICLE, { chrome: site.chrome }), `nav ${JSON.stringify(target)}`);
  }
});

test("image and chart sources: only site paths, https URLs, and raster data URLs", () => {
  const badImages = [
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "/media/../../etc/passwd",
    "//evil.example/x.png",
    "/media/a b.png",
    "https://example.com/\"onerror=\"alert(1)",
    "file:///etc/passwd",
  ];
  for (const src of badImages) {
    const hostile = withLeaf(RICH_ARTICLE, ["blocks", 8, "src"], src);
    const parsed = documentSchema.safeParse(hostile);
    assert.equal(parsed.success, false, `image src accepted ${JSON.stringify(src)}`);
    assertInertMarkup(renderDocument(hostile), `image ${JSON.stringify(src)}`);
    assert.equal(safeMedia(src), null, `safeMedia passed ${JSON.stringify(src)}`);
  }
  const badCharts = ["javascript:alert(1)", "../../../etc/passwd", "content/../../etc/passwd", "file:///etc/passwd", "data:text/csv,a,b"];
  for (const dataPath of badCharts) {
    const hostile = withLeaf(RICH_ARTICLE, ["blocks", 4, "dataPath"], dataPath);
    assert.equal(documentSchema.safeParse(hostile).success, false, `chart dataPath accepted ${JSON.stringify(dataPath)}`);
  }
});

test("embeds: only allowlisted video frames, with the privacy-enhanced host", () => {
  const bad = [
    "https://evil.example/embed/dQw4w9WgXcQ",
    "https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ",
    "https://youtube-nocookie.com.evil.example/embed/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ/../../x",
    "https://player.vimeo.com/video/1?x=<script>",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ];
  const baseline = (renderDocument(RICH_ARTICLE).match(/<iframe/g) ?? []).length;
  assert.equal(baseline, 2, "the fixture has two allowlisted frames");
  for (const src of bad) {
    const hostile = withLeaf(RICH_ARTICLE, ["blocks", 14, "src"], src);
    const html = renderDocument(hostile);
    assertInertMarkup(html, `embed ${src}`);
    assert.equal((html.match(/<iframe/g) ?? []).length, baseline - 1, `iframe rendered for ${src}`);
  }
});

test("marksFromDom drops hostile anchors, handlers, and styles from pasted content", () => {
  const text = (value: string) => ({ nodeType: 3, nodeName: "#text", textContent: value, childNodes: [] as never[] });
  const el = (name: string, attrs: Record<string, string>, ...children: Array<ReturnType<typeof text>>) => ({
    nodeType: 1,
    nodeName: name.toUpperCase(),
    textContent: null,
    childNodes: children,
    getAttribute: (key: string) => attrs[key] ?? null,
  });
  for (const href of HOSTILE_TARGETS) {
    const out = marksFromDom({ nodeType: 11, nodeName: "#fragment", textContent: null, childNodes: [el("a", { href, onclick: "alert(1)" }, text("go"))] });
    assert.equal(out, "go", `anchor kept for ${JSON.stringify(href)}`);
  }
  const phishing = marksFromDom({ nodeType: 11, nodeName: "#fragment", textContent: null, childNodes: [el("a", { href: "https://evil.example" }, text("https://bank.example"))] });
  assert.ok(!phishing.includes("]("), "mismatched anchor must not survive paste");
  const script = marksFromDom({ nodeType: 11, nodeName: "#fragment", textContent: null, childNodes: [el("script", {}, text("alert(1)"))] });
  assert.ok(!/<|>/.test(script), "no markup is produced by paste");
});
