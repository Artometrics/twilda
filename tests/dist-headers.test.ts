import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { EDIT_CSP } from "../astro.edit.config";
import { headersFor, hostingTarget, parsePolicy, type Policy, type Target } from "./support/csp";
import { auditCss, auditHtml, auditOutput, walk } from "./support/dist";

/**
 * Builds each deployable folder for real and checks the output against the policy its host sends.
 * The rules say the page must work under `style-src 'self'` and no script at all, so any inline
 * style, inline script, data: URL, or off-origin asset in the output is a bug found here, not in a browser.
 */

const root = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-dist-"));
const built = new Map<string, string>();

function build(name: string, cwd: string, args: string[]): string {
  const outDir = path.join(scratch, name);
  const astro = path.join(cwd, "node_modules", ".bin", "astro");
  const result = spawnSync(astro, ["build", ...args, "--outDir", outDir], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", CI: "1" },
  });
  assert.equal(result.status, 0, `astro build failed for ${name}\n${result.stdout}\n${result.stderr}`);
  built.set(name, outDir);
  return outDir;
}

function policyOf(target: Target): Policy {
  const csp = headersFor(hostingTarget(target)).get("Content-Security-Policy");
  assert.ok(csp);
  return parsePolicy(csp);
}

const hasWww = fs.existsSync(path.join(root, "www", "node_modules", ".bin", "astro"));

before(() => {
  build("site", root, []);
  build("edit", root, ["--config", "astro.edit.config.ts"]);
  if (hasWww) build("www", path.join(root, "www"), []);
});

after(() => fs.rmSync(scratch, { recursive: true, force: true }));

describe("the published site's dist/", () => {
  it("passes the production policy: no script, no inline style, same-origin assets only", () => {
    assert.deepEqual(auditOutput(built.get("site") as string, { policy: policyOf("site"), runsScript: false }), []);
  });

  it("marks every page noindex, matching the X-Robots-Tag header", () => {
    const pages = walk(built.get("site") as string).filter((file) => file.endsWith(".html"));
    assert.ok(pages.length >= 3);
    for (const page of pages) {
      const html = fs.readFileSync(page, "utf8");
      assert.match(html, /<meta name="robots" content="[^"]*noindex[^"]*"/, path.relative(built.get("site") as string, page));
    }
  });

  it("carries no editor, draft, or credential markers", () => {
    const dir = built.get("site") as string;
    const forbidden = [/data-twilda/, /twilda-surface/, /contenteditable/i, /twilda:click-edit/, /api\.github\.com/, /localStorage/, /draft\.json/, /ghp_|github_pat_|gho_/];
    for (const file of walk(dir)) {
      if (!/\.(?:html|css|js|mjs|json|txt|svg|xml)$/.test(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${path.relative(dir, file)} matches ${pattern}`);
    }
  });

  it("emits only empty content maps at the root, so no article source is reachable by URL", () => {
    const dir = built.get("site") as string;
    for (const name of ["content-assets.mjs", "content-modules.mjs"]) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, "utf8").trim(), "export default new Map();");
    }
    assert.ok(!fs.existsSync(path.join(dir, "draft.json")));
    assert.ok(!fs.existsSync(path.join(dir, "content")));
  });

  it("serves hashed assets from /_astro/ so the immutable cache rule matches them", () => {
    const dir = built.get("site") as string;
    const assets = walk(path.join(dir, "_astro"));
    assert.ok(assets.length > 0);
    for (const asset of assets) assert.match(path.basename(asset), /\.[A-Za-z0-9_-]{6,}\./, `${path.basename(asset)} is not content-hashed`);
  });

  it("a page with an inline style would fail this audit", () => {
    const policy = policyOf("site");
    const options = { policy, runsScript: false };
    assert.notDeepEqual(auditHtml("x.html", '<html lang="en"><meta charset="utf-8"><p style="color:red">x</p>', options), []);
    assert.notDeepEqual(auditHtml("x.html", '<html lang="en"><meta charset="utf-8"><script>alert(1)</script>', options), []);
    assert.notDeepEqual(auditHtml("x.html", '<html lang="en"><meta charset="utf-8"><img src="https://evil.test/a.png">', options), []);
    assert.notDeepEqual(auditHtml("x.html", '<html lang="en"><meta charset="utf-8"><iframe src="https://evil.test/"></iframe>', options), []);
    assert.notDeepEqual(auditCss("x.css", "a{background:url(data:image/png;base64,AAAA)}", options), []);
    assert.deepEqual(
      auditHtml("x.html", '<html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="/_astro/a.css"><iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>', options),
      [],
    );
  });
});

describe("the marketing site's dist/", { skip: hasWww ? false : "www dependencies are not installed (run npm ci --prefix www)" }, () => {
  it("passes the www policy: no script, no frame, no inline style", () => {
    assert.deepEqual(auditOutput(built.get("www") as string, { policy: policyOf("www"), runsScript: false }), []);
  });
});

describe("the edit build (dist-edit/, never deployed)", () => {
  it("passes the edit policy: external module scripts only, no inline script or style", () => {
    const outcome = auditOutput(built.get("edit") as string, { policy: parsePolicy(EDIT_CSP), runsScript: true });
    assert.deepEqual(outcome, []);
  });

  it("embeds its JSON data blocks so that no content can close the script element", () => {
    const html = fs.readFileSync(path.join(built.get("edit") as string, "index.html"), "utf8");
    const blocks = [...html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)];
    assert.ok(blocks.length >= 2);
    for (const block of blocks) {
      assert.doesNotMatch(block[1], /</, "a raw < inside a data block can end it early");
      JSON.parse(block[1]);
    }
  });
});
