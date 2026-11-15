/**
 * Phone-desk helpers over the `@twilda/core` contract.
 * Article blocks and page sections are the core types. This file does not
 * declare a second schema.
 */
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  SECTION_LABELS,
  type ArticleDocument,
  type Block,
  type BlockType,
  type PageDocument,
  type PageSection,
  type PageSectionType,
} from "../../core/src/schema";

export type { ArticleDocument, Block, BlockType, PageDocument, PageSection, PageSectionType };

const BLOCK_HINTS: Record<BlockType, string> = {
  heading: "A section title.",
  paragraph: "Body copy.",
  "key-findings": "A title and one line per finding.",
  chart: "A CSV under content/data/, or a link, plus alt text.",
  callout: "A desk note set off from the body.",
  sources: "Citations: a label and a link for each.",
  image: "A plate, alt text, and a caption.",
  embed: "A video or audio link.",
  download: "A file or dataset a reader can take.",
};

const SECTION_HINTS: Record<PageSectionType, string> = {
  carousel: "A sideways row of leads.",
  "story-grid": "Story cards with a plate and a dek.",
  "menu-shelf": "A heading and a list of links.",
};

export const BLOCK_CATALOG = BLOCK_TYPES.map((type) => ({
  type,
  label: BLOCK_LABELS[type],
  hint: BLOCK_HINTS[type],
}));

export const SECTION_CATALOG = (["carousel", "story-grid", "menu-shelf"] as const).map((type) => ({
  type,
  label: SECTION_LABELS[type],
  hint: SECTION_HINTS[type],
}));

export type ArticleDoc = ArticleDocument;
export type PageDoc = PageDocument;
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
  /** Open [VERIFY] notes in the draft. */
  verifyCount: number;
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

export type MetaPatch = Partial<Pick<ArticleDoc, "title" | "dek" | "kicker" | "byline" | "slug">>;

export function blockLabel(type: BlockType): string {
  return BLOCK_LABELS[type];
}

export function sectionLabel(type: PageSectionType): string {
  return SECTION_LABELS[type];
}

export function sectionSummary(section: PageSection): string {
  switch (section.type) {
    case "carousel":
      return section.label || section.slides[0]?.title || "Carousel";
    case "story-grid":
      return section.heading;
    case "menu-shelf":
      return section.heading;
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

export function docByline(doc: Doc): string {
  return doc.kind === "article" ? doc.byline : "";
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
      return { id, type, title: "Key findings", items: ["Finding: What the reporting shows."] };
    case "chart":
      return {
        id,
        type,
        title: "Chart title",
        caption: "What the chart is doing on the page.",
        dataPath: "content/data/chart.csv",
        alt: "",
      };
    case "callout":
      return { id, type, title: "Desk note", text: "A short note beside the body." };
    case "sources":
      return {
        id,
        type,
        title: "Sources",
        items: [{ id: createId("source"), label: "Source name, title, date", href: "https://" }],
      };
    case "image":
      return { id, type, src: "", alt: "", caption: "", role: "figure" };
    case "embed":
      return { id, type, kind: "video", src: "", title: "Clip", caption: "What the clip shows." };
    case "download":
      return { id, type, label: "Dataset (CSV)", href: "", description: "" };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown block ${exhaustive}`);
    }
  }
}

export function createSection(type: PageSectionType, id = createId(type)): PageSection {
  switch (type) {
    case "carousel":
      return {
        id,
        type,
        label: "In this issue",
        slides: [
          {
            id: createId("slide"),
            kicker: "Story",
            title: "New slide",
            dek: "A lead.",
            href: "/",
            image: "/media/plate-signal.svg",
            imageAlt: "Geometric plate",
          },
        ],
      };
    case "story-grid":
      return {
        id,
        type,
        kicker: "Desk",
        heading: "Stories",
        stories: [
          {
            id: createId("story"),
            kicker: "Lead",
            title: "New story",
            dek: "A short card.",
            href: "/",
            image: "/media/plate-signal.svg",
            imageAlt: "Geometric plate",
          },
        ],
      };
    case "menu-shelf":
      return {
        id,
        type,
        heading: "Sections",
        items: [{ id: createId("item"), label: "First door", href: "/", dek: "Where this link goes." }],
      };
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
      if (key === "updatedAt" || key === "status") continue;
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

export function toSummary(draft: Doc, published: Doc | null, verifyCount = 0): DocSummary {
  return {
    id: draft.id,
    kind: draft.kind,
    title: draft.title,
    kicker: draft.kicker,
    dek: draft.dek,
    status: documentStatus(draft, published),
    hasPublished: published !== null,
    verifyCount,
  };
}
