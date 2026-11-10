import {
  SECTION_LABELS,
  type ContentDocument,
  type Section,
  type SectionType,
} from "./sections";

export interface SectionCatalogEntry {
  type: SectionType;
  label: string;
  hint: string;
  kinds: Array<ContentDocument["kind"]>;
}

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  {
    type: "carousel",
    label: SECTION_LABELS.carousel,
    hint: "A sideways row of lead stories.",
    kinds: ["page"],
  },
  {
    type: "story-grid",
    label: SECTION_LABELS["story-grid"],
    hint: "One lead story beside a short stack.",
    kinds: ["page"],
  },
  {
    type: "headline-facts",
    label: SECTION_LABELS["headline-facts"],
    hint: "A headline beside a fact table.",
    kinds: ["page", "article"],
  },
  {
    type: "magazine-feature",
    label: SECTION_LABELS["magazine-feature"],
    hint: "A single feature with a plate and a dek.",
    kinds: ["page"],
  },
  {
    type: "category-tiles",
    label: SECTION_LABELS["category-tiles"],
    hint: "A row of section doors.",
    kinds: ["page"],
  },
  {
    type: "heading",
    label: SECTION_LABELS.heading,
    hint: "A section heading in the article.",
    kinds: ["article"],
  },
  {
    type: "paragraph",
    label: SECTION_LABELS.paragraph,
    hint: "Body copy. Separate paragraphs with a blank line.",
    kinds: ["article"],
  },
  {
    type: "pull-quote",
    label: SECTION_LABELS["pull-quote"],
    hint: "A quotation pulled out of the body.",
    kinds: ["article"],
  },
  {
    type: "figure",
    label: SECTION_LABELS.figure,
    hint: "A plate with a caption.",
    kinds: ["article"],
  },
  {
    type: "list",
    label: SECTION_LABELS.list,
    hint: "A short ordered or bulleted list.",
    kinds: ["article"],
  },
  {
    type: "callout",
    label: SECTION_LABELS.callout,
    hint: "A desk note set off from the body.",
    kinds: ["article"],
  },
];

function nid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createSection(type: SectionType): Section {
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
            image: "/media/plate-signal.svg",
            imageAlt: "Abstract signal plate",
          },
        ],
      };
    case "story-grid":
      return {
        id: nid("grid"),
        type: "story-grid",
        kicker: "Desk",
        lead: {
          kicker: "Lead",
          title: "New lead story",
          dek: "Replace this dek.",
          href: "/articles/lumen-rail",
          image: "/media/plate-yard.svg",
          imageAlt: "Abstract yard plate",
          byline: "Field Desk",
        },
        stories: [
          {
            id: nid("story"),
            kicker: "Short",
            title: "New short",
            dek: "A supporting story.",
            href: "/articles/lumen-rail",
          },
        ],
      };
    case "headline-facts":
      return {
        id: nid("facts"),
        type: "headline-facts",
        kicker: "Facts",
        headline: "New headline",
        dek: "A line under the headline.",
        facts: [
          { id: nid("fact"), label: "Label", value: "Value" },
          { id: nid("fact"), label: "Second", value: "Value" },
        ],
      };
    case "magazine-feature":
      return {
        id: nid("feature"),
        type: "magazine-feature",
        kicker: "Feature",
        title: "New feature",
        dek: "Replace this dek.",
        byline: "Field Desk",
        href: "/articles/lumen-rail",
        image: "/media/plate-map.svg",
        imageAlt: "Abstract route plate",
        };
    case "category-tiles":
      return {
        id: nid("tiles"),
        type: "category-tiles",
        heading: "Sections",
        tiles: [
          {
            id: nid("tile"),
            title: "First door",
            dek: "Where this tile goes.",
            href: "/articles/lumen-rail",
            image: "/media/plate-archive.svg",
            imageAlt: "Abstract archive plate",
          },
          {
            id: nid("tile"),
            title: "Second door",
            dek: "Where this tile goes.",
            href: "/articles/lumen-rail",
            image: "/media/plate-river.svg",
            imageAlt: "Abstract river plate",
          },
        ],
      };
    case "heading":
      return { id: nid("heading"), type: "heading", level: 2, text: "New heading" };
    case "paragraph":
      return {
        id: nid("paragraph"),
        type: "paragraph",
        text: "Write the paragraph here.",
      };
    case "pull-quote":
      return {
        id: nid("quote"),
        type: "pull-quote",
        quote: "A sentence worth pulling out.",
        attribution: "Field Desk",
      };
    case "figure":
      return {
        id: nid("figure"),
        type: "figure",
        image: "/media/plate-yard.svg",
        imageAlt: "Abstract yard plate",
        caption: "Caption for the plate.",
      };
    case "list":
      return {
        id: nid("list"),
        type: "list",
        ordered: true,
        items: ["First item", "Second item"],
      };
    case "callout":
      return {
        id: nid("callout"),
        type: "callout",
        title: "Desk note",
        text: "A short note beside the body.",
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown section type ${exhaustive}`);
    }
  }
}
