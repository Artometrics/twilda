import type { ArticleDoc, MediaAsset } from "../model";
import { exportArticle, exportJson, type ExportOptions } from "./mdx";
import { createZip, dataUrlBytes, textBytes, type ZipEntry } from "./zip";

export interface Bundle {
  filename: string;
  bytes: Uint8Array;
}

/**
 * One folder-less zip: `<slug>.mdx`, `<slug>.md`, `<slug>.json`, and `images/*`.
 * The article files reference images as `./images/...`, so unzip beside them.
 */
export function createBundle(
  doc: ArticleDoc,
  media: MediaAsset[],
  options: Pick<ExportOptions, "draft" | "componentsImport"> = {},
  when = new Date(),
): Bundle {
  const mdx = exportArticle(doc, { ...options, flavor: "mdx", media });
  const md = exportArticle(doc, { ...options, flavor: "md", media });
  const entries: ZipEntry[] = [
    { name: mdx.filename, data: textBytes(mdx.text) },
    { name: md.filename, data: textBytes(md.text) },
    { name: `${doc.slug}.json`, data: textBytes(exportJson(doc)) },
  ];
  const seen = new Set<string>();
  for (const image of [...mdx.images, ...md.images]) {
    if (seen.has(image.file)) continue;
    seen.add(image.file);
    entries.push({ name: image.file, data: dataUrlBytes(image.dataUrl) });
  }
  return { filename: `${doc.slug}-twilda.zip`, bytes: createZip(entries, when) };
}
