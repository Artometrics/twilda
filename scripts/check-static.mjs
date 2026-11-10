import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
if (!existsSync(dist)) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const html = htmlFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const bundled = files
  .filter((file) => /\.(html|js|css|mjs|json)$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const article = htmlFiles.find((file) => file.includes(`${path.sep}lumen-rail${path.sep}`) || file.endsWith(`${path.sep}lumen-rail.html`));
const failures = [];

if (!existsSync(path.join(dist, "index.html"))) failures.push("dist/index.html is missing");
if (!article) failures.push("published article HTML is missing");
if (!html.includes("The night timetable is a public document.")) {
  failures.push("published article sentence is missing from dist");
}
if (!html.includes("Field Desk")) failures.push("homepage title is missing from dist");

const forbidden = [
  "DRAFT-ONLY SENTINEL",
  "twilda-surface",
  "/api/documents",
  "Save draft",
  "twilda-510519",
  "artometrics-510519",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_",
];
for (const phrase of forbidden) {
  if (bundled.includes(phrase)) failures.push(`static build contains ${JSON.stringify(phrase)}`);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const [name, command] of Object.entries(pkg.scripts)) {
  if (/deploy|firebase|netlify/i.test(`${name} ${command}`)) {
    failures.push(`package script looks like a deploy: ${name}`);
  }
}

for (const file of ["netlify.toml"]) {
  if (existsSync(file)) failures.push(`${file} should not be in the tree`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Static check passed (${htmlFiles.length} html files). Editor markers and the draft sentinel are absent.`);
