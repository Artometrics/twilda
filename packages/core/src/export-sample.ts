import fs from "node:fs";
import path from "node:path";
import { FRANCHISE_CSV, publishedDocuments } from "./sample";
import { serializeDocument } from "./serialize";

/**
 * Write the published sample in the one content layout: `<root>/<id>/draft.json`
 * and `published.json`. The static site reads published files only.
 */
export function exportPublishedSample(root: string): void {
  const data = path.join(root, "data");
  fs.mkdirSync(data, { recursive: true });
  for (const doc of publishedDocuments()) {
    const dir = path.join(root, doc.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "published.json"), serializeDocument(doc));
    fs.writeFileSync(path.join(dir, "draft.json"), serializeDocument({ ...doc, status: "draft" }));
  }
  fs.writeFileSync(path.join(data, "franchise-revenue-mix.csv"), FRANCHISE_CSV);
}
