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
  "fast-facts": "A row of squares, each a big number and a label.",
  "pull-quote": "A line lifted out of the story, with who said it.",
  "bar-chart": "Labelled bars from numbers you type. No data file.",
};

const SECTION_HINTS: Record<PageSectionType, string> = {
  carousel: "A sideways row of leads.",
  "story-grid": "Story cards with a plate and a dek.",
  "menu-shelf": "A heading and a list of links.",
  hero: "The headline, a short pitch, up to two buttons, and a plate.",
  "feature-grid": "A grid of short cards: a title and a line each. Features or benefits.",
  team: "People: a photo plate, a name, a role, and a line.",
  pricing: "Up to four plans with a price, a feature list, and a button.",
  testimonials: "Short quotes with a name and a role.",
  contact: "Ways to reach you: email, links, and an address.",
  "social-proof": "Big numbers and a row of names that trust you.",
  cta: "One headline and one button, with what the form would ask.",
  "cover-story": "The lead story: a large plate, headline, dek, and byline.",
  "category-grid": "Tiles for each desk or topic, with a story count.",
  "fast-facts": "A row of squares, each a big number and a label.",
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
    case "fast-facts":
      return {
        id,
        type,
        title: "Fast facts",
        facts: [
          { id: createId("fact"), value: "42", label: "What the number counts" },
          { id: createId("fact"), value: "7%", label: "What this one measures" },
        ],
      };
    case "pull-quote":
      return { id, type, quote: "A line worth lifting out of the story.", attribution: "Who said it" };
    case "bar-chart":
      return {
        id,
        type,
        title: "Chart title",
        alt: "Describe what the bars compare for a reader who cannot see them.",
        unit: "%",
        caption: "",
        bars: [
          { id: createId("bar"), label: "First", value: "40" },
          { id: createId("bar"), label: "Second", value: "25" },
        ],
      };
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
    case "hero":
      return {
        id,
        type,
        kicker: "Introducing",
        title: "A headline that says what you do",
        dek: "One or two sentences that tell a visitor why to stay.",
        primaryLabel: "Get started",
        primaryHref: "/",
        secondaryLabel: "",
        secondaryHref: "",
        image: "/media/plate-signal.svg",
        imageAlt: "Geometric plate",
      };
    case "feature-grid":
      return {
        id,
        type,
        kicker: "What you get",
        heading: "Why people choose this",
        intro: "",
        items: [
          { id: createId("feature"), label: "01", title: "First feature", text: "One line on what it does for the reader." },
          { id: createId("feature"), label: "02", title: "Second feature", text: "One line on what it does for the reader." },
          { id: createId("feature"), label: "03", title: "Third feature", text: "One line on what it does for the reader." },
        ],
      };
    case "team":
      return {
        id,
        type,
        kicker: "People",
        heading: "The team",
        intro: "",
        members: [
          { id: createId("member"), name: "Name Surname", role: "Role", bio: "One line about them.", image: "/media/plate-signal.svg", imageAlt: "Geometric plate" },
        ],
      };
    case "pricing":
      return {
        id,
        type,
        kicker: "Pricing",
        heading: "Simple plans",
        intro: "",
        tiers: [
          { id: createId("tier"), name: "Starter", price: "$0", period: "per month", summary: "For trying it out.", features: ["First feature", "Second feature"], ctaLabel: "Choose Starter", ctaHref: "/", featured: false },
          { id: createId("tier"), name: "Team", price: "$12", period: "per month", summary: "For regular use.", features: ["Everything in Starter", "Third feature"], ctaLabel: "Choose Team", ctaHref: "/", featured: true },
        ],
      };
    case "testimonials":
      return {
        id,
        type,
        kicker: "Customers",
        heading: "What people say",
        intro: "",
        items: [{ id: createId("quote"), quote: "A short quote from a real customer.", name: "Name Surname", role: "Role, Company" }],
      };
    case "contact":
      return {
        id,
        type,
        kicker: "Contact",
        heading: "Get in touch",
        intro: "",
        channels: [{ id: createId("channel"), label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" }],
        address: "",
      };
    case "social-proof":
      return {
        id,
        type,
        kicker: "Results",
        heading: "Trusted by teams like yours",
        intro: "",
        stats: [{ id: createId("stat"), value: "100+", label: "customers" }],
        brands: ["Company one", "Company two"],
      };
    case "cta":
      return {
        id,
        type,
        kicker: "Next step",
        heading: "Ready when you are",
        text: "One sentence on what happens after the click.",
        buttonLabel: "Get started",
        buttonHref: "/",
        asks: ["Your name", "Your email"],
        note: "",
      };
    case "cover-story":
      return {
        id,
        type,
        kicker: "Cover story",
        title: "The lead story",
        dek: "Two sentences that make a reader open it.",
        byline: "By the desk",
        href: "/",
        linkLabel: "Read the story",
        image: "/media/plate-signal.svg",
        imageAlt: "Geometric plate",
      };
    case "category-grid":
      return {
        id,
        type,
        kicker: "Sections",
        heading: "Browse by desk",
        categories: [
          { id: createId("category"), label: "First desk", dek: "What it covers.", href: "/", count: "" },
          { id: createId("category"), label: "Second desk", dek: "What it covers.", href: "/", count: "" },
        ],
      };
    case "fast-facts":
      return {
        id,
        type,
        kicker: "At a glance",
        heading: "Fast facts",
        facts: [
          { id: createId("fact"), value: "42", label: "What the number counts" },
          { id: createId("fact"), value: "7%", label: "What this one measures" },
        ],
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unknown section ${exhaustive}`);
    }
  }
}
