import fs from "node:fs";
import path from "node:path";
import { TwildaError } from "./errors";
import { parseDocument } from "./serialize";
import type { ArticleDocument, PageDocument } from "./schema";

export interface LoadedContent {
  articles: ArticleDocument[];
  pages: PageDocument[];
  root: string;
}

function readDocuments(dir: string, kind: "article" | "page") {
  if (!fs.existsSync(dir)) return [];
  const docs = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    let doc;
    try {
      doc = parseDocument(text);
    } catch (error) {
      const message = error instanceof TwildaError ? error.message : "invalid";
      throw new TwildaError(`${name}: ${message}`, "invalid-document");
    }
    if (doc.kind !== kind) throw new TwildaError(`${name} is a ${doc.kind}, expected ${kind}.`, "invalid-document");
    if (doc.status !== "published") continue;
    docs.push(doc);
  }
  return docs;
}

/**
 * Read a content tree of published JSON.
 * `root/articles/*.json` and `root/pages/*.json`.
 * Draft status is skipped. The static build must not import the editor.
 */
export function loadContentTree(root: string): LoadedContent {
  return {
    articles: readDocuments(path.join(root, "articles"), "article") as LoadedContent["articles"],
    pages: readDocuments(path.join(root, "pages"), "page") as LoadedContent["pages"],
    root,
  };
}
