import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { describe, it } from "node:test";
import {
  BLOCK_TYPES,
  DEFAULT_CHROME,
  DEFAULT_THEME,
  MAGAZINE_CSS,
  PAGE_SECTION_TYPES,
  PART_FIELDS,
  PRESETS,
  PRESET_IDS,
  addNode,
  applyPreset,
  blockCatalogFor,
  contrastRatio,
  createBlock,
  createSection,
  defaultSite,
  documentSchema,
  duplicateNode,
  inLibrary,
  modeOf,
  parseSite,
  renderDocument,
  renderOptionsFor,
  sectionCatalogFor,
  serializeSite,
  siteChromeSchema,
  siteSchema,
  starterDocuments,
  starterSite,
  themeCss,
  themeSchema,
  type PresetId,
  type TwildaDocument,
} from "@twilda/core";
import { getAtPath } from "@twilda/core/edit";
import { HOSTILE_MODES_ARTICLE, HOSTILE_MODES_PAGE, modesCorpus } from "./fixtures/modes-corpus";
import { assertInertMarkup } from "./security/support";

const NEW_SECTIONS = ["hero", "feature-grid", "team", "pricing", "testimonials", "contact", "social-proof", "cta", "cover-story", "category-grid", "fast-facts"] as const;
const NEW_BLOCKS = ["fast-facts", "pull-quote", "bar-chart"] as const;
const strip = (html: string) => html.replace(/ data-twilda-[a-z-]+="[^"]*"/g, "");

function wrapPage(sections: unknown[]): unknown {
  return { id: "t", kind: "page", title: "T", slug: "t", dek: "", kicker: "", status: "draft", updatedAt: "2026-11-15T00:00:00.000Z", sections };
}
function wrapArticle(blocks: unknown[]): unknown {
  return { id: "t", kind: "article", title: "T", slug: "t", dek: "", kicker: "", byline: "", status: "draft", updatedAt: "2026-11-15T00:00:00.000Z", blocks };
}

describe("presets: what a mode is", () => {
  it("has one preset per id, and each id matches its key", () => {
    assert.deepEqual(Object.keys(PRESETS).sort(), [...PRESET_IDS].sort());
    for (const id of PRESET_IDS) assert.equal(PRESETS[id].id, id);
  });

  for (const id of PRESET_IDS) {
    const preset = PRESETS[id];
    it(`${id}: theme and masthead pass the schemas, and the library lists real, unique types`, () => {
      assert.equal(themeSchema.safeParse(preset.theme).success, true, "theme");
      assert.equal(siteChromeSchema.safeParse(preset.chrome).success, true, "chrome");
      assert.equal(new Set(preset.sections).size, preset.sections.length);
      assert.equal(new Set(preset.blocks).size, preset.blocks.length);
      for (const type of preset.sections) assert.ok((PAGE_SECTION_TYPES as readonly string[]).includes(type), type);
      for (const type of preset.blocks) assert.ok((BLOCK_TYPES as readonly string[]).includes(type), type);
    });

    it(`${id}: the theme is readable (4.5:1 for text, ink, and accent on paper) and its plate carries light text`, () => {
      const { colors } = preset.theme;
      for (const key of ["ink", "muted", "kicker"] as const) {
        assert.ok(contrastRatio(colors[key], colors.paper) >= 4.5, `${key} on paper is ${contrastRatio(colors[key], colors.paper).toFixed(2)}`);
      }
      assert.ok(contrastRatio("#f3efe4", colors.plate) >= 4.5, "the missing-plate label is light text on the plate color");
    });

    it(`${id}: masthead links point at things the starter home page actually has`, () => {
      const home = starterDocuments(id).find((doc) => doc.id === "home");
      assert.ok(home && home.kind === "page");
      const ids = new Set(home.sections.map((section) => section.id));
      for (const item of preset.chrome.nav) {
        if (item.href.startsWith("/#")) assert.ok(ids.has(item.href.slice(2)), `${id}: nav "${item.label}" points at #${item.href.slice(2)}`);
      }
    });
  }

  it("magazine keeps today's look: the default theme and masthead, byte for byte", () => {
    assert.deepEqual(PRESETS.magazine.theme, DEFAULT_THEME);
    assert.deepEqual(PRESETS.magazine.chrome, DEFAULT_CHROME);
    assert.equal(themeCss(PRESETS.magazine.theme), "");
  });

  it("offers what the brief names for each mode", () => {
    for (const type of ["hero", "feature-grid", "team", "pricing", "testimonials", "contact"]) assert.ok(inLibrary("corporate", type, "page"), `corporate ${type}`);
    for (const type of ["cover-story", "category-grid", "fast-facts"]) assert.ok(inLibrary("magazine", type, "page"), `magazine ${type}`);
    for (const type of ["fast-facts", "bar-chart", "chart", "pull-quote"]) assert.ok(inLibrary("magazine", type, "article"), `magazine block ${type}`);
    for (const type of ["hero", "feature-grid", "social-proof", "cta"]) assert.ok(inLibrary("leadgen", type, "page"), `leadgen ${type}`);
  });

  it("every prepared section and block is offered by at least one mode, and no mode offers an unknown one", () => {
    for (const type of PAGE_SECTION_TYPES) assert.ok(PRESET_IDS.some((id) => inLibrary(id, type, "page")), `no mode offers section ${type}`);
    for (const type of BLOCK_TYPES) assert.ok(PRESET_IDS.some((id) => inLibrary(id, type, "article")), `no mode offers block ${type}`);
  });

  it("the catalogs the desk shows follow the mode, in the mode's order", () => {
    for (const id of PRESET_IDS) {
      assert.deepEqual(sectionCatalogFor(id).map((entry) => entry.type), [...PRESETS[id].sections]);
      assert.deepEqual(blockCatalogFor(id).map((entry) => entry.type), [...PRESETS[id].blocks]);
      for (const entry of [...sectionCatalogFor(id), ...blockCatalogFor(id)]) assert.ok(entry.label && entry.hint, `${id} ${entry.type} has a label and a hint`);
    }
  });
});

