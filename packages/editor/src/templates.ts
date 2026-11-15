import type { PresetId } from "@twilda/core";
import { uniqueSlug } from "./doc";
import {
  createBlock,
  createFormSection,
  createId,
  createSection,
  type ArticleDoc,
  type Block,
  type Doc,
  type PageDoc,
  type PageSection,
} from "./model";

/**
 * Starting points for a new draft. Each one is an ordered list of prepared
 * blocks (articles) or prepared sections (pages), with placeholder copy that
 * already satisfies the `@twilda/core` schema, so a new draft renders in the
 * real template straight away. It is not a canvas: the parts are the same
 * prepared types the Blocks panel adds, removes, and reorders.
 */
export interface DraftTemplate {
  id: string;
  kind: Doc["kind"];
  /** Modes that offer this template. Omitted: every mode. */
  modes?: PresetId[];
  label: string;
  hint: string;
  /** Names of the parts, for the chooser. */
  outline: string[];
  parts: () => Block[] | PageSection[];
}

const PLATE = "/media/plate-signal.svg";

function article(parts: () => Block[]): () => Block[] {
  return parts;
}

export const DRAFT_TEMPLATES: DraftTemplate[] = [
  {
    id: "blank-article",
    kind: "article",
    label: "Blank article",
    hint: "One paragraph. Add the rest as you go.",
    outline: ["Paragraph"],
    parts: article(() => [{ ...createBlock("paragraph"), text: "Start writing here. Tap any text on the page to edit it." } as Block]),
  },
  {
    id: "feature",
    kind: "article",
    modes: ["magazine"],
    label: "Feature story",
    hint: "Banner image, lede, a heading, findings, a note, and sources.",
    outline: ["Banner", "Paragraph", "Heading", "Paragraph", "Key findings", "Callout", "Sources"],
    parts: article(() => [
      { ...createBlock("image"), src: PLATE, alt: "Geometric plate", caption: "", role: "banner" } as Block,
      { ...createBlock("paragraph"), text: "Open with the one thing a reader should know. Tap this text to rewrite it." } as Block,
      { ...createBlock("heading"), text: "What the reporting shows" } as Block,
      { ...createBlock("paragraph"), text: "Say it plainly, then back it up in the next paragraph.\n\nA blank line starts a new paragraph." } as Block,
      { ...createBlock("key-findings"), title: "Key findings", items: ["First finding: What the reporting shows.", "Second finding: Why it matters."] } as Block,
      { ...createBlock("callout"), title: "Desk note", text: "A short note set off from the body." } as Block,
      {
        ...createBlock("sources"),
        title: "Sources",
        items: [{ id: createId("source"), label: "Source name, title, date", href: "https://example.com/source" }],
      } as Block,
    ]),
  },
  {
    id: "data-story",
    kind: "article",
    modes: ["magazine"],
    label: "Data story",
    hint: "A lede, a chart with alt text, findings, and sources.",
    outline: ["Paragraph", "Chart", "Key findings", "Paragraph", "Sources"],
    parts: article(() => [
      { ...createBlock("paragraph"), text: "State the question the data answers. Tap to edit." } as Block,
      {
        ...createBlock("chart"),
        title: "Chart title",
        caption: "What the chart is doing on the page.",
        dataPath: "https://example.com/chart",
        alt: "Describe what the chart shows for a reader who cannot see it.",
      } as Block,
      { ...createBlock("key-findings"), title: "What stands out", items: ["Gap: The biggest difference in the data."] } as Block,
      { ...createBlock("paragraph"), text: "Explain the method in a sentence, then the caveat." } as Block,
      {
        ...createBlock("sources"),
        title: "Sources",
        items: [{ id: createId("source"), label: "Dataset, publisher, date", href: "https://example.com/data" }],
      } as Block,
    ]),
  },
  {
    id: "short-note",
    kind: "article",
    label: "Short note",
    hint: "Two paragraphs and a download. Quick to ship.",
    outline: ["Paragraph", "Paragraph", "Download"],
    parts: article(() => [
      { ...createBlock("paragraph"), text: "One paragraph that carries the news." } as Block,
      { ...createBlock("paragraph"), text: "One paragraph of context." } as Block,
      { ...createBlock("download"), label: "Dataset (CSV)", href: "/data/dataset.csv", description: "" } as Block,
    ]),
  },
  {
    id: "front-page",
    kind: "page",
    modes: ["magazine"],
    label: "Front page",
    hint: "A carousel of leads, a story grid, and a link shelf.",
    outline: ["Carousel", "Story grid", "Menu shelf"],
    parts: () => [
      carouselOfThree(),
      { ...createSection("story-grid"), kicker: "Desk", heading: "More stories", stories: stories(3) } as PageSection,
      createSection("menu-shelf"),
    ],
  },
  {
    id: "topic-page",
    kind: "page",
    modes: ["magazine"],
    label: "Topic page",
    hint: "A story grid and a link shelf for one subject.",
    outline: ["Story grid", "Menu shelf"],
    parts: () => [
      { ...createSection("story-grid"), kicker: "Topic", heading: "Latest on this topic", stories: stories(3) } as PageSection,
      createSection("menu-shelf"),
    ],
  },
  {
    id: "company-home",
    kind: "page",
    modes: ["corporate"],
    label: "Company home",
    hint: "Hero, features, team, pricing, testimonials, and contact, with anchors the masthead links to.",
    outline: ["Hero", "Features", "Team", "Pricing", "Testimonials", "Contact", "Contact form"],
    parts: () => [
      createSection("hero", "hero"),
      createSection("feature-grid", "features"),
      createSection("team", "team"),
      createSection("pricing", "pricing"),
      createSection("testimonials", "testimonials"),
      createSection("contact", "contact"),
      createFormSection("enquiry", "contact"),
    ],
  },
  {
    id: "product-update",
    kind: "article",
    modes: ["corporate"],
    label: "Product update",
    hint: "A short post: the news, three numbers, a quote, and a note.",
    outline: ["Paragraph", "Fast facts", "Heading", "Paragraph", "Pull quote", "Callout"],
    parts: article(() => [
      { ...createBlock("paragraph"), text: "Say what changed in one sentence." } as Block,
      createBlock("fast-facts"),
      { ...createBlock("heading"), text: "What is new" } as Block,
      { ...createBlock("paragraph"), text: "Explain it in plain words, then say who it helps." } as Block,
      createBlock("pull-quote"),
      createBlock("callout"),
    ]),
  },
  {
    id: "landing-page",
    kind: "page",
    modes: ["leadgen"],
    label: "Landing page",
    hint: "Hero, benefits, social proof, quotes, and one call to action, with anchors the masthead links to.",
    outline: ["Hero", "Benefits", "Social proof", "Testimonials", "Call to action", "Lead form"],
    parts: () => [
      createSection("hero", "hero"),
      createSection("feature-grid", "benefits"),
      createSection("social-proof", "proof"),
      createSection("testimonials", "voices"),
      createSection("cta", "start"),
      createFormSection("join", "lead"),
    ],
  },
  {
    id: "case-study",
    kind: "article",
    modes: ["leadgen"],
    label: "Case study",
    hint: "The result in numbers, a quote, and a call to act.",
    outline: ["Paragraph", "Fast facts", "Pull quote", "Callout"],
    parts: article(() => [
      { ...createBlock("paragraph"), text: "Say who they are and what they wanted." } as Block,
      createBlock("fast-facts"),
      createBlock("pull-quote"),
      { ...createBlock("callout"), title: "Want the same?", text: "One line that tells the reader what to do next." } as Block,
    ]),
  },
  {
    id: "cover-front",
    kind: "page",
    modes: ["magazine"],
    label: "Cover front page",
    hint: "A cover story, fast facts, a story grid, and a category grid.",
    outline: ["Cover story", "Fast facts", "Story grid", "Category grid"],
    parts: () => [
      createSection("cover-story"),
      createSection("fast-facts"),
      { ...createSection("story-grid"), kicker: "Latest", heading: "Also this week", stories: stories(3) } as PageSection,
      createSection("category-grid"),
    ],
  },
  {
    id: "data-brief",
    kind: "article",
    modes: ["magazine"],
    label: "Data brief",
    hint: "A lede, fast facts, a bar chart, a pull quote, and sources.",
    outline: ["Paragraph", "Fast facts", "Bar chart", "Pull quote", "Sources"],
    parts: article(() => [
      { ...createBlock("paragraph"), text: "State the question the numbers answer." } as Block,
      createBlock("fast-facts"),
      createBlock("bar-chart"),
      createBlock("pull-quote"),
      {
        ...createBlock("sources"),
        title: "Sources",
        items: [{ id: createId("source"), label: "Dataset, publisher, date", href: "https://example.com/data" }],
      } as Block,
    ]),
  },
];

