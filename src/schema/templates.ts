import {
  BLOCK_CATALOG,
  BLOCK_LABELS,
  BLOCK_TYPES,
  PAGE_SECTION_TYPES,
  SECTION_CATALOG,
  SECTION_LABELS,
  createBlock,
  createSection,
  type Block,
  type BlockType,
  type PageSection,
  type PageSectionType,
  type TwildaDocument,
} from "@twilda/core";

export type Part = Block | PageSection;
export type PartType = BlockType | PageSectionType;

export interface PartCatalogEntry {
  type: PartType;
  label: string;
  hint: string;
  kinds: Array<TwildaDocument["kind"]>;
}

const HINTS: Record<string, string> = Object.fromEntries([...SECTION_CATALOG, ...BLOCK_CATALOG].map((entry) => [entry.type, entry.hint]));

export const PART_CATALOG: PartCatalogEntry[] = [
  ...PAGE_SECTION_TYPES.map((type) => ({
    type,
    label: SECTION_LABELS[type],
    hint: HINTS[type] ?? "",
    kinds: ["page"] as Array<TwildaDocument["kind"]>,
  })),
  ...BLOCK_TYPES.map((type) => ({
    type,
    label: BLOCK_LABELS[type],
    hint: HINTS[type] ?? "",
    kinds: ["article"] as Array<TwildaDocument["kind"]>,
  })),
];

export function partLabel(type: string): string {
  if ((BLOCK_TYPES as readonly string[]).includes(type)) return BLOCK_LABELS[type as BlockType];
  if ((PAGE_SECTION_TYPES as readonly string[]).includes(type)) return SECTION_LABELS[type as PageSectionType];
  return type;
}

export function documentParts(doc: TwildaDocument): Part[] {
  return doc.kind === "article" ? doc.blocks : doc.sections;
}

export function withParts(doc: TwildaDocument, parts: Part[]): TwildaDocument {
  if (doc.kind === "article") return { ...doc, blocks: parts as Block[] };
  return { ...doc, sections: parts as PageSection[] };
}

function nid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const PLATE = "/media/plate-signal.svg";

export function createPart(type: BlockType): Block;
export function createPart(type: PageSectionType): PageSection;
export function createPart(type: PartType): Part {
  switch (type) {
    case "carousel":
      return {
        id: nid("carousel"),
        type: "carousel",
        label: "In this issue",
        slides: [
          {
            id: nid("slide"),
            kicker: "Story",
            title: "New slide",
            dek: "Replace this dek.",
            href: "/articles/lumen-rail",
            image: PLATE,
            imageAlt: "Geometric plate",
          },
        ],
      };
    case "story-grid":
      return {
        id: nid("grid"),
        type: "story-grid",
        kicker: "Desk",
        heading: "New stories",
        stories: [
          {
            id: nid("story"),
            kicker: "Lead",
            title: "New story",
            dek: "Replace this dek.",
            href: "/articles/lumen-rail",
            image: PLATE,
            imageAlt: "Geometric plate",
          },
        ],
      };
    case "menu-shelf":
      return {
        id: nid("menu"),
        type: "menu-shelf",
        heading: "Sections",
        items: [{ id: nid("item"), label: "First door", href: "/articles/lumen-rail", dek: "Where this link goes." }],
      };
    case "heading":
      return { id: nid("heading"), type: "heading", level: 2, text: "New heading" };
    case "paragraph":
      return { id: nid("paragraph"), type: "paragraph", text: "Write the paragraph here." };
    case "key-findings":
      return { id: nid("findings"), type: "key-findings", title: "Key findings", items: ["Finding: What the reporting shows."] };
    case "chart":
      return {
        id: nid("chart"),
        type: "chart",
        title: "Chart title",
        dataPath: "content/data/chart.csv",
        alt: "What the chart shows.",
        caption: "Caption for the chart.",
      };
    case "callout":
      return { id: nid("callout"), type: "callout", title: "Desk note", text: "A short note beside the body." };
    case "sources":
      return {
        id: nid("sources"),
        type: "sources",
        title: "Sources",
        items: [{ id: nid("source"), label: "Source name", href: "https://example.com" }],
      };
    case "image":
      return {
        id: nid("image"),
        type: "image",
        src: PLATE,
        alt: "Geometric plate",
        caption: "Caption for the plate.",
        role: "figure",
      };
    case "embed":
      return {
        id: nid("embed"),
        type: "embed",
        kind: "video",
        src: "https://example.com",
        title: "Clip",
        caption: "What the clip shows.",
      };
    case "download":
      return {
        id: nid("download"),
        type: "download",
        href: "https://example.com/file.csv",
        label: "Download",
        description: "",
      };
    default:
      return (PAGE_SECTION_TYPES as readonly string[]).includes(type) && type !== "fast-facts"
        ? createSection(type as PageSectionType)
        : createBlock(type as BlockType);
  }
}
