#!/usr/bin/env node
/**
 * Static link check for the built marketing site.
 * Verifies internal hrefs resolve in dist/ and external hrefs are well-formed.
 */
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const HREF_RE = /href=["']([^"'#]+)["']/gi;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function isExternal(href) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveInternal(href) {
  const clean = href.split("?")[0];
  if (!clean.startsWith("/")) return { ok: false, reason: "non-root-relative" };

  const candidates = [
    path.join(dist, clean),
    path.join(dist, clean, "index.html"),
    path.join(dist, `${clean}.html`),
    path.join(dist, clean.replace(/\/$/, "") + ".html"),
  ];

  // Trailing-slash never builds; cleanUrls-style paths.
  if (clean === "/") candidates.unshift(path.join(dist, "index.html"));

  for (const candidate of candidates) {
    if (await exists(candidate)) return { ok: true };
  }
  return { ok: false, reason: "missing" };
}

const htmlFiles = await walk(dist);
if (htmlFiles.length === 0) {
  console.error("No HTML files in dist/. Run npm run build first.");
  process.exit(1);
}

const failures = [];
const seenExternal = new Set();

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  let match;
  while ((match = HREF_RE.exec(html))) {
    const href = match[1];
    if (href.startsWith("data:") || href.startsWith("javascript:")) continue;
    if (isExternal(href)) {
      try {
        // eslint-disable-next-line no-new
        new URL(href);
        seenExternal.add(href);
      } catch {
        failures.push(`${file}: bad external URL ${href}`);
      }
      continue;
    }
    const result = await resolveInternal(href);
    if (!result.ok) {
      failures.push(`${file}: broken internal link ${href} (${result.reason})`);
    }
  }
}

if (failures.length) {
  console.error("Link check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  `Link check ok: ${htmlFiles.length} HTML file(s), ${seenExternal.size} external href(s).`,
);
for (const href of [...seenExternal].sort()) {
  console.log(`  external: ${href}`);
}