describe("modes in site.json", () => {
  it("a site with no mode is a magazine and serializes without a mode key", () => {
    const site = defaultSite();
    assert.equal(modeOf(site), "magazine");
    assert.equal("mode" in JSON.parse(serializeSite(site)), false);
    assert.equal(serializeSite(parseSite(readFileSync("content/site.json", "utf8"))), readFileSync("content/site.json", "utf8"));
  });

  it("a mode round-trips, and an unknown mode is refused", () => {
    for (const id of PRESET_IDS) {
      const site = starterSite(id);
      assert.equal(parseSite(serializeSite(site)).mode, id);
      assert.deepEqual(parseSite(serializeSite(site)), site);
    }
    for (const bad of ["blog", "", "__proto__", "Corporate", 3, null, ["corporate"]]) {
      assert.equal(siteSchema.safeParse({ ...defaultSite(), mode: bad }).success, false, JSON.stringify(bad));
    }
  });

  it("applyPreset swaps theme, masthead, and mode, and keeps per-document overrides", () => {
    const base = { ...defaultSite(), documents: { home: { note: "Kept" } }, templates: { article: { issueLabel: "Kept too" } } };
    for (const id of PRESET_IDS) {
      const next = applyPreset(base, id);
      assert.equal(next.mode, id);
      assert.deepEqual(next.theme, PRESETS[id].theme);
      assert.deepEqual(next.chrome, PRESETS[id].chrome);
      assert.deepEqual(next.documents, base.documents);
      assert.deepEqual(next.templates, base.templates);
      assert.equal(siteSchema.safeParse(next).success, true);
      next.theme.colors.ink = "#000000";
      assert.notEqual(PRESETS[id].theme.colors.ink, "#000000", "applying a preset must copy, never share, its theme");
    }
  });

  it("renderOptionsFor carries the mode only when the site chose one", () => {
    const doc = starterDocuments("corporate")[0] as TwildaDocument;
    assert.equal("mode" in renderOptionsFor(defaultSite(), doc), false);
    assert.equal(renderOptionsFor(starterSite("leadgen"), doc).mode, "leadgen");
  });
});

