import fs from "node:fs";
import path from "node:path";
import {
  MAX_RASTER_BYTES,
  MEDIA_FILE_NAME,
  TwildaError,
  auditSvg,
  containsActiveContent,
  parseDocument,
  parseSite,
  sniffImage,
} from "@twilda/core";

/**
 * Audit the files a pull request can change and the static build then serves or reads:
 * content JSON, theme settings, and everything under a `public/` folder. It is the
 * reviewer's first pass over a hostile PR, and it runs in CI on every PR.
 */

export interface Problem {
  file: string;
  message: string;
}

export interface AuditZones {
  /** Folders of content documents: `<id>/draft.json`, `<id>/published.json`, `site.json`, `data/*.csv`. */
  content: string[];
  /** `public/` folders that are copied verbatim into a site served from its own origin. */
  sitePublic: string[];
  /** `public/` folders of the desk app, which legitimately ship a service worker and a preview page. */
  deskPublic: string[];
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_CSV_BYTES = 1_000_000;

const FORBIDDEN_PUBLIC = new Set([".html", ".htm", ".xhtml", ".js", ".mjs", ".cjs", ".xml", ".php", ".swf", ".svgz", ".map", ".wasm", ".exe", ".sh", ".jar"]);
const SITE_PUBLIC_ALLOWED = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".ico", ".txt", ".csv", ".webmanifest", ".json", ".woff2"]);
const RASTER_KIND: Record<string, string> = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".gif": "gif", ".webp": "webp" };

function expandZone(root: string, pattern: string): string[] {
  const parts = pattern.split("/");
  let current = [root];
  for (const part of parts) {
    const next: string[] = [];
    for (const base of current) {
      if (part === "*") {
        if (!fs.existsSync(base)) continue;
        for (const entry of fs.readdirSync(base, { withFileTypes: true })) if (entry.isDirectory() && !entry.isSymbolicLink()) next.push(path.join(base, entry.name));
      } else next.push(path.join(base, part));
    }
    current = next;
  }
  return current.filter((dir) => fs.existsSync(dir));
}

export function defaultZones(root: string): AuditZones {
  return {
    content: [...expandZone(root, "content"), ...expandZone(root, "examples/*/content")],
    sitePublic: [...expandZone(root, "public"), ...expandZone(root, "www/public"), ...expandZone(root, "examples/*/public")],
    deskPublic: expandZone(root, "packages/editor/public"),
  };
}

function walk(dir: string, found: Array<{ full: string; symlink: boolean }> = []): Array<{ full: string; symlink: boolean }> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) found.push({ full, symlink: true });
    else if (entry.isDirectory()) walk(full, found);
    else found.push({ full, symlink: false });
  }
  return found;
}

/** Keys in a JSON text that reach an object's prototype. Reported as a problem even though the schema would drop them. */
export function unsafeJsonKeys(text: string): string[] {
  const found = new Set<string>();
  JSON.parse(text, function (key, value) {
    if (UNSAFE_KEYS.has(key)) found.add(key);
    return value as unknown;
  });
  return [...found];
}

function checkContentFile(root: string, zone: string, full: string, problems: Problem[]): void {
  const rel = path.relative(root, full).split(path.sep).join("/");
  const inZone = path.relative(zone, full).split(path.sep);
  const add = (message: string) => problems.push({ file: rel, message });
  const name = inZone[inZone.length - 1] as string;

  if (inZone.length === 1 && name === "site.json") {
    const text = fs.readFileSync(full, "utf8");
    try {
      parseSite(text);
      const keys = unsafeJsonKeys(text);
      if (keys.length) add(`contains the key ${keys.join(", ")}, which has no place in a settings file.`);
    } catch (error) {
      add(error instanceof TwildaError ? error.message : "is not valid JSON.");
    }
    return;
  }
  if (inZone.length === 2 && inZone[0] === "data" && name.endsWith(".csv")) {
    const size = fs.statSync(full).size;
    if (size > MAX_CSV_BYTES) add(`is ${size} bytes; chart data files are limited to ${MAX_CSV_BYTES}.`);
    if (fs.readFileSync(full).includes(0)) add("contains a NUL byte; chart data must be plain text.");
    return;
  }
  if (inZone.length === 2 && ID.test(inZone[0] as string) && (name === "draft.json" || name === "published.json")) {
    const text = fs.readFileSync(full, "utf8");
    try {
      const doc = parseDocument(text);
      if (doc.id !== inZone[0]) add(`has id "${doc.id}" but lives in folder "${inZone[0]}".`);
      if (name === "published.json" && doc.status !== "published") add(`is status "${doc.status}"; published.json must say "published".`);
      const keys = unsafeJsonKeys(text);
      if (keys.length) add(`contains the key ${keys.join(", ")}, which has no place in a document.`);
    } catch (error) {
      add(error instanceof TwildaError ? error.message : "is not valid JSON.");
    }
    return;
  }
  add("is not a file Twilda reads from a content folder. Content folders hold documents, site.json, and data/*.csv only.");
}

