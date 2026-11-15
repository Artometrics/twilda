import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { PRESETS, PRESET_IDS, parseSite, type PresetId } from "@twilda/core";
import { auditRepository } from "../scripts/lib/content-audit";
import { create } from "../scripts/create-twilda";
import { checkoutPackages, exampleFiles, recommendedHeaders, registryPackages, repoPackages, starterDir, starterFiles } from "../scripts/lib/starter";
import { headersFor, hostingTarget, parsePolicy } from "./support/csp";
import { auditOutput, walk } from "./support/dist";

const root = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-starters-"));
const built = new Map<string, string>();
const policy = parsePolicy(headersFor(hostingTarget("site")).get("Content-Security-Policy") as string);

after(() => fs.rmSync(scratch, { recursive: true, force: true }));

function astroBuild(projectRoot: string, outDir: string): void {
  const result = spawnSync(path.join(root, "node_modules", ".bin", "astro"), ["build", "--root", projectRoot, "--outDir", outDir], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", CI: "1" },
  });
  assert.equal(result.status, 0, `astro build failed for ${projectRoot}\n${result.stdout}\n${result.stderr}`);
}

function filesOf(dir: string): Map<string, string> {
  const found = new Map<string, string>();
  const skip = new Set(["node_modules", "dist", ".astro"]);
  const visit = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else found.set(path.relative(dir, full).split(path.sep).join("/"), fs.readFileSync(full, "utf8"));
    }
  };
  visit(dir);
  return found;
}

const HOME_TEXT: Record<PresetId, string> = {
  corporate: "Plan the week in ten minutes",
  magazine: "The city that stopped printing parking tickets",
  leadgen: "Get your first ten customers in fourteen days",
};

before(() => {
  for (const id of PRESET_IDS) {
    const outDir = path.join(scratch, `dist-${id}`);
    astroBuild(starterDir(id), outDir);
    built.set(id, outDir);
  }
});

describe("checked-in starters match the generator", () => {
  for (const id of PRESET_IDS) {
    it(`examples/starter-${id} is exactly what \`npm run starters:sync\` writes`, () => {
      const expected = exampleFiles(id);
      const actual = filesOf(starterDir(id));
      assert.deepEqual([...actual.keys()].sort(), [...expected.keys()].sort());
      for (const [file, text] of expected) assert.equal(actual.get(file), text, `${id}/${file} has drifted. Run npm run starters:sync.`);
    });
  }
});

