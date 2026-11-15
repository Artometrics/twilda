import assert from "node:assert/strict";
import test from "node:test";
import { applyEdit, changedRefs, getAtPath } from "@twilda/core/edit";
import {
  defaultSite,
  documentSchema,
  mergeDocuments,
  mergeSites,
  parseDocument,
  parseSite,
  renderDocument,
  serializeDocument,
  serializeSite,
  type TwildaDocument,
} from "@twilda/core";
import { RICH_ARTICLE, RICH_PAGE, assertInertMarkup } from "./support";

const POLLUTION_KEYS = ["__proto__", "constructor", "prototype"];

function assertClean(label: string): void {
  const probe = {} as Record<string, unknown>;
  for (const key of ["polluted", "isAdmin", "x", "toString", "title", "name", "href", "src"]) {
    if (key === "toString") assert.equal(typeof probe.toString, "function", label);
    else assert.equal(probe[key], undefined, `${label}: Object.prototype.${key} is set`);
  }
  assert.equal(Object.getPrototypeOf({}), Object.prototype, label);
  assert.equal(Object.getPrototypeOf([]), Array.prototype, label);
  assert.deepEqual(Object.keys(Object.prototype), [], label);
  assert.deepEqual(Object.keys(Array.prototype), [], label);
}

/** Insert `"<key>": {...payload}` into a JSON object text, as a hostile pull request would. */
function poison(value: unknown, key: string, payload: unknown): string {
  const text = JSON.stringify(value);
  return `{${JSON.stringify(key)}:${JSON.stringify(payload)},${text.slice(1)}`;
}

const PAYLOADS = [{ polluted: true }, { isAdmin: true, title: "<script>alert(1)</script>" }, { href: "javascript:alert(1)" }, [1, 2, 3], "x"];

test("JSON.parse really does create an own __proto__ key (so the guards matter)", () => {
  const parsed = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
  assert.equal(Object.hasOwn(parsed, "__proto__"), true);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("parseDocument strips polluting keys at every depth and never touches Object.prototype", () => {
  for (const base of [RICH_ARTICLE, RICH_PAGE]) {
    for (const key of POLLUTION_KEYS) {
      for (const payload of PAYLOADS) {
        const parsed = parseDocument(poison(base, key, payload));
        assert.equal(Object.hasOwn(parsed, key), false, `${key} survived at the root`);
        assertClean(`root ${key}`);
        assertInertMarkup(renderDocument(parsed), `${key} root`);
      }
    }
    // Same keys nested inside the first list item, which is where a hand-edited PR would hide them.
    const nested = structuredClone(base) as unknown as Record<string, unknown>;
    const listKey = base.kind === "article" ? "blocks" : "sections";
    const first = (nested[listKey] as Array<Record<string, unknown>>)[0] as Record<string, unknown>;
    const text = JSON.stringify(nested).replace(JSON.stringify(first), `{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},${JSON.stringify(first).slice(1)}`);
    const parsed = parseDocument(text);
    const firstParsed = (parsed as unknown as Record<string, Array<Record<string, unknown>>>)[listKey]?.[0] as Record<string, unknown>;
    assert.equal(Object.hasOwn(firstParsed, "__proto__"), false);
    assert.equal(Object.hasOwn(firstParsed, "constructor"), false);
    assertClean("nested");
  }
});

test("unknown keys are removed by the schema, so they cannot reach a renderer or a commit", () => {
  const withExtras = JSON.parse(poison(RICH_ARTICLE, "isAdmin", true)) as Record<string, unknown>;
  const parsed = documentSchema.parse(withExtras);
  assert.equal("isAdmin" in parsed, false);
  assert.ok(!serializeDocument(parsed).includes("isAdmin"));
});

test("mergeDocuments never writes through __proto__, constructor, or prototype", () => {
  const hostile = (key: string, value: unknown): TwildaDocument => {
    const copy = JSON.parse(JSON.stringify(RICH_ARTICLE)) as Record<string, unknown>;
    Object.defineProperty(copy, key, { value, enumerable: true, configurable: true, writable: true });
    return copy as unknown as TwildaDocument;
  };
  for (const key of POLLUTION_KEYS) {
    for (const payload of [{ polluted: true }, { prototype: { polluted: true } }]) {
      const ours = hostile(key, payload);
      const theirs = hostile(key, { ...payload, polluted: false });
      const result = mergeDocuments(RICH_ARTICLE, ours, theirs);
      assertClean(`merge ${key}`);
      assert.equal(Object.hasOwn(result.doc, key), false, `${key} merged into the result`);
      const noBase = mergeDocuments(null, ours, theirs);
      assert.equal(Object.hasOwn(noBase.doc, key), false);
      assertClean(`merge nobase ${key}`);
    }
  }
});

test("mergeSites and site parsing never write through polluting keys", () => {
  const site = defaultSite();
  const hostile = (key: string) => {
    const copy = JSON.parse(JSON.stringify(site)) as Record<string, unknown>;
    Object.defineProperty(copy, key, { value: { polluted: true }, enumerable: true, configurable: true, writable: true });
    const theme = copy.theme as Record<string, unknown>;
    Object.defineProperty(theme, key, { value: { polluted: true }, enumerable: true, configurable: true, writable: true });
    return copy as unknown as typeof site;
  };
  for (const key of POLLUTION_KEYS) {
    mergeSites(site, hostile(key), hostile(key));
    assertClean(`mergeSites ${key}`);
    const theirsSide = mergeSites(site, site, hostile(key));
    assertClean(`mergeSites theirs ${key}`);
    assert.equal(Object.hasOwn(theirsSide.site, key), false, `${key} was merged in from the other side`);
    const changed = { ...site, chrome: { ...site.chrome, name: "Changed" } };
    mergeSites(site, hostile(key), changed);
    assertClean(`mergeSites change ${key}`);
    const text = serializeSite(site);
    const parsed = parseSite(text.replace('"version": 1,', `"version": 1, ${JSON.stringify(key)}: {"polluted": true},`));
    assert.equal(Object.hasOwn(parsed, key), false);
    assertClean(`parseSite ${key}`);
  }
});

test("edit paths cannot address prototype members", () => {
  for (const ref of ["__proto__.polluted", "constructor.prototype.polluted", "blocks.0.__proto__.text", "blocks.0.constructor", "blocks.__proto__", "title.__proto__", "blocks.0.text.length", "toString", "hasOwnProperty"]) {
    let read: unknown;
    try {
      read = getAtPath(RICH_ARTICLE, ref);
    } catch {
      read = undefined;
    }
    assert.equal(read, undefined, `getAtPath read ${ref}`);
    const result = applyEdit(RICH_ARTICLE, ref, "x");
    assert.equal(result.ok, false, `applyEdit accepted ${ref}`);
    assertClean(ref);
  }
  const before = JSON.parse(JSON.stringify(RICH_ARTICLE)) as Record<string, unknown>;
  const after = JSON.parse(JSON.stringify(RICH_ARTICLE)) as Record<string, unknown>;
  Object.defineProperty(after, "__proto__", { value: { text: "x" }, enumerable: true, configurable: true, writable: true });
  assert.deepEqual(changedRefs(before, after), [], "polluting keys are not reported as edits");
});

test("a pull request that tries to smuggle keys into published.json changes nothing observable", () => {
  const text = poison(RICH_ARTICLE, "__proto__", { status: "draft", title: "pwned" });
  const parsed = parseDocument(text);
  assert.equal(parsed.title, RICH_ARTICLE.title);
  assert.equal(parsed.status, RICH_ARTICLE.status);
  assertClean("published.json");
});
