import assert from "node:assert/strict";
import test from "node:test";
import {
  PRESET_IDS,
  actionHrefSchema,
  documentSchema,
  isActionHref,
  isMailto,
  renderDocument,
  starterSite,
  type PresetId,
  type TwildaDocument,
} from "@twilda/core";
import { HOSTILE_MODES_ARTICLE, HOSTILE_MODES_PAGE, modesCorpus } from "../fixtures/modes-corpus";
import { STRUCTURAL_KEYS, XSS_PAYLOADS, assertInertMarkup, scanTags, stringLeaves, withLeaf } from "./support";

function leafCases(doc: TwildaDocument) {
  return stringLeaves(doc).filter((leaf) => !STRUCTURAL_KEYS.has(String(leaf.path[leaf.path.length - 1])));
}

test("every starter and hostile mode fixture renders inert in every mode, annotated or not", () => {
  for (const { name, doc } of modesCorpus()) {
    for (const mode of [undefined, ...PRESET_IDS] as Array<PresetId | undefined>) {
      for (const annotate of [false, true]) {
        const html = renderDocument(doc, { annotate, ...(mode ? { mode } : {}) });
        assertInertMarkup(html, `${name} mode=${mode} annotate=${annotate}`);
      }
    }
  }
});

for (const [label, doc] of [
  ["mode sections", HOSTILE_MODES_PAGE],
  ["mode blocks", HOSTILE_MODES_ARTICLE],
] as const) {
  test(`${label}: every string field survives every XSS payload (renderer alone, schema bypassed)`, () => {
    const leaves = leafCases(doc);
    assert.ok(leaves.length > (label === "mode sections" ? 100 : 15), `the fixture must exercise many fields, got ${leaves.length}`);
    for (const leaf of leaves) {
      for (const payload of XSS_PAYLOADS) {
        const hostile = withLeaf(doc, leaf.path, payload);
        for (const annotate of [false, true]) {
          assertInertMarkup(
            renderDocument(hostile, { annotate, mode: "corporate" }),
            `${label} ${leaf.path.join(".")} annotate=${annotate} payload=${JSON.stringify(payload).slice(0, 40)}`,
          );
        }
      }
    }
  });

  test(`${label}: the same payloads through the schema are rejected or rendered inert`, () => {
    let accepted = 0;
    let rejected = 0;
    for (const leaf of leafCases(doc)) {
      for (const payload of XSS_PAYLOADS) {
        const parsed = documentSchema.safeParse(withLeaf(doc, leaf.path, payload));
        if (!parsed.success) {
          rejected += 1;
          continue;
        }
        accepted += 1;
        assertInertMarkup(renderDocument(parsed.data, { annotate: true, mode: "leadgen" }), `${label} ${leaf.path.join(".")}`);
      }
    }
    assert.ok(accepted > 0 && rejected > 0, `expected both outcomes, got accepted=${accepted} rejected=${rejected}`);
  });

  test(`${label}: hostile text is shown as text, never as markup`, () => {
    const html = renderDocument(doc);
    assert.ok(html.includes("&lt;b&gt;"), "the fixture's markup-looking text is entity-encoded");
    assert.ok(!html.includes("<b>&#39;x"), "and never parsed");
    const names = new Set(scanTags(html).tags.map((tag) => tag.name));
    for (const banned of ["script", "style", "form", "input", "iframe", "object", "embed", "svg", "math", "base", "meta", "link"]) {
      assert.ok(!names.has(banned), `${banned} appeared`);
    }
  });
}

test("ids and bar classes cannot break out of an attribute", () => {
  for (const payload of [`x" onmouseover="alert(1)`, `x' onfocus='alert(1)`, `x"><script>alert(1)</script>`]) {
    for (const [label, doc, list] of [
      ["section", HOSTILE_MODES_PAGE, "sections"],
      ["block", HOSTILE_MODES_ARTICLE, "blocks"],
    ] as const) {
      const items = (doc as unknown as Record<string, unknown[]>)[list] as Array<{ id: string }>;
      for (const index of items.keys()) {
        assertInertMarkup(renderDocument(withLeaf(doc, [list, index, "id"], payload), { annotate: true }), `${label} ${index} id`);
      }
    }
  }
});

/** Targets a browser would follow somewhere other than where a quick read suggests, plus mailto abuse. */
const HOSTILE_ACTIONS: string[] = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  "java\tscript:alert(1)",
  "&#106;avascript:alert(1)",
  "%6Aavascript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "file:///etc/passwd",
  "tel:+15555550100",
  "sms:+15555550100",
  "//evil.example/path",
  "/\\evil.example",
  "\\\\evil.example\\share",
  "https://user:pass@example.com/",
  "https://example.com@evil.example/",
  "https://xn--xample-9ve.com/",
  "https://\u0435xample.com/",
  'https://example.com/"onmouseover="alert(1)',
  "https://example.com/ with space",
  "mailto:",
  "mailto:a@b",
  "mailto:desk@example.com?subject=hi",
  "mailto:desk@example.com?cc=boss@example.com&bcc=x@evil.example",
  "mailto:desk@example.com,other@evil.example",
  "mailto:a@b@c.example",
  "mailto:desk@xn--xample-9ve.com",
  "mailto:desk@\u0435xample.com",
  "mailto:desk@example.com\n",
  "mailto:desk@example.com ",
  "mailto:<script>@example.com",
  "mailto:%0d%0abcc:x@evil.example@example.com",
  `mailto:${"a".repeat(80)}@example.com`,
  `mailto:desk@${"a".repeat(140)}.example.com`,
];

