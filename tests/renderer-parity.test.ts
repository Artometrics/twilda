import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import {
  DEFAULT_CHROME,
  MAGAZINE_CSS,
  escapeHtml,
  renderDocument,
  renderPreviewPage,
  type TwildaDocument,
} from "@twilda/core";
import { getAtPath } from "@twilda/core/edit";
import { corpus, HOSTILE_ARTICLE } from "./fixtures/render-corpus";

const root = process.cwd();
const golden = (name: string) => readFileSync(path.join("tests/fixtures/renderer-golden", name), "utf8");
const strip = (html: string) => html.replace(/ data-twilda-[a-z-]+="[^"]*"/g, "");

async function bundle(entry: string, name: string) {
  return build({
    stdin: {
      contents: `export * from ${JSON.stringify(path.join(root, entry))};`,
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    globalName: name,
    logLevel: "silent",
  });
}

function runInBareContext(code: string, name: string): Record<string, unknown> {
  // No process, require, Buffer, or fs: what a browser tab has.
  const context = vm.createContext({ TextEncoder, TextDecoder });
  vm.runInContext(code, context);
  return vm.runInContext(name, context) as Record<string, unknown>;
}

describe("single renderer: parity with the pre-Phase-1 site template", () => {
  for (const { name, doc } of corpus()) {
    it(`${name}: production HTML is byte-identical to the golden file`, () => {
      assert.equal(renderDocument(doc), golden(`${name}.html`));
    });
    if (doc.kind === "page") {
      it(`${name}: annotated HTML is byte-identical to the Phase 0 golden file`, () => {
        assert.equal(renderDocument(doc, { annotate: true }), golden(`${name}.annotated.html`));
      });
    }
  }

  it("the golden files were produced by the old renderer, not by this one (hostile text is escaped with &#39;)", () => {
    assert.match(golden("hostile-article.html"), /&#39;/);
    assert.equal(golden("hostile-article.html").includes("<script>alert"), false);
  });
});

describe("annotation", () => {
  for (const { name, doc } of corpus()) {
    it(`${name}: annotated output minus its data-twilda attributes equals production output`, () => {
      assert.equal(strip(renderDocument(doc, { annotate: true })), renderDocument(doc));
    });

    it(`${name}: every annotated ref points at a string in the document`, () => {
      const html = renderDocument(doc, { annotate: true });
      const refs = [...html.matchAll(/data-twilda-(?:alt-)?ref="([^"]+)"/g)].map((match) => match[1]!);
      for (const ref of refs) assert.equal(typeof getAtPath(doc, ref), "string", `${name}: ${ref}`);
    });
  }

  it("article fields are annotated: title, paragraph (multiline), findings, callout, image, sources", () => {
    const html = renderDocument(HOSTILE_ARTICLE, { annotate: true });
    for (const ref of [
      "title",
      "kicker",
      "dek",
      "byline",
      "blocks.0.text",
      "blocks.2.text",
      "blocks.3.title",
      "blocks.3.items.0",
      "blocks.5.title",
      "blocks.6.text",
      "blocks.7.items.1.label",
      "blocks.8.src",
      "blocks.8.alt",
      "blocks.8.caption",
    ]) {
      assert.ok(html.includes(`data-twilda-ref="${ref}"`) || html.includes(`data-twilda-alt-ref="${ref}"`), ref);
    }
    assert.match(html, /data-twilda-ref="blocks\.2\.text" data-twilda-type="multiline"/);
  });

  it("production output carries no data-twilda hooks", () => {
    for (const { doc } of corpus()) assert.equal(renderDocument(doc).includes("data-twilda"), false);
  });
});

describe("@twilda/core in a browser", () => {
  it("the package root bundles for a browser and renders the same string with no Node globals", async () => {
    const result = await bundle("packages/core/src/index.ts", "Core");
    const code = result.outputFiles[0]!.text;
    assert.equal(/node:|require\("fs"\)/.test(code), false);
    const mod = runInBareContext(code, "Core") as { renderDocument: typeof renderDocument };
    for (const { name, doc } of corpus()) {
      assert.equal(mod.renderDocument(doc), renderDocument(doc), name);
      assert.equal(mod.renderDocument(doc, { annotate: true }), renderDocument(doc, { annotate: true }), `${name} annotated`);
    }
  });

  it("loadContentTree is only in the Node entry", async () => {
    const root_ = await import("@twilda/core");
    assert.equal("loadContentTree" in root_, false);
    const node = await import("@twilda/core/node");
    assert.equal(typeof node.loadContentTree, "function");
    await assert.rejects(bundle("packages/core/src/node.ts", "CoreNode"), (error: Error & { errors?: { text: string }[] }) => {
      assert.match(`${error.message} ${(error.errors ?? []).map((entry) => entry.text).join(" ")}`, /node:fs|"fs"/);
      return true;
    });
  });

  it("magazine-css.ts is the same text as magazine.css", () => {
    assert.equal(MAGAZINE_CSS, readFileSync("packages/core/src/magazine.css", "utf8"));
    execFileSync("node", ["scripts/sync-magazine-css.mjs", "--check"], { stdio: "pipe" });
  });
});

describe("the one renderer is the template", () => {
  const article = HOSTILE_ARTICLE as TwildaDocument;

  it("has the masthead, plate classes, safe media filtering, and the one escapeHtml", () => {
    const html = renderDocument(article);
    assert.match(html, /^<div class="magazine"><header class="mast">/);
    assert.match(html, /class="plate"/);
    assert.match(html, /plate-missing/);
    assert.equal(html.includes("data:image/png"), false, "uploaded data URLs are not template media");
    assert.equal(html.includes("https://example.com/x.png"), false);
    assert.equal(escapeHtml(`'`), "&#39;");
  });

  it("takes its masthead from options", () => {
    const html = renderDocument(article, {
      chrome: { ...DEFAULT_CHROME, name: "Other <Desk>", nav: [{ label: "Home", href: "/" }] },
    });
    assert.match(html, /Other &lt;Desk&gt;/);
    assert.equal(html.includes("Franchise"), false);
  });

  it("preview page inlines the template stylesheet, has no script, and shows chart data when given", () => {
    const html = renderPreviewPage(article, { dataFiles: { "content/data/chart.csv": "a,b\n1,2\n" } });
    assert.ok(html.startsWith("<!doctype html>"));
    assert.ok(html.includes(".magazine {"));
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /<table class="chart-table"><thead><tr><th>a<\/th><th>b<\/th>/);
  });
});
