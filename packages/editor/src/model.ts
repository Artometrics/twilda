/**
 * Phone-desk helpers over the `@twilda/core` contract.
 * Article blocks and page sections are the core types. This file does not
 * declare a second schema.
 */
import {
  BLOCK_LABELS,
  SECTION_LABELS,
  type ArticleDocument,
  type Block,
  type BlockType,
  type PageDocument,
  type PageSection,
  type PageSectionType,
} from "../../core/src/schema";

export type { ArticleDocument, Block, BlockType, PageDocument, PageSection, PageSectionType };

export { BLOCK_CATALOG, SECTION_CATALOG, createBlock, createFormSection, createId, createSection } from "../../core/src/library";

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
  /** When the draft file was last written. */
  updatedAt: string;
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
    case "feature-grid":
    case "team":
    case "pricing":
    case "testimonials":
    case "contact":
    case "social-proof":
    case "cta":
    case "category-grid":
    case "fast-facts":
    case "form":
      return section.heading;
    case "hero":
    case "cover-story":
      return section.title;
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

export function docByline(doc: Doc): string {
  return doc.kind === "article" ? doc.byline : "";
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
    updatedAt: draft.updatedAt,
    verifyCount,
  };
}
