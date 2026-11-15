import { blockSchema, pageSectionSchema } from "../../core/src/schema";
import {
  BLOCK_CATALOG,
  SECTION_CATALOG,
  createId,
  type ArticleDoc,
  type Block,
  type BlockType,
  type Doc,
  type PageDoc,
  type PageSection,
  type PageSectionType,
} from "./model";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** An ISO-8601 UTC timestamp. Anything else, including text with a line break, is replaced by the current time. */
const ISO_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

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
    status: "draft",
    blocks: [{ id: createId("paragraph"), type: "paragraph", text: "" }],
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

function sectionTypeOf(value: unknown): PageSectionType | null {
  return SECTION_CATALOG.find((entry) => entry.type === value)?.type ?? null;
}

function findingLine(entry: Raw): string {
  const label = str(entry.label).trim();
  const detail = str(entry.detail).trim();
  if (label && detail) return `${label}: ${detail}`;
  return label || detail;
}

function normalizeBlock(value: unknown, index: number): Block {
  const where = `Block ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${where} is not an object.`);
  if (value.type === "video" || value.type === "audio") {
    return {
      id: str(value.id) || createId("embed"),
      type: "embed",
      kind: value.type === "audio" ? "audio" : "video",
      src: str(value.src),
      title: str(value.title) || (value.type === "audio" ? "Audio" : "Video"),
      caption: str(value.caption),
    };
  }
  const type = blockTypeOf(value.type);
  if (!type) throw new Error(`${where} has an unknown type "${str(value.type, "?")}".`);
  const id = str(value.id) || createId(type);
  switch (type) {
    case "heading":
      return { id, type, level: value.level === 3 ? 3 : 2, text: need(value, "text", where) };
    case "paragraph":
      return { id, type, text: need(value, "text", where) };
    case "key-findings": {
      const fromItems = Array.isArray(value.items) ? value.items.map((entry) => (typeof entry === "string" ? entry : "")).filter((entry) => entry.length > 0) : [];
      const fromFindings = Array.isArray(value.findings)
        ? value.findings.filter(isRecord).map(findingLine).filter((entry) => entry.length > 0)
        : [];
      const items = fromItems.length > 0 ? fromItems : fromFindings;
      if (items.length === 0 && !Array.isArray(value.items) && !Array.isArray(value.findings)) {
        throw new Error(`${where} needs an "items" list.`);
      }
      return { id, type, title: str(value.title), items };
    }
    case "chart":
      return {
        id,
        type,
        title: str(value.title),
        caption: str(value.caption),
        dataPath: str(value.dataPath) || str(value.src),
        alt: str(value.alt),
      };
    case "callout":
      return { id, type, title: str(value.title), text: str(value.text) };
    case "sources": {
      if (!Array.isArray(value.items)) throw new Error(`${where} needs an "items" list.`);
      const items = value.items.map((entry, at) => {
        if (!isRecord(entry)) throw new Error(`${where}, source ${at + 1} is not an object.`);
        return {
          id: str(entry.id) || createId("source"),
          label: str(entry.label),
          href: str(entry.href),
        };
      });
      return { id, type, title: str(value.title) || "Sources", items };
    }
    case "image":
      return {
        id,
        type,
        src: str(value.src),
        alt: str(value.alt),
        caption: str(value.caption),
        role: value.role === "banner" || id === "banner" ? "banner" : "figure",
      };
    case "embed":
      return {
        id,
        type,
        kind: value.kind === "audio" ? "audio" : "video",
        src: str(value.src),
        title: str(value.title) || (value.kind === "audio" ? "Audio" : "Video"),
        caption: str(value.caption),
      };
    case "download":
      return {
        id,
        type,
        label: str(value.label),
        href: str(value.href),
        description: str(value.description),
      };
    case "fast-facts":
    case "pull-quote":
    case "bar-chart":
      return schemaPart(blockSchema.safeParse({ ...value, id }), where);
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}

/** A part of a type added by the modes is taken only if it already passes the core schema. */
function schemaPart<T>(result: { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } }, where: string): T {
  if (result.success) return result.data;
  const first = result.error.issues[0];
  throw new Error(`${where}: ${first ? `${first.path.join(".") || "part"} ${first.message}` : "is not valid"}`);
}

const MODE_SECTION_TYPES = new Set(["hero", "feature-grid", "team", "pricing", "testimonials", "contact", "social-proof", "cta", "cover-story", "category-grid", "fast-facts"]);

function normalizeSection(value: unknown, index: number): PageSection {
  const where = `Section ${index + 1}`;
  if (!isRecord(value)) throw new Error(`${where} is not an object.`);
  const type = sectionTypeOf(value.type);
  const id = str(value.id) || createId(type ?? "section");
  if (type && MODE_SECTION_TYPES.has(type)) return schemaPart(pageSectionSchema.safeParse({ ...value, id }), where);
  if (type === "carousel" && Array.isArray(value.slides)) {
    return {
      id,
      type,
      label: str(value.label),
      slides: value.slides.filter(isRecord).map((slide, at) => ({
        id: str(slide.id) || createId("slide"),
        kicker: str(slide.kicker),
        title: str(slide.title) || `Slide ${at + 1}`,
        dek: str(slide.dek),
        href: str(slide.href) || "/",
        image: str(slide.image) || "/media/plate-signal.svg",
        imageAlt: str(slide.imageAlt) || "Plate",
      })),
    };
  }
  if (type === "story-grid" && Array.isArray(value.stories)) {
    return {
      id,
      type,
      kicker: str(value.kicker),
      heading: str(value.heading) || "Stories",
      stories: value.stories.filter(isRecord).map((story, at) => ({
        id: str(story.id) || createId("story"),
        kicker: str(story.kicker),
        title: str(story.title) || `Story ${at + 1}`,
        dek: str(story.dek),
        href: str(story.href) || "/",
        image: str(story.image) || "/media/plate-signal.svg",
        imageAlt: str(story.imageAlt) || "Plate",
      })),
    };
  }
  if (type === "menu-shelf" && Array.isArray(value.items)) {
    return {
      id,
      type,
      heading: str(value.heading) || "Sections",
      items: value.items.filter(isRecord).map((item) => ({
        id: str(item.id) || createId("item"),
        label: str(item.label) || "Item",
        href: str(item.href) || "/",
        dek: str(item.dek),
      })),
    };
  }
  const label = str(value.label) || str(value.heading) || str(value.type) || "Section";
  const summary = str(value.summary) || str(value.dek);
  return {
    id,
    type: "menu-shelf",
    heading: label,
    items: [{ id: createId("item"), label, href: str(value.href) || "/", dek: summary }],
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
  if (!SLUG_PATTERN.test(slug)) throw new Error(`The slug "${slug.slice(0, 60)}" must be lowercase words joined by hyphens.`);
  const id = str(value.id) || slug;
  if (!SLUG_PATTERN.test(id)) throw new Error(`The id "${id}" must be lowercase words joined by hyphens.`);
  const base = {
    id,
    title,
    slug,
    kicker: str(value.kicker),
    dek: str(value.dek),
    status: value.status === "published" ? "published" : "draft",
    updatedAt: ISO_STAMP.test(str(value.updatedAt)) ? str(value.updatedAt) : new Date().toISOString(),
  } as const;
  if (kind === "article") {
    if (!Array.isArray(value.blocks)) throw new Error('The article has no "blocks" list.');
    const doc: ArticleDoc = { ...base, kind, byline: str(value.byline), blocks: value.blocks.map(normalizeBlock) };
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
