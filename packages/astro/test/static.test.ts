import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { exportPublishedSample } from "../../core/src/export-sample";
import { loadContentTree } from "../../core/src/load";
import { twilda } from "../src/index";

test("static loader keeps the franchise draft note out of published files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-content-"));
  exportPublishedSample(root);
  const loaded = loadContentTree(root);
  const franchise = loaded.articles.find((article) => article.slug === "franchise");
  assert.ok(franchise);
  assert.equal(franchise.blocks.some((block) => block.id === "demo-draft-note"), false);
  assert.equal(loaded.pages.find((page) => page.slug === "home")?.sections.some((section) => section.type === "carousel" && section.slides.length === 5), true);
  const raw = fs.readFileSync(path.join(root, "articles/franchise.json"), "utf8");
  assert.equal(raw.includes("Demo draft note"), false);
});

test("the integration refuses a server output", () => {
  const integration = twilda();
  const hook = integration.hooks["astro:config:setup"];
  assert.equal(typeof hook, "function");
  if (!hook) return;
  assert.throws(() =>
    hook({
      config: { output: "server" },
      logger: { info() {}, warn() {}, error() {} },
    } as never),
  );
});