test("hostile action links are refused by the helpers and the schema, and never printed as links", () => {
  const hero = (HOSTILE_MODES_PAGE as { sections: Array<Record<string, unknown>> }).sections.find((section) => section.type === "hero") as Record<string, unknown>;
  for (const target of HOSTILE_ACTIONS) {
    assert.equal(isActionHref(target), false, `isActionHref accepted ${JSON.stringify(target)}`);
    assert.equal(actionHrefSchema.safeParse(target).success, false, `schema accepted ${JSON.stringify(target)}`);
    for (const field of ["primaryHref", "secondaryHref"]) {
      const hostile = { ...HOSTILE_MODES_PAGE, sections: [{ ...hero, [field]: target }] };
      assert.equal(documentSchema.safeParse(hostile).success, false, `${field} accepted ${JSON.stringify(target)}`);
      const html = renderDocument(hostile as unknown as TwildaDocument);
      assertInertMarkup(html, `${field} ${JSON.stringify(target)}`);
      const hrefs = [...html.matchAll(/<a class="btn[^"]*" href="([^"]*)"/g)].map((match) => match[1] as string);
      for (const href of hrefs) {
        assert.ok(href === "#" || /^(?:\/(?!\/)|https:\/\/|mailto:)/.test(href), `${field} printed ${href}`);
        assert.notEqual(href, target, `${field} printed the hostile target`);
      }
    }
  }
});

test("the safe action targets are accepted: site paths, anchors, https, and a bare mailto", () => {
  for (const target of ["/", "/#contact", "/articles/a-slug", "https://example.com/a?b=1&c=2", "mailto:desk@example.com", "mailto:first.last+tag@sub.example.com"]) {
    assert.equal(isActionHref(target), true, target);
    assert.equal(actionHrefSchema.safeParse(target).success, true, target);
  }
  assert.equal(isMailto("mailto:desk@example.com"), true);
  assert.equal(isMailto("https://example.com/"), false);
});

test("external action links open safely and mailto links carry no query", () => {
  const html = renderDocument(HOSTILE_MODES_PAGE);
  for (const match of html.matchAll(/<a [^>]*href="(https:\/\/[^"]+)"[^>]*>/g)) {
    if (!(match[0] as string).includes('class="btn')) continue;
    assert.match(match[0] as string, / rel="noopener noreferrer"/, match[1]);
  }
  for (const match of html.matchAll(/href="(mailto:[^"]*)"/g)) assert.ok(!/[?&=]/.test(match[1] as string), match[1]);
});

test("list sizes are capped by the schema, so a hostile document cannot make the page enormous", () => {
  const page = HOSTILE_MODES_PAGE as { sections: Array<Record<string, unknown>> };
  const caps: Array<[string, string, number]> = [
    ["feature-grid", "items", 12],
    ["team", "members", 12],
    ["pricing", "tiers", 4],
    ["testimonials", "items", 6],
    ["contact", "channels", 6],
    ["social-proof", "brands", 10],
    ["social-proof", "stats", 4],
    ["cta", "asks", 4],
    ["category-grid", "categories", 12],
    ["fast-facts", "facts", 8],
  ];
  for (const [type, key, cap] of caps) {
    const section = page.sections.find((entry) => entry.type === type);
    assert.ok(section, type);
    const items = section[key] as unknown[];
    assert.ok(Array.isArray(items) && items.length > 0, `${type}.${key}`);
    const grow = (count: number) => ({ ...HOSTILE_MODES_PAGE, sections: [{ ...section, [key]: Array.from({ length: count }, (_, n) => (typeof items[0] === "string" ? "x" : { ...(items[0] as object), id: `n${n}` })) }] });
    const atCap = documentSchema.safeParse(grow(cap));
    const over = documentSchema.safeParse(grow(cap + 1));
    assert.equal(over.success, false, `${type}.${key} accepted ${cap + 1}`);
    if (!atCap.success) assert.fail(`${type}.${key} should accept ${cap}: ${atCap.error.issues[0]?.message}`);
  }
});

test("the mode name itself cannot carry markup into the wrapper class", () => {
  for (const payload of XSS_PAYLOADS) {
    const html = renderDocument(HOSTILE_MODES_PAGE, { mode: payload as PresetId });
    assertInertMarkup(html, `mode ${JSON.stringify(payload).slice(0, 30)}`);
    assert.doesNotMatch(html.slice(0, 200), /mode-/, "an unknown mode is ignored, not echoed");
  }
});

test("starter sites keep the site-wide security surface: masthead links and theme pass the same rules", () => {
  for (const id of PRESET_IDS) {
    const site = starterSite(id);
    for (const item of site.chrome.nav) assert.ok(isActionHref(item.href), `${id}: ${item.href}`);
    for (const color of Object.values(site.theme.colors)) assert.match(color, /^#[0-9a-f]{6}$/i);
  }
});
