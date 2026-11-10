import assert from "node:assert/strict";
import test from "node:test";
import { TwildaError } from "../src/errors";
import { documentSchema } from "../src/schema";
import { parseDocument, serializeDocument } from "../src/serialize";
import { sampleArticles, samplePages } from "../src/sample";

test("published franchise fixture matches the schema and keeps chart alt text", () => {
  const text = serializeDocument(sampleArticles.franchise);
  const again = parseDocument(text);
  assert.equal(serializeDocument(again), text);
  assert.equal(again.kind, "article");
  if (again.kind !== "article") return;
  const chart = again.blocks.find((block) => block.type === "chart");
  assert.ok(chart && chart.type === "chart");
  assert.match(chart.alt, /merchandise/i);
  assert.equal(chart.dataPath, "content/data/franchise-revenue-mix.csv");
});

test("a page cannot contain an article block", () => {
  const home = structuredClone(samplePages.home);
  const invalid = { ...home, sections: [{ id: "bad", type: "paragraph", text: "no" }] };
  assert.equal(documentSchema.safeParse(invalid).success, false);
});

test("javascript links are rejected", () => {
  const article = structuredClone(sampleArticles.pixar);
  article.blocks = [
    {
      id: "bad",
      type: "download",
      href: "javascript:alert(1)",
      label: "no",
      description: "",
    },
  ];
  assert.throws(() => serializeDocument(article), (error: unknown) => error instanceof TwildaError && error.code === "invalid-document");
});