describe("starter documents", () => {
  for (const id of PRESET_IDS) {
    it(`${id}: every document passes the core schema, has unique ids, and renders inert markup`, () => {
      const docs = starterDocuments(id);
      assert.ok(docs.length >= 2);
      assert.deepEqual(docs.map((doc) => doc.id).filter((value, index, all) => all.indexOf(value) !== index), []);
      for (const doc of docs) {
        assert.equal(documentSchema.safeParse(doc).success, true, doc.id);
        assert.equal(doc.status, "published");
        for (const annotate of [false, true]) assertInertMarkup(renderDocument(doc, { annotate, ...renderOptionsFor(starterSite(id), doc) }), `${id}/${doc.id}`);
      }
    });

    it(`${id}: every internal link goes to a document that exists or a section on the page`, () => {
      const docs = starterDocuments(id);
      const slugs = new Set(docs.filter((doc) => doc.kind === "article").map((doc) => `/articles/${doc.slug}`));
      const home = docs.find((doc) => doc.id === "home");
      assert.ok(home && home.kind === "page");
      const anchors = new Set(home.sections.map((section) => section.id));
      const hrefs: string[] = [];
      const walk = (value: unknown, key = "") => {
        if (typeof value === "string" && /(?:^|[a-z])(?:href|Href)$/.test(key)) hrefs.push(value);
        else if (Array.isArray(value)) value.forEach((item) => walk(item, key));
        else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
      };
      for (const doc of docs) walk(doc);
      assert.ok(hrefs.length > 0);
      for (const href of hrefs) {
        if (href.startsWith("/#")) assert.ok(anchors.has(href.slice(2)), `${id}: ${href} has no section`);
        else if (href.startsWith("/articles/")) assert.ok(slugs.has(href), `${id}: ${href} has no article`);
        else if (href.startsWith("/")) assert.equal(href, "/", href);
        else assert.match(href, /^(?:https:\/\/(?:[a-z0-9-]+\.)*example(?:\.com)?\/|mailto:[a-z]+@(?:[a-z0-9-]+\.)*example(?:\.com)?$)/, `${id}: ${href} must be a reserved example address`);
      }
    });

    it(`${id}: the starter's text is fictional (no real company domains)`, () => {
      const text = JSON.stringify([starterSite(id), ...starterDocuments(id)]);
      for (const domain of text.match(/[a-z0-9-]+(?:\.[a-z0-9-]+)+/g) ?? []) {
        if (/\.(?:svg|json|css)$/.test(domain)) continue;
        assert.match(domain, /(?:^|\.)example(?:\.com)?$|^brightline\.example|^forms\.example\.com$|^[0-9.]+$/, domain);
      }
    });
  }
});

describe("prepared parts validate against the core schema", () => {
  for (const type of NEW_SECTIONS) {
    it(`section ${type}: the library's new part is valid, duplicates with fresh ids, and adds to a page`, () => {
      const section = createSection(type);
      const page = documentSchema.parse(wrapPage([section])) as TwildaDocument;
      assert.equal(page.kind, "page");
      const added = addNode(page, type, 1);
      assert.ok(added.ok);
      if (!added.ok) return;
      assert.equal(documentSchema.safeParse(added.doc).success, true);
      const copy = duplicateNode(added.doc, 0);
      assert.ok(copy.ok);
      if (!copy.ok || copy.doc.kind !== "page") return;
      assert.equal(documentSchema.safeParse(copy.doc).success, true);
      const ids = JSON.stringify(copy.doc.sections).match(/"id":"[^"]+"/g) ?? [];
      assert.equal(new Set(ids).size, ids.length, "duplicating must not repeat any id");
    });
  }
  for (const type of NEW_BLOCKS) {
    it(`block ${type}: the library's new part is valid and adds to an article`, () => {
      const article = documentSchema.parse(wrapArticle([createBlock("paragraph"), createBlock(type)])) as TwildaDocument;
      const added = addNode(article, type, 0);
      assert.ok(added.ok);
      if (added.ok) assert.equal(documentSchema.safeParse(added.doc).success, true);
    });
  }

  it("a page that is a mode's whole home page can reach every section the mode offers", () => {
    for (const id of PRESET_IDS) {
      for (const type of PRESETS[id].sections) {
        assert.equal(documentSchema.safeParse(wrapPage([createSection(type)])).success, true, `${id}/${type}`);
      }
      for (const type of PRESETS[id].blocks) {
        if (["image", "embed", "download", "chart", "sources"].includes(type)) continue;
        assert.equal(documentSchema.safeParse(wrapArticle([createBlock(type)])).success, true, `${id}/${type}`);
      }
    }
  });
});

/** String-valued keys of a part, as a sorted list of dotted shapes (array indexes dropped). */
function shapes(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (typeof value === "boolean") return [`${prefix}:boolean`];
  if (Array.isArray(value)) return value.flatMap((item) => shapes(item, prefix));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => (key === "id" || key === "type" ? [] : shapes(item, prefix ? `${prefix}.${key}` : key)));
  }
  return [];
}

