import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  DEFAULT_CHROME,
  DEFAULT_THEME,
  MAGAZINE_CSS,
  THEME_FONTS,
  contrastRatio,
  defaultSite,
  documentSchema,
  parseSite,
  renderDocument,
  resolveChrome,
  serializeSite,
  siteSchema,
  themeCss,
  themeSchema,
  themeVars,
} from "@twilda/core";

describe("site settings", () => {
  it("the shipped content/site.json is valid and equals the built-in default", () => {
    const shipped = parseSite(readFileSync("content/site.json", "utf8"));
    assert.deepEqual(shipped, defaultSite());
    assert.equal(serializeSite(shipped), readFileSync("content/site.json", "utf8"));
  });

  it("the default theme produces no stylesheet, so the default site carries no override", () => {
    assert.equal(themeCss(DEFAULT_THEME), "");
  });

  it("default chrome renders byte-identically to passing no chrome", () => {
    const home = documentSchema.parse(JSON.parse(readFileSync("content/home/published.json", "utf8")));
    assert.equal(renderDocument(home, { chrome: resolveChrome(defaultSite(), home) }), renderDocument(home));
  });

  it("resolves chrome from the site, then the template, then the document", () => {
    const site = siteSchema.parse({
      ...defaultSite(),
      templates: { article: { issueLabel: "Long reads" } },
      documents: { "lumen-rail": { name: "Lumen Desk", note: "Own note" } },
    });
    assert.equal(resolveChrome(site, { id: "home", kind: "page" }).issueLabel, DEFAULT_CHROME.issueLabel);
    assert.equal(resolveChrome(site, { id: "other", kind: "article" }).issueLabel, "Long reads");
    const own = resolveChrome(site, { id: "lumen-rail", kind: "article" });
    assert.equal(own.name, "Lumen Desk");
    assert.equal(own.issueLabel, "Long reads");
    assert.equal(own.note, "Own note");
    const html = renderDocument(documentSchema.parse(JSON.parse(readFileSync("content/lumen-rail/published.json", "utf8"))), { chrome: own });
    assert.match(html, /Lumen Desk/);
    assert.match(html, /Long reads/);
  });

  it("derives a stylesheet from tokens, in the closed list of custom properties only", () => {
    const theme = { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors, paper: "#FFFFFF" }, fonts: { heading: "georgia" as const, body: "system-sans" as const }, baseSize: 18, headingScale: 1.1, spacing: 1.2 };
    const css = themeCss(theme);
    assert.match(css, /^:root\{--site-paper:#ffffff;/);
    for (const name of Object.keys(themeVars(theme))) assert.match(name, /^--site-[a-z-]+$/);
    assert.equal(css.split("\n").length, 3);
    assert.match(css, /--site-base:1\.125rem/);
    assert.match(css, /--site-font-heading:Georgia/);
  });

  it("the stylesheet reads every token with a fallback equal to the default look", () => {
    for (const name of Object.keys(themeVars(DEFAULT_THEME))) assert.ok(MAGAZINE_CSS.includes(`var(${name}`), name);
  });
});

describe("site settings: hostile and out-of-range values", () => {
  const withColors = (paper: string) => ({ ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors, paper } });

  it("accepts only six-digit hex colors", () => {
    for (const bad of ["red", "#fff", "#12345", "#1234567", "#gggggg", "url(javascript:alert(1))", "#fff;}body{display:none", "#ffffff\n}", "expression(1)", "var(--x)", ""]) {
      assert.equal(themeSchema.safeParse(withColors(bad)).success, false, bad);
      assert.throws(() => themeCss(withColors(bad) as never), (error: unknown) => error instanceof Error, bad);
    }
    assert.equal(themeSchema.safeParse(withColors("#aBcDeF")).success, true);
  });

  it("accepts only fonts from the curated list", () => {
    for (const bad of ["Comic Sans", "serif; }", "inherit", "url(x)", "newsreader, evil", "__proto__"]) {
      assert.equal(themeSchema.safeParse({ ...DEFAULT_THEME, fonts: { heading: bad, body: "newsreader" } }).success, false, bad);
    }
    for (const id of Object.keys(THEME_FONTS)) assert.equal(themeSchema.safeParse({ ...DEFAULT_THEME, fonts: { heading: id, body: id } }).success, true, id);
    for (const font of Object.values(THEME_FONTS)) assert.doesNotMatch(font.stack, /[;{}<>\\]|url\(|@import/i);
  });

  it("bounds the type scale and spacing", () => {
    for (const patch of [{ baseSize: 8 }, { baseSize: 40 }, { baseSize: Number.NaN }, { baseSize: 17.3 }, { headingScale: 0 }, { headingScale: 5 }, { spacing: -1 }, { spacing: 2 }, { spacing: "1; x" }, { baseSize: Number.POSITIVE_INFINITY }]) {
      assert.equal(themeSchema.safeParse({ ...DEFAULT_THEME, ...patch }).success, false, JSON.stringify(patch));
    }
    assert.equal(themeSchema.safeParse({ ...DEFAULT_THEME, baseSize: 21, headingScale: 1.3, spacing: 0.7 }).success, true);
  });

  it("refuses a file with unsafe links, long text, or malformed JSON", () => {
    const site = defaultSite();
    for (const bad of [
      { ...site, chrome: { ...site.chrome, nav: [{ label: "x", href: "javascript:alert(1)" }] } },
      { ...site, chrome: { ...site.chrome, name: "" } },
      { ...site, chrome: { ...site.chrome, name: "x".repeat(61) } },
      { ...site, chrome: { ...site.chrome, nav: Array.from({ length: 9 }, () => ({ label: "x", href: "/" })) } },
      { ...site, documents: { "Bad Id": { name: "x" } } },
      { ...site, version: 2 },
    ]) {
      assert.equal(siteSchema.safeParse(bad).success, false);
    }
    assert.throws(() => parseSite("{nope"), /not valid JSON/);
    assert.throws(() => parseSite("{}"), undefined);
  });

  it("escapes masthead text when it is rendered", () => {
    const home = documentSchema.parse(JSON.parse(readFileSync("content/home/published.json", "utf8")));
    const chrome = { ...DEFAULT_CHROME, name: "<script>alert(1)</script>", colophon: '"><img src=x onerror=alert(1)>' };
    const html = renderDocument(home, { chrome });
    assert.equal(html.includes("<script>alert"), false);
    assert.equal(html.includes("<img src=x"), false);
  });

  it("measures contrast", () => {
    assert.ok(contrastRatio("#000000", "#ffffff") > 20.9);
    assert.equal(contrastRatio("#777777", "#777777"), 1);
    assert.ok(contrastRatio(DEFAULT_THEME.colors.ink, DEFAULT_THEME.colors.paper) > 7);
  });
});
