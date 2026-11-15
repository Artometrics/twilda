import assert from "node:assert/strict";
import test from "node:test";
import { escapeMarks, parseMarks, renderMarks, stripMarks } from "@twilda/core";
import { XSS_PAYLOADS, assertInertMarkup, scanTags } from "./support";

const LEVELS = ["emphasis", "links"] as const;

const HOSTILE_MARKDOWN: string[] = [
  ...XSS_PAYLOADS,
  "**<script>alert(1)</script>**",
  "*[a](javascript:alert(1))*",
  "[[x](javascript:alert(1))](https://example.com)",
  "[x](https://example.com/\"onmouseover=\"alert(1))",
  "[x](https://example.com/ onmouseover=alert(1))",
  "[x](https://example.com)(javascript:alert(1))",
  "[x](<javascript:alert(1)>)",
  "[x]( javascript:alert(1))",
  "[x](java&#x73;cript:alert(1))",
  "[<img src=x onerror=alert(1)>](https://example.com)",
  "[\"><img src=x onerror=alert(1)>](https://example.com)",
  "**[x](https://example.com)**",
  "***[x](https://example.com)***",
  "\\[x](javascript:alert(1))",
  "[x\\](javascript:alert(1))",
  "[x](https://example.com\\)",
  "* * *",
  "**",
  "***",
  "[",
  "]",
  "[]()",
  "[](https://example.com)",
  "[x](",
  "[x](https://example.com",
  "\u0000**x**\u0000",
  "**a**b**c**d**",
  "*a **b* c**",
  "[a](https://example.com)[b](https://example.org)",
];

test("hostile markdown renders only strong, em, and safe anchors", () => {
  for (const level of LEVELS) {
    for (const source of HOSTILE_MARKDOWN) {
      const html = renderMarks(source, level);
      assertInertMarkup(`<p>${html}</p>`, `${level}: ${JSON.stringify(source)}`);
      const names = new Set(scanTags(html).tags.map((tag) => tag.name));
      for (const name of names) assert.ok(["strong", "em", "a"].includes(name), `${name} produced by ${JSON.stringify(source)}`);
      if (level === "emphasis") assert.ok(!names.has("a"), "emphasis level never produces an anchor");
    }
  }
});

test("emphasis level never links, and links level links only safe targets", () => {
  assert.ok(!renderMarks("[x](https://example.com)", "emphasis").includes("<a "));
  assert.ok(renderMarks("[x](https://example.com)", "links").includes('<a href="https://example.com"'));
  assert.ok(renderMarks("[x](https://example.com)", "links").includes("noopener"));
  assert.ok(!renderMarks("[x](javascript:alert(1))", "links").includes("<a "));
});

test("escaped markup stays literal and round-trips", () => {
  for (const text of ["*star* [bracket](paren) \\ slash", "<b>bold</b>", "a * b * c", "(x)[y]"]) {
    const rendered = renderMarks(escapeMarks(text));
    assert.equal(stripMarks(escapeMarks(text)), text);
    assert.ok(!rendered.includes("<strong>") && !rendered.includes("<em>") && !rendered.includes("<a "), rendered);
  }
});

test("the parser never throws on random punctuation soup and stays linear", () => {
  const alphabet = ["*", "**", "[", "]", "(", ")", "\\", "a", " ", "https://example.com", "javascript:", "\n", "<", ">"];
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  for (let round = 0; round < 400; round += 1) {
    let source = "";
    for (let i = 0; i < 60; i += 1) source += alphabet[next() % alphabet.length];
    for (const level of LEVELS) {
      assert.doesNotThrow(() => parseMarks(source, level), source);
      assertInertMarkup(`<p>${renderMarks(source, level)}</p>`, source);
    }
  }
});

test("pathological nesting and run lengths are bounded in time", () => {
  const cases = [
    "*".repeat(100_000),
    "**".repeat(50_000),
    "[".repeat(50_000),
    "[a](".repeat(20_000),
    "[a]".repeat(30_000),
    "*a ".repeat(30_000),
    `${"[".repeat(5_000)}x${"](https://example.com)".repeat(5_000)}`,
    "\\".repeat(100_000),
    "(".repeat(100_000),
  ];
  for (const source of cases) {
    const started = performance.now();
    const html = renderMarks(source);
    const ms = performance.now() - started;
    assert.ok(ms < 1500, `took ${Math.round(ms)}ms for ${JSON.stringify(source.slice(0, 12))}…`);
    assert.ok(html.length < source.length * 40 + 1000, "output stays proportional to input");
    assertInertMarkup(`<p>${html}</p>`, "pathological");
  }
});