describe("the desk's field list covers every field of every mode part", () => {
  const cases: Array<[string, "sections" | "blocks", unknown]> = [
    ...NEW_SECTIONS.map((type) => [type, "sections", createSection(type)] as [string, "sections", unknown]),
    ...NEW_BLOCKS.map((type) => [type, "blocks", createBlock(type)] as [string, "blocks", unknown]),
  ];
  for (const [type, kind, part] of cases) {
    it(`${kind.slice(0, -1)} ${type}`, () => {
      const spec = PART_FIELDS[kind][type];
      assert.ok(spec, "has a field list");
      const listed = new Set<string>();
      for (const field of spec.fields) listed.add(field.kind === "boolean" ? `${field.key}:boolean` : field.key);
      for (const list of spec.lists) {
        if (list.fields) for (const field of list.fields) listed.add(field.kind === "boolean" ? `${list.key}.${field.key}:boolean` : `${list.key}.${field.key}`);
        else listed.add(list.key);
      }
      assert.deepEqual([...new Set(shapes(part))].sort(), [...listed].sort());
      for (const list of spec.lists) {
        assert.ok(list.min <= list.max);
        const value = (part as Record<string, unknown[]>)[list.key] ?? [];
        assert.ok(value.length >= Math.max(list.min, 0) && value.length <= list.max, `${list.key} default is within its bounds`);
      }
    });
  }

  it("the blank item for every list keeps the part valid up to its maximum, and one more is refused", () => {
    for (const [type, kind, part] of cases) {
      const spec = PART_FIELDS[kind][type] as NonNullable<(typeof PART_FIELDS)["sections"][string]>;
      for (const list of spec.lists) {
        const blank = (n: number): unknown => (list.stringLabel ? "Text" : { id: `i${n}`, ...list.blank });
        const make = (count: number) => ({ ...(part as object), [list.key]: Array.from({ length: count }, (_, n) => blank(n)) });
        const wrap = (value: unknown) => (kind === "sections" ? wrapPage([value]) : wrapArticle([value]));
        assert.equal(documentSchema.safeParse(wrap(make(list.max))).success, true, `${type}.${list.key} at max ${list.max}`);
        assert.equal(documentSchema.safeParse(wrap(make(list.max + 1))).success, false, `${type}.${list.key} over max`);
        if (list.min > 0) assert.equal(documentSchema.safeParse(wrap(make(list.min - 1))).success, false, `${type}.${list.key} under min`);
      }
    }
  });
});