function stories(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: createId("story"),
    kicker: i === 0 ? "Lead" : "Story",
    title: i === 0 ? "The lead story" : `Story ${i + 1}`,
    dek: "A short card that says what the story is.",
    href: "/",
    image: PLATE,
    imageAlt: "Geometric plate",
  }));
}

function carouselOfThree(): PageSection {
  const base = createSection("carousel");
  if (base.type !== "carousel") throw new Error("carousel expected");
  return {
    ...base,
    label: "In this issue",
    slides: [0, 1, 2].map((i) => ({
      id: createId("slide"),
      kicker: "Story",
      title: `Lead ${i + 1}`,
      dek: "A line that makes a reader tap.",
      href: "/",
      image: PLATE,
      imageAlt: "Geometric plate",
    })),
  };
}

export function templatesFor(kind: Doc["kind"]): DraftTemplate[] {
  return DRAFT_TEMPLATES.filter((template) => template.kind === kind);
}

/** The templates a mode offers. A template with no `modes` list is offered in every mode. */
export function templatesForMode(mode: PresetId): DraftTemplate[] {
  return DRAFT_TEMPLATES.filter((template) => !template.modes || template.modes.includes(mode));
}

export function findTemplate(id: string): DraftTemplate {
  const found = DRAFT_TEMPLATES.find((template) => template.id === id);
  if (!found) throw new Error(`Unknown template "${id}".`);
  return found;
}

