import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";
import { renderDocument as coreRender } from "@twilda/core";
import { documentSchema } from "@twilda/core";

const root = process.cwd();
const home = documentSchema.parse(JSON.parse(readFileSync("content/home/published.json", "utf8")));

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
    metafile: true,
  });
}

function runInBareContext(code: string, name: string): Record<string, unknown> {
  // A context with no process, require, Buffer, or fs: what a browser tab has.
  const context = vm.createContext({ TextEncoder, TextDecoder });
  vm.runInContext(code, context);
  return vm.runInContext(name, context) as Record<string, unknown>;
}

/**
 * Phase 0 finding. `@twilda/core`'s renderer is browser-safe on its own, but the package
 * root is not, and it is not the template the site uses. See docs/phase0-decision.md.
 */
describe("@twilda/core renderDocument in the browser", () => {
  it("bundles from its own file for a browser and runs with no Node globals", async () => {
    const result = await bundle("packages/core/src/render.ts", "CoreRender");
    const code = result.outputFiles[0]!.text;
    assert.equal(/node:|require\("fs"\)/.test(code), false);
    const mod = runInBareContext(code, "CoreRender") as { renderDocument: typeof coreRender };
    assert.equal(mod.renderDocument(home), coreRender(home), "same string in a bare context as in Node");
    assert.ok(mod.renderDocument(home).includes("Lumen Rail keeps the night timetable public"));
  });

  it("does not bundle from the package root: load.ts pulls in node:fs", async () => {
    await assert.rejects(bundle("packages/core/src/index.ts", "CoreRoot"), (error: Error & { errors?: { text: string }[] }) => {
      const text = `${error.message} ${(error.errors ?? []).map((entry) => entry.text).join(" ")}`;
      assert.match(text, /node:fs|"fs"/);
      return true;
    });
  });

  it("is not the site template: no masthead, plate classes, or safe media filtering", () => {
    const core = coreRender(home);
    assert.equal(core.includes('class="magazine"'), false);
    assert.equal(core.includes('class="plate"'), false);
    assert.equal(core.includes("mast"), false);
    assert.ok(core.startsWith("<main>"));
  });

  it("the site template, which the edit build uses, also bundles for a browser and matches Node", async () => {
    const result = await bundle("src/render/document.ts", "SiteRender");
    const code = result.outputFiles[0]!.text;
    assert.equal(/node:/.test(code), false);
    const mod = runInBareContext(code, "SiteRender") as { renderDocument: (doc: unknown, options?: { annotate?: boolean }) => string };
    assert.ok(mod.renderDocument(home).includes('class="magazine"'));
    assert.ok(mod.renderDocument(home, { annotate: true }).includes('data-twilda-ref="title"'));
  });
});