describe("rendering the modes", () => {
  it("the mode only adds a wrapper class; magazine and no mode print the same markup", () => {
    const doc = starterDocuments("magazine")[0] as TwildaDocument;
    assert.equal(renderDocument(doc, { mode: "magazine" }), renderDocument(doc));
    assert.match(renderDocument(doc, { mode: "corporate" }), /^<div class="magazine mode-corporate">/);
    assert.match(renderDocument(doc, { mode: "leadgen" }), /^<div class="magazine mode-leadgen">/);
    assert.equal(strip(renderDocument(doc, { mode: "corporate" })).replace(" mode-corporate", ""), renderDocument(doc));
    assert.doesNotMatch(renderDocument(doc, { mode: "../x" as PresetId }), /mode-/);
  });

  it("a page that opens with a hero or a cover story gives that section the h1, once", () => {
    for (const id of PRESET_IDS) {
      const home = starterDocuments(id).find((doc) => doc.id === "home") as TwildaDocument;
      const html = renderDocument(home);
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${id} has one h1`);
      assert.ok(!html.includes(`>${home.title}<`), "the page title is metadata here, not printed twice");
    }
    const page = HOSTILE_MODES_PAGE;
    if (page.kind !== "page") throw new Error("page expected");
    const notFirst = { ...page, sections: [...page.sections.slice(2), page.sections[0]!] } as TwildaDocument;
    const html = renderDocument(notFirst);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    assert.match(html, /<h1>Modes /, "the page's own heading leads when no hero does");
  });

  it("an optional empty line prints no button and no broken link", () => {
    const html = renderDocument(HOSTILE_MODES_PAGE);
    const page = HOSTILE_MODES_PAGE;
    if (page.kind !== "page") throw new Error("page expected");
    const hero = page.sections.find((section) => section.type === "hero");
    if (!hero || hero.type !== "hero") throw new Error("hero expected");
    const without = renderDocument({ ...page, sections: [{ ...hero, secondaryLabel: "", secondaryHref: "" }] });
    const withBoth = renderDocument({ ...page, sections: [hero] });
    assert.equal((withBoth.match(/class="btn btn-secondary"/g) ?? []).length, 1);
    assert.equal((without.match(/class="btn btn-secondary"/g) ?? []).length, 0);
    for (const match of html.matchAll(/<a class="btn[^"]*" href="([^"]*)"/g)) assert.notEqual(match[1], "");
  });

  it("external buttons carry rel=noopener noreferrer and site paths do not", () => {
    const html = renderDocument(HOSTILE_MODES_PAGE);
    assert.match(html, /<a class="btn btn-primary" href="https:\/\/example\.com\/a\?b=1&amp;c=2" rel="noopener noreferrer">/);
    assert.match(html, /<a class="btn btn-primary" href="\/#contact">/);
    assert.match(html, /href="mailto:desk@example\.com"/);
  });

  it("bar widths come from classes, scale to the largest bar, and survive nonsense numbers", () => {
    const html = renderDocument(HOSTILE_MODES_ARTICLE);
    assert.match(html, /bar bar-w-100"/);
    assert.match(html, /bar bar-w-31"/);
    assert.match(html, /bar bar-w-0"/);
    assert.doesNotMatch(html, /style=/);
    const weird = documentSchema.parse(wrapArticle([createBlock("bar-chart")])) as TwildaDocument;
    for (const value of ["1e999", "-5", "NaN", "Infinity", "<script>", "", "0", "99999999999999999999"]) {
      const hostile = { ...weird, blocks: [{ ...(weird as { blocks: object[] }).blocks[0], bars: [{ id: "a", label: "A", value }, { id: "b", label: "B", value: "10" }] }] } as unknown as TwildaDocument;
      const out = renderDocument(hostile);
      for (const match of out.matchAll(/bar-w-(\d+)/g)) assert.ok(Number(match[1]) >= 0 && Number(match[1]) <= 100, `${value} -> ${match[0]}`);
      assertInertMarkup(out, `bar value ${value}`);
    }
  });

  it("every class the new markup prints is styled by the template stylesheet", () => {
    const printed = new Set<string>();
    for (const { doc } of modesCorpus()) {
      for (const match of renderDocument(doc, { mode: "corporate" }).matchAll(/class="([^"]+)"/g)) for (const token of (match[1] as string).split(/\s+/)) printed.add(token);
    }
    const unstyled = [...printed].filter((token) => !new RegExp(`\\.${token.replace(/[-]/g, "\\-")}(?![\\w-])`).test(MAGAZINE_CSS));
    // Structural hooks that carry no rule of their own: each section's wrapper class, and a few figure and button variants.
    const hooks = new Set(["btn-secondary", "hero-plate", "bar-chart", "sources"]);
    assert.deepEqual(unstyled.filter((token) => !hooks.has(token) && !token.endsWith("-section")), []);
  });

  it("the stylesheet is responsive: single-column rules for 800px and 560px, a minimum of 2.75rem for tap targets, and no fixed widths over 320px", () => {
    assert.match(MAGAZINE_CSS, /@media \(max-width: 800px\)[\s\S]*\.hero[\s\S]*grid-template-columns: 1fr;/);
    assert.match(MAGAZINE_CSS, /@media \(max-width: 560px\)/);
    assert.match(MAGAZINE_CSS, /\.btn \{[^}]*min-height: 2\.75rem/);
    for (const grid of MAGAZINE_CSS.match(/minmax\(min\(100%, [\d.]+rem\), 1fr\)/g) ?? []) {
      assert.ok(Number(/([\d.]+)rem/.exec(grid)?.[1]) <= 15, `${grid} fits two columns at 390px or one at 320px`);
    }
  });

  it("every annotated field of every starter and hostile fixture resolves and edits through the schema", async () => {
    const { applyEdit } = await import("@twilda/core/edit");
    let edited = 0;
    for (const { name, doc } of modesCorpus()) {
      assert.equal(strip(renderDocument(doc, { annotate: true })), renderDocument(doc), `${name}: annotation changes nothing else`);
      const refs = [...renderDocument(doc, { annotate: true }).matchAll(/data-twilda-(?:alt-)?ref="([^"]+)"/g)].map((match) => match[1] as string);
      for (const ref of refs) {
        const current = getAtPath(doc, ref);
        assert.equal(typeof current, "string", `${name}: ${ref}`);
        const same = applyEdit(doc, ref, current as string);
        assert.ok(same.ok || /not valid|required|at least|short|empty/i.test(same.error), `${name}: ${ref} -> ${same.ok ? "" : same.error}`);
        edited += 1;
      }
    }
    assert.ok(edited > 300, `only ${edited} fields were exercised`);
  });
});

test("the bar chart refuses a value that is not a plain number", async () => {
  const { applyEdit } = await import("@twilda/core/edit");
  const doc = documentSchema.parse(wrapArticle([createBlock("bar-chart")])) as TwildaDocument;
  for (const bad of ["abc", "1e5", "-3", "1,5", " 4", "4 ", "0x10", "1234567890", "<b>1</b>", "1.234", ""]) {
    assert.equal(applyEdit(doc, "blocks.0.bars.0.value", bad).ok, false, JSON.stringify(bad));
  }
  for (const good of ["0", "7", "12.5", "999999999", "0.25"]) assert.equal(applyEdit(doc, "blocks.0.bars.0.value", good).ok, true, good);
});
