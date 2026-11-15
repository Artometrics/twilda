import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { documentSchema } from "@twilda/core";
import { renderDocument } from "@twilda/core";

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function astroBuild(config: string | null, outDir: string) {
  const args = ["astro", "build", ...(config ? ["--config", config] : []), "--outDir", outDir];
  const run = spawnSync("npx", args, { encoding: "utf8", env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" } });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  return walk(outDir).filter((file) => /\.(html|js|css|mjs|json)$/.test(file)).map((file) => readFileSync(file, "utf8")).join("\n");
}

const tmp = mkdtempSync(path.join(os.tmpdir(), "twilda-builds-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

describe("two build targets", () => {
  it("production output carries no editing code, hooks, or draft storage key", () => {
    const text = astroBuild(null, path.join(tmp, "prod"));
    for (const marker of ["data-twilda", "twilda-root", "twilda:click-edit", "twilda-bar", "contenteditable", "device/code", "api.github.com"]) {
      assert.equal(text.includes(marker), false, marker);
    }
    assert.ok(text.includes("Field Desk"));
  });

  it("edit output has the hooks, the editor script, and the same page", () => {
    const text = astroBuild("astro.edit.config.ts", path.join(tmp, "edit"));
    assert.ok(text.includes('data-twilda-ref="title"'));
    assert.ok(text.includes("twilda:click-edit:draft:"));
    const draft = documentSchema.parse(JSON.parse(readFileSync("content/home/draft.json", "utf8")));
    assert.ok(text.includes(renderDocument(draft, { annotate: true })), "server HTML is the annotated template output");
    assert.ok(text.includes("Field Desk"));
  });

  it("keeps the production config static with no adapter and no edit target", () => {
    const config = readFileSync("astro.config.ts", "utf8");
    assert.match(config, /output:\s*"static"/);
    assert.equal(/adapter:|click-edit|srcDir/.test(config), false);
    const edit = readFileSync("astro.edit.config.ts", "utf8");
    assert.match(edit, /output:\s*"static"/);
    assert.equal(/adapter:/.test(edit), false);
  });
});
