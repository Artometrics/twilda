import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const demoDist = path.join(root, "demo-dist");
const preview = path.join(demoDist, "preview");

fs.rmSync(demoDist, { recursive: true, force: true });
fs.mkdirSync(demoDist, { recursive: true });

const exported = spawnSync("npx", ["tsx", "scripts/export-sample.ts"], { cwd: root, stdio: "inherit" });
if (exported.status !== 0) process.exit(exported.status ?? 1);

const site = spawnSync("npx", ["astro", "build", "--root", "examples/studio"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
});
if (site.status !== 0) process.exit(site.status ?? 1);

fs.mkdirSync(path.join(preview, "data"), { recursive: true });
fs.copyFileSync(
  path.join(root, "examples/studio/content/data/franchise-revenue-mix.csv"),
  path.join(preview, "data/franchise-revenue-mix.csv"),
);

const editor = spawnSync(
  "npx",
  ["vite", "build", "--config", "apps/demo-editor/vite.config.ts"],
  { cwd: root, stdio: "inherit" },
);
if (editor.status !== 0) process.exit(editor.status ?? 1);

const article = fs.readFileSync(path.join(preview, "articles/franchise/index.html"), "utf8");
if (!article.includes("Merchandise Owns the Ledger")) {
  console.error("demo preview is missing the Franchise title");
  process.exit(1);
}
if (article.includes("Demo draft note")) {
  console.error("demo preview includes the draft-only note");
  process.exit(1);
}
if (/<script/i.test(article)) {
  console.error("demo preview article contains a script");
  process.exit(1);
}
const editorHtml = fs.readFileSync(path.join(demoDist, "index.html"), "utf8");
if (!editorHtml.includes("twilda-demo-editor")) {
  console.error("demo editor marker missing");
  process.exit(1);
}
console.log("Demo build wrote demo-dist/ (editor) and demo-dist/preview/ (published sample).");
