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
      config: { output: "server", root: new URL("file:///tmp/twilda-site/") },
      logger: { info() {}, warn() {}, error() {} },
      updateConfig() {},
    } as never),
  );
});

test("the integration points a static site at its content directory", () => {
  const integration = twilda({ contentDir: "content" });
  const hook = integration.hooks["astro:config:setup"];
  assert.equal(typeof hook, "function");
  if (!hook) return;
  let defined = "";
  hook({
    config: { output: "static", root: new URL("file:///tmp/twilda-site/") },
    command: "build",
    logger: { info() {}, warn() {}, error() {} },
    updateConfig(next: { vite?: { define?: Record<string, string>; plugins?: unknown[] } }) {
      defined = next.vite?.define?.__TWILDA_CONTENT__ ?? "";
      assert.equal(Array.isArray(next.vite?.plugins), true);
    },
  } as never);
  assert.equal(defined, JSON.stringify("/tmp/twilda-site/content"));
});
