import { SLUG_PATTERN } from "../doc";
import { createBlock, type ArticleDoc, type Block } from "../model";
import { safeHref } from "./mdx";

export interface Issue {
  level: "error" | "warn";
  message: string;
  blockId?: string;
}

const VERIFY = /\[verify\b[^\]]*\]/gi;

function textOf(block: Block): string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return [block.text];
    case "key-findings":
      return [block.title, ...block.findings.flatMap((item) => [item.label, item.detail])];
    case "chart":
      return [block.title, block.caption, block.alt, block.src];
    case "callout":
      return [block.title, block.text];
    case "sources":
      return block.items.flatMap((item) => [item.label, item.href]);
    case "image":
      return [block.alt, block.caption, block.src];
    case "video":
    case "audio":
      return [block.caption, block.src];
    case "download":
      return [block.label, block.href, block.description ?? ""];
    default:
      return [];
  }
}

/** True when a block still carries the text `createBlock` filled in for it. */
function hasStarterText(block: Block): boolean {
  const starter = createBlock(block.type, block.id);
  switch (block.type) {
    case "heading":
    case "paragraph":
      return block.text === (starter as typeof block).text;
    case "callout":
      return block.text === (starter as typeof block).text;
    case "chart":
      return block.caption === (starter as typeof block).caption;
    default:
      return false;
  }
}

/** Open `[VERIFY ...]` notes in a document, by block. */
export function verifyNotes(doc: ArticleDoc): { blockId: string; note: string }[] {
  const out: { blockId: string; note: string }[] = [];
  for (const field of [doc.title, doc.dek, doc.kicker, doc.byline]) {
    for (const match of field.matchAll(VERIFY)) out.push({ blockId: "", note: match[0] });
  }
  for (const block of doc.blocks) {
    for (const text of textOf(block)) {
      for (const match of text.matchAll(VERIFY)) out.push({ blockId: block.id, note: match[0] });
    }
  }
  return out;
}

export function countVerify(doc: ArticleDoc): number {
  return verifyNotes(doc).length;
}

/** What to look at before the file leaves the phone. Nothing here blocks an export. */
export function checkArticle(doc: ArticleDoc): Issue[] {
  const out: Issue[] = [];
  if (!doc.title.trim()) out.push({ level: "error", message: "The article has no title." });
  if (!SLUG_PATTERN.test(doc.slug)) {
    out.push({ level: "error", message: `The slug "${doc.slug}" must be lowercase words joined by hyphens.` });
  }
  if (!doc.dek.trim()) out.push({ level: "warn", message: "No dek. Astro uses it as the page description." });
  if (!doc.byline.trim()) out.push({ level: "warn", message: "No byline." });

  const sources = doc.blocks.filter((block) => block.type === "sources");
  const cited = sources.some(
    (block) => block.type === "sources" && block.items.some((item) => item.label.trim() && safeHref(item.href)),
  );
  if (!cited) out.push({ level: "warn", message: "No citation with a label and a working link." });

  for (const block of doc.blocks) {
    if (hasStarterText(block)) {
      out.push({ level: "warn", message: `A ${block.type} block still has its starter text.`, blockId: block.id });
    }
    switch (block.type) {
      case "paragraph":
      case "heading":
        if (!block.text.trim()) out.push({ level: "warn", message: `An empty ${block.type} will be skipped.`, blockId: block.id });
        break;
      case "image":
        if (!block.src.trim()) out.push({ level: "error", message: "An image block has no file.", blockId: block.id });
        else if (!block.alt.trim()) out.push({ level: "warn", message: "An image has no alt text.", blockId: block.id });
        break;
      case "chart":
        if (!safeHref(block.src)) out.push({ level: "warn", message: `Chart "${block.title}" has no usable embed link.`, blockId: block.id });
        if (!block.alt.trim()) out.push({ level: "warn", message: `Chart "${block.title}" has no alt text.`, blockId: block.id });
        break;
      case "sources":
        for (const item of block.items) {
          if (!item.label.trim() || !safeHref(item.href)) {
            out.push({
              level: "warn",
              message: `A source needs a label and an http(s) link: "${item.label || item.href || "empty"}".`,
              blockId: block.id,
            });
          }
        }
        break;
      case "download":
        if (!safeHref(block.href)) out.push({ level: "warn", message: `Download "${block.label}" has no usable link.`, blockId: block.id });
        break;
      default:
        break;
    }
  }

  const open = countVerify(doc);
  if (open > 0) {
    out.push({
      level: "warn",
      message: `${open} [VERIFY] note${open === 1 ? "" : "s"} still open. Resolve each one and delete the marker.`,
    });
  }
  return out;
}
