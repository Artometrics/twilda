import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  PAGE_SECTION_TYPES,
  SECTION_LABELS,
  type Block,
  type BlockType,
  type PageSection,
  type PageSectionType,
} from "./schema";

/**
 * The library of prepared parts. A page is an ordered list of these sections and an
 * article is an ordered list of these blocks. An editor adds, removes, and reorders
 * them; it cannot invent a new kind of part or place one anywhere but in the list.
 * Extend this list (and the schema) to offer something new. There is no freeform canvas.
 */

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

export const BLOCK_CATALOG = BLOCK_TYPES.map((type) => ({ type, label: BLOCK_LABELS[type], hint: BLOCK_HINTS[type] }));

export const SECTION_CATALOG = PAGE_SECTION_TYPES.map((type) => ({
  type,
  label: SECTION_LABELS[type],
  hint: SECTION_HINTS[type],
}));

export function createId(prefix: string): string {
  const raw = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2).padEnd(8, "0");
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
