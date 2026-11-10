import fs from "node:fs";
import path from "node:path";
import { FRANCHISE_CSV, publishedDocuments } from "./sample";
import { serializeDocument } from "./serialize";

/** Write the published sample the static site is allowed to read. Drafts stay out. */
export function exportPublishedSample(root: string): void {
  const articles = path.join(root, "articles");
  const pages = path.join(root, "pages");
  const data = path.join(root, "data");
  fs.mkdirSync(articles, { recursive: true });
  fs.mkdirSync(pages, { recursive: true });
  fs.mkdirSync(data, { recursive: true });
  for (const doc of publishedDocuments()) {
    const dir = doc.kind === "article" ? articles : pages;
    fs.writeFileSync(path.join(dir, `${doc.slug}.json`), serializeDocument(doc));
  }
  fs.writeFileSync(path.join(data, "franchise-revenue-mix.csv"), FRANCHISE_CSV);
}
