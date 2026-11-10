import { z } from "zod";

/**
 * Contract v1 content model.
 *
 * Canonical file: UTF-8 JSON, two-space indent, trailing newline.
 * An article is an ordered `blocks` array. A page is an ordered `sections` array.
 * Production static builds read files whose `status` is `published`.
 * Do not add fields or rename types without a note in the PR.
 */

export const CONTRACT_VERSION = 1;

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores.");

const documentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");

const shortText = (max: number) => z.string().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);

/** Site path (`/articles/franchise`) or absolute http(s) URL. */
export const hrefSchema = z
  .string()
  .min(1)
  .max(400)
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    "Use a site path or an http(s) URL.",
  );

export const imageSrcSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (value) =>
      (value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("https://") ||
      value.startsWith("http://") ||
      value.startsWith("data:image/"),
    "Use a site path, an http(s) URL, or a data:image URL.",
  );

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

export const keyFindingsBlockSchema = z.object({
  id,
  type: z.literal("key-findings"),
  title: requiredText(160),
  items: z.array(requiredText(300)).min(1).max(12),
});

export const chartBlockSchema = z.object({
  id,
  type: z.literal("chart"),
  /** Repo path of a CSV, for example content/data/franchise-revenue-mix.csv. */
  dataPath: z
    .string()
    .regex(/^content\/data\/[a-z0-9][a-z0-9._-]*\.csv$/, "Chart data must be a CSV under content/data/."),
  alt: requiredText(300),
  title: requiredText(180),
  caption: shortText(400),
});

export const calloutBlockSchema = z.object({
  id,
  type: z.literal("callout"),
  title: requiredText(140),
  text: requiredText(800),
});

export const sourceItemSchema = z.object({
  id,
  label: requiredText(240),
  href: hrefSchema,
});

export const sourcesBlockSchema = z.object({
  id,
  type: z.literal("sources"),
  title: requiredText(140),
  items: z.array(sourceItemSchema).min(1).max(30),
});

export const imageBlockSchema = z.object({
  id,
  type: z.literal("image"),
  src: imageSrcSchema,
  alt: requiredText(240),
  caption: shortText(300),
  role: z.enum(["banner", "figure"]),
});

export const embedBlockSchema = z.object({
  id,
  type: z.literal("embed"),
  kind: z.enum(["video", "audio"]),
  src: hrefSchema,
  title: requiredText(180),
  caption: shortText(300),
});

export const downloadBlockSchema = z.object({
  id,
  type: z.literal("download"),
  href: hrefSchema,
  label: requiredText(160),
  description: shortText(300),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  keyFindingsBlockSchema,
  chartBlockSchema,
  calloutBlockSchema,
  sourcesBlockSchema,
  imageBlockSchema,
  embedBlockSchema,
  downloadBlockSchema,
]);

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "key-findings",
  "chart",
  "callout",
  "sources",
  "image",
  "embed",
  "download",
] as const;

export const carouselSlideSchema = z.object({
  id,
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortText(280),
  href: hrefSchema,
  image: imageSrcSchema,
  imageAlt: requiredText(200),
});

export const carouselSectionSchema = z.object({
  id,
  type: z.literal("carousel"),
  label: shortText(80),
  slides: z.array(carouselSlideSchema).min(1).max(8),
});

export const storyCardSchema = z.object({
  id,
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortText(280),
  href: hrefSchema,
  image: imageSrcSchema,
  imageAlt: requiredText(200),
});

export const storyGridSectionSchema = z.object({
  id,
  type: z.literal("story-grid"),
  kicker: shortText(80),
  heading: requiredText(160),
  stories: z.array(storyCardSchema).min(1).max(9),
});

export const menuItemSchema = z.object({
  id,
  label: requiredText(80),
  href: hrefSchema,
  dek: shortText(180),
});

export const menuShelfSectionSchema = z.object({
  id,
  type: z.literal("menu-shelf"),
  heading: requiredText(140),
  items: z.array(menuItemSchema).min(1).max(12),
});

export const pageSectionSchema = z.discriminatedUnion("type", [
  carouselSectionSchema,
  storyGridSectionSchema,
  menuShelfSectionSchema,
]);

export const PAGE_SECTION_TYPES = ["carousel", "story-grid", "menu-shelf"] as const;

const articleSchema = z.object({
  id: documentId,
  kind: z.literal("article"),
  title: requiredText(180),
  slug: documentId,
  dek: shortText(500),
  kicker: shortText(80),
  byline: shortText(160),
  status: z.enum(["draft", "published"]),
  updatedAt: z.string().datetime(),
  blocks: z.array(blockSchema).min(1).max(80),
});

const pageSchema = z.object({
  id: documentId,
  kind: z.literal("page"),
  title: requiredText(180),
  slug: documentId,
  dek: shortText(500),
  kicker: shortText(80),
  status: z.enum(["draft", "published"]),
  updatedAt: z.string().datetime(),
  sections: z.array(pageSectionSchema).min(1).max(20),
});

export const documentSchema = z
  .discriminatedUnion("kind", [articleSchema, pageSchema])
  .superRefine((doc, ctx) => {
    if (doc.id !== doc.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slug"],
        message: "slug must match id.",
      });
    }
    const ids = doc.kind === "article" ? doc.blocks.map((block) => block.id) : doc.sections.map((section) => section.id);
    const seen = new Set<string>();
    ids.forEach((entry, index) => {
      if (seen.has(entry)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [doc.kind === "article" ? "blocks" : "sections", index, "id"],
          message: `Duplicate id "${entry}".`,
        });
      }
      seen.add(entry);
    });
  });

export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type KeyFindingsBlock = z.infer<typeof keyFindingsBlockSchema>;
export type ChartBlock = z.infer<typeof chartBlockSchema>;
export type CalloutBlock = z.infer<typeof calloutBlockSchema>;
export type SourcesBlock = z.infer<typeof sourcesBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type EmbedBlock = z.infer<typeof embedBlockSchema>;
export type DownloadBlock = z.infer<typeof downloadBlockSchema>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type CarouselSection = z.infer<typeof carouselSectionSchema>;
export type StoryGridSection = z.infer<typeof storyGridSectionSchema>;
export type MenuShelfSection = z.infer<typeof menuShelfSectionSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;
export type PageSectionType = PageSection["type"];
export type ArticleDocument = z.infer<typeof articleSchema>;
export type PageDocument = z.infer<typeof pageSchema>;
export type TwildaDocument = z.infer<typeof documentSchema>;
export type DocumentStatus = TwildaDocument["status"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  "key-findings": "Key findings",
  chart: "Chart",
  callout: "Callout",
  sources: "Sources",
  image: "Image",
  embed: "Video or audio",
  download: "Download",
};

export const SECTION_LABELS: Record<PageSectionType, string> = {
  carousel: "Carousel",
  "story-grid": "Story grid",
  "menu-shelf": "Menu shelf",
};
