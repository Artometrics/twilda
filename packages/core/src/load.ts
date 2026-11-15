import fs from "node:fs";
import path from "node:path";
import { TwildaError } from "./errors";
import { parseDocument, serializeDocument } from "./serialize";
import type { ArticleDocument, PageDocument } from "./schema";

export interface LoadedContent {
  articles: ArticleDocument[];
  pages: PageDocument[];
  root: string;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Folder names under `root` that hold a document: lowercase ids with a draft or published file. */
export function listDocumentIds(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && ID.test(entry.name))
    .filter(
      (entry) =>
        fs.existsSync(path.join(root, entry.name, "published.json")) ||
        fs.existsSync(path.join(root, entry.name, "draft.json")),
    )
    .map((entry) => entry.name)
    .sort();
}

function readDocumentFile(root: string, id: string, file: "draft" | "published") {
  const target = path.join(root, id, `${file}.json`);
  if (!fs.existsSync(target)) return null;
  if (fs.lstatSync(target).isSymbolicLink()) {
    throw new TwildaError(`${id}/${file}.json is a symbolic link. Content files must be regular files.`, "invalid-document");
  }
  let doc;
  try {
    doc = parseDocument(fs.readFileSync(target, "utf8"));
  } catch (error) {
    const message = error instanceof TwildaError ? error.message : "invalid";
    throw new TwildaError(`${id}/${file}.json: ${message}`, "invalid-document");
  }
  if (doc.id !== id) {
    throw new TwildaError(`${id}/${file}.json has id "${doc.id}". The folder name must match.`, "invalid-document");
  }
  return doc;
}

/**
 * Read a content tree of published JSON: `root/<id>/published.json`.
 * `draft.json` is never read, so a draft cannot reach the static build.
 * The folder name must equal the document id, and the file's status must be `published`.
 */
export function loadContentTree(root: string): LoadedContent {
  const articles: ArticleDocument[] = [];
  const pages: PageDocument[] = [];
  for (const id of listDocumentIds(root)) {
    const doc = readDocumentFile(root, id, "published");
    if (!doc || doc.status !== "published") continue;
    if (doc.kind === "article") articles.push(doc);
    else pages.push(doc);
  }
  return { articles, pages, root };
}

export interface MigrationReport {
  moved: Array<{ from: string; id: string; wrote: string[] }>;
  skipped: Array<{ from: string; reason: string }>;
}

/**
 * Move the retired layout (`articles/<slug>.json`, `pages/<slug>.json`, one file whose
 * `status` says draft or published) into folders. A published file becomes `published.json`
 * plus an identical `draft.json`, so the editors open it. A draft file becomes `draft.json`.
 * Nothing is overwritten unless `force` is set. Legacy files are deleted only with `remove`.
 */
export function migrateLegacyLayout(
  root: string,
  options: { remove?: boolean; force?: boolean; dryRun?: boolean } = {},
): MigrationReport {
  const report: MigrationReport = { moved: [], skipped: [] };
  for (const dirName of ["articles", "pages"] as const) {
    const dir = path.join(root, dirName);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".json")) continue;
      const from = path.join(dir, name);
      let doc;
      try {
        doc = parseDocument(fs.readFileSync(from, "utf8"));
      } catch (error) {
        report.skipped.push({ from, reason: error instanceof TwildaError ? error.message : "invalid" });
        continue;
      }
      const target = path.join(root, doc.id);
      const draftFile = path.join(target, "draft.json");
      const publishedFile = path.join(target, "published.json");
      const wants: Array<[string, string]> = [[draftFile, serializeDocument({ ...doc, status: "draft" })]];
      if (doc.status === "published") wants.push([publishedFile, serializeDocument(doc)]);
      if (!options.force && wants.some(([file]) => fs.existsSync(file))) {
        report.skipped.push({ from, reason: `content/${doc.id}/ already exists` });
        continue;
      }
      if (!options.dryRun) {
        fs.mkdirSync(target, { recursive: true });
        for (const [file, text] of wants) fs.writeFileSync(file, text, "utf8");
        if (options.remove) fs.rmSync(from);
      }
      report.moved.push({ from, id: doc.id, wrote: wants.map(([file]) => file) });
    }
    if (options.remove && !options.dryRun && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  return report;
}