describe("what a starter is", () => {
  for (const id of PRESET_IDS) {
    const files = exampleFiles(id);
    const pkg = JSON.parse(files.get("package.json") as string) as { scripts: Record<string, string>; dependencies: Record<string, string>; private: boolean };

    it(`${id}: static output, no adapter, no deploy script, no secrets file`, () => {
      assert.match(files.get("astro.config.ts") as string, /output: "static"/);
      assert.match(files.get("astro.config.ts") as string, /inlineStylesheets: "never"/);
      assert.doesNotMatch(files.get("astro.config.ts") as string, /adapter\s*:|@astrojs\/(?:node|netlify|vercel|cloudflare)/);
      assert.deepEqual(Object.keys(pkg.scripts).sort(), ["build", "dev", "preview"]);
      assert.equal(Object.keys(pkg.dependencies).some((name) => /adapter|netlify|vercel|supabase|expo/i.test(name)), false);
      assert.equal(pkg.private, true);
      for (const file of files.keys()) assert.doesNotMatch(file, /(?:^|\/)\.env|\.firebaserc|firebase\.json|netlify/i);
      assert.doesNotMatch(files.get("src/layouts/Base.astro") as string, /<script/);
    });

    it(`${id}: site.json names the mode and the documents validate`, () => {
      const site = parseSite(files.get("content/site.json") as string);
      assert.equal(site.mode, id);
      assert.deepEqual(site.theme, PRESETS[id].theme);
      assert.ok(files.has("content/home/published.json") && files.has("content/home/draft.json"));
    });

    it(`${id}: the README has a quickstart, the layout, and a launch checklist`, () => {
      const readme = files.get("README.md") as string;
      for (const heading of ["## Quickstart", "## Edit it", "## Layout", "## Before you launch"]) assert.ok(readme.includes(heading), heading);
      assert.ok(readme.includes(`npm run starter:dev -- ${id}`));
      assert.ok(readme.includes("Content-Security-Policy: default-src 'none'"));
      assert.equal(readme.includes("X-Robots-Tag"), false);
    });

    it(`${id}: package links resolve inside this repository`, () => {
      for (const [name, spec] of [["@twilda/core", pkg.dependencies["@twilda/core"]], ["@twilda/astro", pkg.dependencies["@twilda/astro"]]] as const) {
        assert.match(spec as string, /^file:\.\.\/\.\.\/packages\/(core|astro)$/);
        const target = path.resolve(starterDir(id), (spec as string).slice("file:".length));
        assert.equal((JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8")) as { name: string }).name, name);
      }
    });

    it(`${id}: the repository's own content audit passes`, () => {
      const dir = starterDir(id);
      assert.deepEqual(auditRepository(dir, { content: [path.join(dir, "content")], sitePublic: [path.join(dir, "public")], deskPublic: [] }), []);
    });
  }

  it("the README's headers are the ones the repository's own site is served with", () => {
    const headers = recommendedHeaders();
    assert.ok(headers.some((header) => header.key === "Content-Security-Policy"));
    assert.ok(headers.every((header) => header.key !== "X-Robots-Tag" && header.key !== "Cache-Control"));
  });
});

describe("a starter builds into a site the production policy accepts", () => {
  for (const id of PRESET_IDS) {
    it(`${id}: home and article pass the policy: no script, no inline style, same-origin assets only`, () => {
      const dist = built.get(id) as string;
      assert.deepEqual(auditOutput(dist, { policy, runsScript: false }), []);
      const pages = walk(dist).filter((file) => file.endsWith(".html"));
      assert.equal(pages.length, 3, "home, one article, and 404");
    });

    it(`${id}: the home page prints its headline once, the mode class, and its theme link`, () => {
      const html = fs.readFileSync(path.join(built.get(id) as string, "index.html"), "utf8");
      assert.ok(html.includes(HOME_TEXT[id]));
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
      if (id === "magazine") assert.doesNotMatch(html, /mode-/);
      else assert.match(html, new RegExp(`class="magazine mode-${id}"`));
      assert.equal(/href="\/theme\.css"/.test(html), id !== "magazine");
      assert.equal(/<script/i.test(html), false);
      assert.equal(/twilda-surface|data-twilda/.test(html), false, "no editor markup in the public build");
    });

    it(`${id}: only published files reach the build, and every plate it prints exists`, () => {
      const dist = built.get(id) as string;
      const html = walk(dist).filter((file) => file.endsWith(".html")).map((file) => fs.readFileSync(file, "utf8")).join("\n");
      for (const match of html.matchAll(/(?:src|href)="(\/media\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(dist, match[1] as string)), match[1]);
      assert.ok(fs.existsSync(path.join(dist, "favicon.svg")));
    });
  }
});

describe("create-twilda scaffolds a project from this checkout", () => {
  for (const id of PRESET_IDS) {
    it(`${id}: writes the starter's files with absolute links to this checkout, and the result builds`, () => {
      const dir = path.join(scratch, `project-${id}`);
      const result = create({ dir, mode: id });
      assert.equal(result.files.length, starterFiles(id, "project", { name: `project-${id}`, packages: checkoutPackages() }).size);
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as { name: string; dependencies: Record<string, string> };
      assert.equal(pkg.name, `project-${id}`);
      assert.equal(pkg.dependencies["@twilda/core"], `file:${path.join(root, "packages", "core")}`);
      assert.deepEqual(auditRepository(dir, { content: [path.join(dir, "content")], sitePublic: [path.join(dir, "public")], deskPublic: [] }), []);
      assert.match(fs.readFileSync(path.join(dir, "README.md"), "utf8"), /^# project-/);
      assert.equal(fs.readFileSync(path.join(dir, "README.md"), "utf8").includes("starter:dev"), false, "a project README does not mention this repository's scripts");

      // `npm install` is what links node_modules; point it at the checkout's, which is what the file: links would resolve to.
      fs.symlinkSync(path.join(root, "node_modules"), path.join(dir, "node_modules"), "dir");
      const out = path.join(scratch, `project-dist-${id}`);
      astroBuild(dir, out);
      assert.ok(fs.readFileSync(path.join(out, "index.html"), "utf8").includes(HOME_TEXT[id]));
      assert.deepEqual(auditOutput(out, { policy, runsScript: false }), []);
    });
  }

  it("can write registry version ranges for after the packages are published", () => {
    const files = starterFiles("corporate", "project", { name: "x", packages: registryPackages() });
    const pkg = JSON.parse(files.get("package.json") as string) as { dependencies: Record<string, string> };
    assert.equal(pkg.dependencies["@twilda/core"], "^0.1.0");
    assert.equal(repoPackages().core, "file:../../packages/core");
  });

  it("refuses a folder that already has files, an unknown mode, and a bad name, and writes nothing", () => {
    const busy = path.join(scratch, "busy");
    fs.mkdirSync(busy);
    fs.writeFileSync(path.join(busy, "keep.txt"), "mine");
    assert.throws(() => create({ dir: busy, mode: "corporate" }), /not an empty folder/);
    assert.deepEqual(fs.readdirSync(busy), ["keep.txt"]);
    const file = path.join(scratch, "a-file");
    fs.writeFileSync(file, "x");
    assert.throws(() => create({ dir: file, mode: "corporate" }), /not an empty folder/);
    assert.throws(() => create({ dir: path.join(scratch, "nope"), mode: "blog" as PresetId }), /Unknown mode/);
    assert.equal(fs.existsSync(path.join(scratch, "nope")), false);
    assert.throws(() => create({ dir: path.join(scratch, "ok"), mode: "leadgen", name: "Bad Name!" }), /not a usable package name/);
    assert.throws(() => create({ dir: path.join(scratch, "ok2"), mode: "leadgen", name: "../escape" }), /not a usable package name/);
    assert.equal(fs.existsSync(path.join(scratch, "ok")), false);
  });

  it("an empty existing folder is fine, and the name comes from the folder", () => {
    const dir = path.join(scratch, "My Site");
    fs.mkdirSync(dir);
    create({ dir, mode: "magazine" });
    assert.equal((JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as { name: string }).name, "my-site");
  });

  it("the command line prints usage and exits 1 on bad input, and exits 0 on good input", () => {
    const run = (...args: string[]) => spawnSync(path.join(root, "node_modules", ".bin", "tsx"), ["scripts/create-twilda.ts", ...args], { cwd: root, encoding: "utf8" });
    for (const args of [[], ["--mode", "corporate"], [path.join(scratch, "cli-a")], [path.join(scratch, "cli-b"), "--mode", "blog"], [path.join(scratch, "cli-c"), "--mode", "corporate", "--wat", "1"], [path.join(scratch, "cli-d"), "--mode"]]) {
      const result = run(...args);
      assert.equal(result.status, 1, JSON.stringify(args));
      assert.match(result.stderr, /Usage: npm run create:twilda/);
    }
    for (const name of ["cli-a", "cli-b", "cli-c", "cli-d"]) assert.equal(fs.existsSync(path.join(scratch, name)), false, name);
    const ok = run(path.join(scratch, "cli-ok"), "--mode", "leadgen");
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /Created a Lead generation site/);
    assert.ok(fs.existsSync(path.join(scratch, "cli-ok", "content", "home", "published.json")));
  });
});
