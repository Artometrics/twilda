import { z } from "zod";

/**
 * Prepared sections for Twilda CMS.
 *
 * A document is an ordered array of these sections. Authors add, remove, and
 * reorder them. They do not draw a freeform canvas.
 *
 * Homepage (`kind: "page"`) sections are magazine blocks.
 * Franchise-style articles (`kind: "article"`) use body blocks, plus a
 * headline/facts block when a template needs a structured fact table.
 */

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores.");

const shortText = (max: number) => z.string().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

const slideSchema = z.object({
  id,
  kicker: shortText(80),
  title: requiredText(160),
  dek: shortText(280),
  href: requiredText(200),
  image: requiredText(200),
  imageAlt: requiredText(200),
});

const storySchema = z.object({
  id,
  kicker: shortText(80),
  title: requiredText(160),
  dek: shortText(280),
  href: requiredText(200),
});

const factSchema = z.object({
  id,
  label: requiredText(80),
  value: requiredText(120),
});

const tileSchema = z.object({
  id,
  title: requiredText(80),
  dek: shortText(180),
  href: requiredText(200),
  image: requiredText(200),
  imageAlt: requiredText(200),
});

export const carouselSectionSchema = z.object({
  id,
  type: z.literal("carousel"),
  label: shortText(80),
  slides: z.array(slideSchema).min(1).max(8),
});

export const storyGridSectionSchema = z.object({
  id,
  type: z.literal("story-grid"),
  kicker: shortText(80),
  lead: z.object({
    kicker: shortText(80),
    title: requiredText(180),
    dek: shortText(400),
    href: requiredText(200),
    image: requiredText(200),
    imageAlt: requiredText(200),
    byline: shortText(120),
  }),
  stories: z.array(storySchema).min(1).max(6),
});

export const headlineFactsSectionSchema = z.object({
  id,
  type: z.literal("headline-facts"),
  kicker: shortText(80),
  headline: requiredText(220),
  dek: shortText(400),
  facts: z.array(factSchema).min(1).max(8),
});

export const magazineFeatureSectionSchema = z.object({
  id,
  type: z.literal("magazine-feature"),
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortText(400),
  byline: shortText(120),
  href: requiredText(200),
  image: requiredText(200),
  imageAlt: requiredText(200),
});

export const categoryTilesSectionSchema = z.object({
  id,
  type: z.literal("category-tiles"),
  heading: requiredText(120),
  tiles: z.array(tileSchema).min(2).max(8),
});

export const headingBlockSchema = z.object({
  id,
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: requiredText(200),
});

export const paragraphBlockSchema = z.object({
  id,
  type: z.literal("paragraph"),
  text: requiredText(4000),
});

export const pullQuoteBlockSchema = z.object({
  id,
  type: z.literal("pull-quote"),
  quote: requiredText(400),
  attribution: shortText(160),
});

export const figureBlockSchema = z.object({
  id,
  type: z.literal("figure"),
  image: requiredText(200),
  imageAlt: requiredText(200),
  caption: shortText(300),
});

export const listBlockSchema = z.object({
  id,
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(requiredText(300)).min(1).max(12),
});

export const calloutBlockSchema = z.object({
  id,
  type: z.literal("callout"),
  title: requiredText(140),
  text: requiredText(800),
});

export const sectionSchema = z.discriminatedUnion("type", [
  carouselSectionSchema,
  storyGridSectionSchema,
  headlineFactsSectionSchema,
  magazineFeatureSectionSchema,
  categoryTilesSectionSchema,
  headingBlockSchema,
  paragraphBlockSchema,
  pullQuoteBlockSchema,
  figureBlockSchema,
  listBlockSchema,
  calloutBlockSchema,
]);

export const PAGE_SECTION_TYPES = [
  "carousel",
  "story-grid",
  "headline-facts",
  "magazine-feature",
  "category-tiles",
] as const;

export const ARTICLE_SECTION_TYPES = [
  "heading",
  "paragraph",
  "pull-quote",
  "figure",
  "list",
  "callout",
  "headline-facts",
] as const;

export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];
export type ArticleSectionType = (typeof ARTICLE_SECTION_TYPES)[number];
export type SectionType = z.infer<typeof sectionSchema>["type"];

const documentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Document ids are lowercase words separated by hyphens.");

export const documentSchema = z
  .object({
    id: documentId,
    kind: z.enum(["page", "article"]),
    title: requiredText(180),
    slug: documentId,
    dek: shortText(500).default(""),
    kicker: shortText(80).default(""),
    byline: shortText(160).default(""),
    updatedAt: z.string().datetime(),
    sections: z.array(sectionSchema).min(1).max(40),
  })
  .superRefine((doc, ctx) => {
    const allowed: readonly string[] =
      doc.kind === "page" ? PAGE_SECTION_TYPES : ARTICLE_SECTION_TYPES;
    doc.sections.forEach((section, index) => {
      if (!allowed.includes(section.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections", index, "type"],
          message: `Section type "${section.type}" is not prepared for a ${doc.kind}.`,
        });
      }
    });
  });

export type ContentDocument = z.infer<typeof documentSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type CarouselSection = z.infer<typeof carouselSectionSchema>;
export type StoryGridSection = z.infer<typeof storyGridSectionSchema>;
export type HeadlineFactsSection = z.infer<typeof headlineFactsSectionSchema>;
export type MagazineFeatureSection = z.infer<typeof magazineFeatureSectionSchema>;
export type CategoryTilesSection = z.infer<typeof categoryTilesSectionSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type PullQuoteBlock = z.infer<typeof pullQuoteBlockSchema>;
export type FigureBlock = z.infer<typeof figureBlockSchema>;
export type ListBlock = z.infer<typeof listBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;

export const SECTION_LABELS: Record<SectionType, string> = {
  carousel: "Carousel",
  "story-grid": "Story grid",
  "headline-facts": "Headline / facts",
  "magazine-feature": "Magazine feature",
  "category-tiles": "Category tiles",
  heading: "Heading",
  paragraph: "Paragraph",
  "pull-quote": "Pull quote",
  figure: "Figure",
  list: "List",
  callout: "Callout",
};

export function allowedSectionTypes(kind: ContentDocument["kind"]): readonly SectionType[] {
  return kind === "page" ? PAGE_SECTION_TYPES : ARTICLE_SECTION_TYPES;
}
