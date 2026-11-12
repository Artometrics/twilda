import {
  BLOCK_CATALOG,
  SECTION_CATALOG,
  createId,
  type ArticleDoc,
  type Block,
  type BlockType,
  type Doc,
  type Finding,
  type PageDoc,
  type PageSection,
  type SectionType,
  type SourceItem,
} from "./model";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string, max = 60): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

/** A slug that is not in `taken`: `my-piece`, then `my-piece-2`, `my-piece-3`. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base);
  if (!used.has(root)) return root;
  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root}-${createId("copy")}`;
}

export interface NewArticleInput {
  title: string;
  kicker?: string;
  byline?: string;
  dek?: string;
  now?: string;
  taken?: Iterable<string>;
}

/** A blank article that already satisfies the shape the exporter needs. */
export function createArticle(input: NewArticleInput): ArticleDoc {
  const title = input.title.trim() || "Untitled draft";
  const slug = uniqueSlug(title, input.taken ?? []);
  return {
    id: slug,
    kind: "article",
    title,
    slug,
    kicker: input.kicker?.trim() ?? "",
    dek: input.dek?.trim() ?? "",
    byline: input.byline?.trim() ?? "",
    updatedAt: input.now ?? new Date().toISOString(),
    blocks: [
      { id: createId("paragraph"), type: "paragraph", text: "" },
    ],
  };
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function need(raw: Raw, key: string, where: string): string {
  const value = raw[key];
  if (typeof value !== "string") throw new Error(`${where} needs a text field "${key}".`);
  return value;
}

function blockTypeOf(value: unknown): BlockType | null {
  return BLOCK_CATALOG.find((entry) => entry.type === value)?.type ?? null;
}

function sectionTypeOf(value: unknown): SectionType | null {
  return SECTION_CATALOG.find((entry) => entry.type === value)?.type ?? null;
}

function normalizeBlock(value: unknown, index: number): Block {
  const where = `Block ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${where} is not an object.`);
  const type = blockTypeOf(value.type);
  if (!type) throw new Error(`${where} has an unknown type "${str(value.type, "?")}".`);
  const id = str(value.id) || createId(type);
  switch (type) {
    case "heading":
      return { id, type, level: value.level === 3 ? 3 : 2, text: need(value, "text", where) };
    case "paragraph":
      return { id, type, text: need(value, "text", where) };
    case "key-findings": {
      if (!Array.isArray(value.findings)) throw new Error(`${where} needs a "findings" list.`);
      const findings: Finding[] = value.findings.map((entry, at) => {
        if (!isRecord(entry)) throw new Error(`${where}, finding ${at + 1} is not an object.`);
        return {
          id: str(entry.id) || createId("finding"),
          label: str(entry.label),
          detail: str(entry.detail),
        };
      });
      return { id, type, title: str(value.title), findings };
    }
    case "chart":
      return {
        id,
        type,
        title: str(value.title),
        caption: str(value.caption),
        src: str(value.src),
        alt: str(value.alt),
      };
    case "callout":
      return { id, type, title: str(value.title), text: str(value.text) };
    case "sources": {
      if (!Array.isArray(value.items)) throw new Error(`${where} needs an "items" list.`);
      const items: SourceItem[] = value.items.map((entry, at) => {
        if (!isRecord(entry)) throw new Error(`${where}, source ${at + 1} is not an object.`);
        return {
          id: str(entry.id) || createId("source"),
          label: str(entry.label),
          href: str(entry.href),
        };
      });
      return { id, type, items };
    }
    case "image":
      return { id, type, src: str(value.src), alt: str(value.alt), caption: str(value.caption) };
    case "video":
    case "audio":
      return { id, type, src: str(value.src), caption: str(value.caption) };
    case "download":
      return {
        id,
        type,
        label: str(value.label),
        href: str(value.href),
        description: str(value.description),
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}

function normalizeSection(value: unknown, index: number): PageSection {
  const where = `Section ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${where} is not an object.`);
  const type = sectionTypeOf(value.type);
  if (!type) throw new Error(`${where} has an unknown type "${str(value.type, "?")}".`);
  return {
    id: str(value.id) || createId(type),
    type,
    label: str(value.label),
    summary: str(value.summary),
  };
}

/**
 * Turn parsed JSON into a Doc, or throw a message a person can read.
 * Used for imports and for the bundled sample drafts. Missing optional text
 * becomes an empty string; a wrong type or unknown block is an error.
 */
export function normalizeDoc(value: unknown): Doc {
  if (!isRecord(value)) throw new Error("The file is not a Twilda document.");
  const kind = value.kind;
  if (kind !== "article" && kind !== "page") throw new Error('The file has no "kind" of "article" or "page".');
  const title = need(value, "title", "The document");
  const slug = str(value.slug) || slugify(title);
  const id = str(value.id) || slug;
  if (!SLUG_PATTERN.test(id)) throw new Error(`The id "${id}" must be lowercase words joined by hyphens.`);
  const base = {
    id,
    title,
    slug,
    kicker: str(value.kicker),
    dek: str(value.dek),
    byline: str(value.byline),
    updatedAt: str(value.updatedAt) || new Date().toISOString(),
  };
  if (kind === "article") {
    if (!Array.isArray(value.blocks)) throw new Error('The article has no "blocks" list.');
    const doc: ArticleDoc = { ...base, kind, blocks: value.blocks.map(normalizeBlock) };
    assertUniqueIds(doc.blocks.map((block) => block.id));
    return doc;
  }
  if (!Array.isArray(value.sections)) throw new Error('The page has no "sections" list.');
  const doc: PageDoc = { ...base, kind, sections: value.sections.map(normalizeSection) };
  assertUniqueIds(doc.sections.map((section) => section.id));
  return doc;
}

function assertUniqueIds(ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Two items share the id "${id}".`);
    seen.add(id);
  }
}

export function parseDocJson(text: string): Doc {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  return normalizeDoc(value);
}