export interface NewDraftInput {
  templateId: string;
  title: string;
  kicker?: string;
  byline?: string;
  dek?: string;
  now?: string;
  taken?: Iterable<string>;
}

/** A draft built from a template, with its own id, slug, and fresh part ids. */
export function createFromTemplate(input: NewDraftInput): Doc {
  const template = findTemplate(input.templateId);
  const title = input.title.trim() || "Untitled draft";
  const slug = uniqueSlug(title, input.taken ?? []);
  const base = {
    id: slug,
    title,
    slug,
    kicker: input.kicker?.trim() ?? "",
    dek: input.dek?.trim() ?? "",
    updatedAt: input.now ?? new Date().toISOString(),
    status: "draft" as const,
  };
  if (template.kind === "page") {
    const sections = template.parts() as PageSection[];
    const lead = sections[0];
    if (lead && (lead.type === "hero" || lead.type === "cover-story")) {
      // This section carries the page's h1, so the title the writer just typed has to land in it.
      lead.title = title;
      if (base.kicker) lead.kicker = base.kicker;
      if (base.dek && base.dek.length <= 400) lead.dek = base.dek;
    }
    const page: PageDoc = { ...base, kind: "page", sections };
    return page;
  }
  const doc: ArticleDoc = {
    ...base,
    kind: "article",
    byline: input.byline?.trim() ?? "",
    blocks: template.parts() as Block[],
  };
  return doc;
}