function checkRaster(rel: string, ext: string, bytes: Uint8Array, add: (message: string) => void): void {
  const kind = RASTER_KIND[ext];
  if (kind) {
    const actual = sniffImage(bytes);
    if (actual !== kind) add(`has a ${ext} name but its bytes are ${actual ?? "not a known image format"}.`);
  }
  if (containsActiveContent(bytes)) add(`${rel} carries markup or script after its image header (a polyglot file).`);
}

function checkPublicFile(root: string, zone: string, full: string, kind: "site" | "desk", problems: Problem[]): void {
  const rel = path.relative(root, full).split(path.sep).join("/");
  const add = (message: string) => problems.push({ file: rel, message });
  const inZone = path.relative(zone, full).split(path.sep);
  const name = inZone[inZone.length - 1] as string;
  const ext = path.extname(name).toLowerCase();

  if (kind === "site" && FORBIDDEN_PUBLIC.has(ext)) {
    add(`${ext} files are served from the site's own origin and can run script. Do not put them in a public folder.`);
    return;
  }
  if (kind === "site" && !SITE_PUBLIC_ALLOWED.has(ext)) {
    add(`${ext || "this file type"} is not on the list of types a public folder may hold.`);
    return;
  }
  if (inZone[0] === "media" && inZone.length === 2 && !MEDIA_FILE_NAME.test(name)) {
    add("is in media/ but the file name is not lowercase letters, digits, and hyphens with an image extension.");
  }
  if (inZone[0] === "media" && inZone.length > 2) add("is nested inside media/. Media files are flat.");

  const size = fs.statSync(full).size;
  if (ext === ".svg") {
    for (const problem of auditSvg(fs.readFileSync(full, "utf8"))) add(`SVG ${problem}.`);
    return;
  }
  if (ext in RASTER_KIND || ext === ".avif" || ext === ".ico") {
    const bytes = fs.readFileSync(full);
    if (inZone[0] === "media" && size > MAX_RASTER_BYTES) add(`is ${size} bytes; media is limited to ${MAX_RASTER_BYTES}.`);
    checkRaster(rel, ext, bytes, add);
    return;
  }
  if (kind === "site" && (ext === ".txt" || ext === ".csv" || ext === ".json" || ext === ".webmanifest")) {
    const text = fs.readFileSync(full, "utf8");
    if (/<\s*script\b|<\s*html\b/i.test(text)) add("contains markup. Text files in a public folder are served as they are.");
  }
}

/** Every problem under `root`. An empty list means the tree is clean. */
export function auditRepository(root: string, zones: AuditZones = defaultZones(root)): Problem[] {
  const problems: Problem[] = [];
  const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");
  const all: Array<{ zone: string; kind: "content" | "site" | "desk" }> = [
    ...zones.content.map((zone) => ({ zone, kind: "content" as const })),
    ...zones.sitePublic.map((zone) => ({ zone, kind: "site" as const })),
    ...zones.deskPublic.map((zone) => ({ zone, kind: "desk" as const })),
  ];
  for (const { zone, kind } of all) {
    for (const entry of walk(zone)) {
      if (entry.symlink) {
        problems.push({ file: rel(entry.full), message: "is a symbolic link. A link in a pull request can point a published file at something outside the repository." });
        continue;
      }
      if (kind === "content") checkContentFile(root, zone, entry.full, problems);
      else checkPublicFile(root, zone, entry.full, kind, problems);
    }
  }
  return problems;
}
