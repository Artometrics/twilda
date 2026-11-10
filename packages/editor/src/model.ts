/**
 * Document model used by the desk until `@twilda/core` lands.
 * Articles are an ordered list of prepared blocks. Pages are an ordered
 * list of prepared section types. Neither is a freeform canvas.
 */

export const BLOCK_CATALOG = [
  { type: "heading", label: "Heading", hint: "A section title." },
  { type: "paragraph", label: "Paragraph", hint: "Body copy." },
  { type: "key-findings", label: "Key findings", hint: "Labeled findings, kept in fields." },
  { type: "chart", label: "Chart", hint: "A chart embed and its caption." },
  { type: "callout", label: "Callout", hint: "A desk note set off from the body." },
  { type: "sources", label: "Sources", hint: "Where the piece draws from." },
  { type: "image", label: "Image", hint: "A plate, alt text, and a caption." },
  { type: "video", label: "Video", hint: "A video file or embed path." },
  { type: "audio", label: "Audio", hint: "An audio file and a caption." },
  { type: "download", label: "Download", hint: "A file a reader can take." },
] as const;

export const SECTION_CATALOG = [
  { type: "carousel", label: "Carousel", hint: "A sideways row of leads." },
  { type: "story-grid", label: "Story grid", hint: "One lead and a stack of shorts." },
  { type: "headline-facts", label: "Headline / facts", hint: "A headline beside a fact table." },
  { type: "magazine-feature", label: "Magazine feature", hint: "One feature with a plate." },
  { type: "category-tiles", label: "Category tiles", hint: "A row of doors into the issue." },
] as const;

export type BlockType = (typeof BLOCK_CATALOG)[number]["type"];
export type SectionType = (typeof SECTION_CATALOG)[number]["type"];

export interface Finding {
  id: string;
  label: string;
  detail: string;
}

export interface SourceItem {
  id: string;
  label: string;
  href: string;
}

export type Block =
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "key-findings"; title: string; findings: Finding[] }
  | { id: string; type: "chart"; title: string; caption: string; src: string }
  | { id: string; type: "callout"; title: string; text: string }
  | { id: string; type: "sources"; items: SourceItem[] }
  | { id: string; type: "image"; src: string; alt: string; caption: string }
  | { id: string; type: "video"; src: string; caption: string }
  | { id: string; type: "audio"; src: string; caption: string }
  | { id: string; type: "download"; label: string; href: string };

export interface PageSection {
  id: string;
  type: SectionType;
  label: string;
  summary: string;
}

interface DocBase {
  id: string;
  title: string;
  slug: string;
  dek: string;
  kicker: string;
  byline: string;
  updatedAt: string;
}

export interface ArticleDoc extends DocBase {
  kind: "article";
  blocks: Block[];
}

export interface PageDoc extends DocBase {
  kind: "page";
  sections: PageSection[];
}

export type Doc = ArticleDoc | PageDoc;

export type DocStatus = "draft-only" | "unpublished" | "published";

export interface DocSummary {
  id: string;
  kind: Doc["kind"];
  title: string;
  kicker: string;
  dek: string;
  status: DocStatus;
  hasPublished: boolean;
}

export interface MediaAsset {
  name: string;
  path: string;
  dataUrl: string;
  width: number;
  height: number;
  scaled: boolean;
  originalWidth: number;
  originalHeight: number;
}

export type MetaPatch = Partial<Pick<Doc, "title" | "dek" | "kicker" | "byline" | "slug">>;

export function blockLabel(type: BlockType): string {
  return BLOCK_CATALOG.find((entry) => entry.type === type)?.label ?? type;
}

export function sectionLabel(type: SectionType): string {
  return SECTION_CATALOG.find((entry) => entry.type === type)?.label ?? type;
}

export function createId(prefix: string): string {
  const raw = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2);
  return `${prefix}-${raw.replace(/-/g, "").slice(0, 8)}`;
}

export function createBlock(type: BlockType, id = createId(type)): Block {
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "New heading" };
    case "paragraph":
      return { id, type, text: "Write the paragraph here." };
    case "key-findings":
      return {
        id,
        type,
        title: "Key findings",
        findings: [{ id: createId("finding"), label: "Finding", detail: "What the reporting shows." }],
      };
    case "chart":
      return { id, type, title: "Chart title", caption: "What the chart is doing on the page.", src: "" };
    case "callout":
      return { id, type, title: "Desk note", text: "A short note beside the body." };
    case "sources":
      return {
        id,
        type,
        items: [{ id: createId("source"), label: "Field Desk sample", href: "/articles/lumen-rail" }],
      };
    case "image":
      return { id, type, src: "", alt: "", caption: "Caption for the plate." };
    case "video":
      return { id, type, src: "", caption: "What the clip shows." };
    case "audio":
      return { id, type, src: "", caption: "What the recording is." };
    case "download":
      return { id, type, label: "Night sheet", href: "" };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown block ${exhaustive}`);
    }
  }
}

export function createSection(type: SectionType, id = createId(type)): PageSection {
  switch (type) {
    case "carousel":
      return { id, type, label: "In this issue", summary: "A row of leads across the top of the issue." };
    case "story-grid":
      return { id, type, label: "The desk", summary: "One lead story beside a short stack." };
    case "headline-facts":
      return { id, type, label: "What the sheet records", summary: "A headline with a fact table beside it." };
    case "magazine-feature":
      return { id, type, label: "Feature", summary: "A single feature with a plate and a dek." };
    case "category-tiles":
      return { id, type, label: "Sections", summary: "Doors into the rest of the issue." };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown section ${exhaustive}`);
    }
  }
}

export function fingerprint(doc: Doc): string {
  return JSON.stringify(normalize(doc));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      if (key === "updatedAt") continue;
      out[key] = normalize(record[key]);
    }
    return out;
  }
  return value;
}

export function documentStatus(draft: Doc, published: Doc | null): DocStatus {
  if (!published) return "draft-only";
  if (fingerprint(draft) !== fingerprint(published)) return "unpublished";
  return "published";
}

export function toSummary(draft: Doc, published: Doc | null): DocSummary {
  return {
    id: draft.id,
    kind: draft.kind,
    title: draft.title,
    kicker: draft.kicker,
    dek: draft.dek,
    status: documentStatus(draft, published),
    hasPublished: published !== null,
  };
}
