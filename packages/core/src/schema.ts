import { z } from "./zod";
import { FORM_FIELD_KINDS, FORM_VARIANTS, MAX_FORM_FIELDS } from "./forms";
import { unsafeLinkTargets } from "./marks";
import { isActionHref, isSafeHref, isSitePath, isWebUrl } from "./url";

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

const MARK_LINK_MESSAGE =
  "A link target must be an https:// or http:// address, a mailto: address, or a site path, and link text that is a web address must point to that address.";
const marksOk = (value: string) => unsafeLinkTargets(value).length === 0;
/** Text that may carry `**bold**`, `*italic*`, and `[links](https://...)`. A link with an unsafe target is refused. */
const markText = (max: number) => requiredText(max).refine(marksOk, MARK_LINK_MESSAGE);
const shortMarkText = (max: number) => shortText(max).refine(marksOk, MARK_LINK_MESSAGE);

/** Site path (`/articles/franchise`) or absolute http(s) URL. No whitespace, control characters, backslashes, credentials, or look-alike (punycode) hosts. */
export const hrefSchema = z
  .string()
  .min(1)
  .max(400)
  .refine(isSafeHref, "Use a site path or an http(s) URL with no spaces, backslashes, or look-alike characters.");

/** A button or contact target: a site path, an http(s) address, or a bare `mailto:` address. */
export const actionHrefSchema = z
  .string()
  .min(1)
  .max(400)
  .refine(isActionHref, "Use a site path, an http(s) URL, or a bare mailto: address with no spaces, query, or look-alike characters.");

/** An action target a section may leave empty, which prints no button. */
const optionalActionHref = z.union([z.literal(""), actionHrefSchema]);

/** A number kept as text so the click-to-edit overlay can edit it like any other field: `42`, `3.5`, up to nine digits. */
export const chartValueSchema = z
  .string()
  .regex(/^\d{1,9}(?:\.\d{1,2})?$/, "Use a plain number such as 42 or 3.5.");

export const imageSrcSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (value) => isSitePath(value) || isWebUrl(value) || /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
    "Use a site path, an http(s) URL, or a PNG, JPEG, GIF, WebP, or AVIF data URL.",
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
  text: markText(4000),
});

export const keyFindingsBlockSchema = z.object({
  id,
  type: z.literal("key-findings"),
  title: requiredText(160),
  items: z.array(requiredText(300)).min(1).max(12),
});

const chartDataPath = z
  .string()
  .min(1)
  .max(400)
  .refine(
    (value) =>
      /^content\/data\/[a-z0-9][a-z0-9._-]*\.csv$/.test(value) || isWebUrl(value),
    "Chart data must be a CSV under content/data/ or an http(s) URL.",
  );

export const chartBlockSchema = z.object({
  id,
  type: z.literal("chart"),
  /**
   * CSV under content/data/, or an http(s) URL for a chart that is not a file in the repo.
   * Example: content/data/franchise-revenue-mix.csv
   */
  dataPath: chartDataPath,
  alt: requiredText(300),
  title: requiredText(180),
  caption: shortText(400),
});

export const calloutBlockSchema = z.object({
  id,
  type: z.literal("callout"),
  title: requiredText(140),
  text: markText(800),
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
  caption: shortMarkText(300),
  role: z.enum(["banner", "figure"]),
});

export const embedBlockSchema = z.object({
  id,
  type: z.literal("embed"),
  kind: z.enum(["video", "audio"]),
  src: hrefSchema,
  title: requiredText(180),
  caption: shortMarkText(300),
});

export const downloadBlockSchema = z.object({
  id,
  type: z.literal("download"),
  href: hrefSchema,
  label: requiredText(160),
  description: shortText(300),
});

export const factSchema = z.object({
  id,
  value: requiredText(24),
  label: requiredText(100),
});

export const fastFactsBlockSchema = z.object({
  id,
  type: z.literal("fast-facts"),
  title: requiredText(140),
  facts: z.array(factSchema).min(1).max(6),
});

export const pullQuoteBlockSchema = z.object({
  id,
  type: z.literal("pull-quote"),
  quote: requiredText(400),
  attribution: shortText(120),
});

export const barSchema = z.object({
  id,
  label: requiredText(60),
  value: chartValueSchema,
});

export const barChartBlockSchema = z.object({
  id,
  type: z.literal("bar-chart"),
  title: requiredText(180),
  alt: requiredText(300),
  unit: shortText(24),
  caption: shortText(400),
  bars: z.array(barSchema).min(2).max(12),
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
  fastFactsBlockSchema,
  pullQuoteBlockSchema,
  barChartBlockSchema,
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
  "fast-facts",
  "pull-quote",
  "bar-chart",
] as const;

export const carouselSlideSchema = z.object({
  id,
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortMarkText(280),
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
  dek: shortMarkText(280),
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

/** Fields every preset section opens with. */
const intro = {
  kicker: shortText(80),
  heading: requiredText(160),
  intro: shortMarkText(400),
};

export const heroSectionSchema = z.object({
  id,
  type: z.literal("hero"),
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortMarkText(400),
  primaryLabel: shortText(60),
  primaryHref: optionalActionHref,
  secondaryLabel: shortText(60),
  secondaryHref: optionalActionHref,
  image: imageSrcSchema,
  imageAlt: requiredText(200),
});

export const featureItemSchema = z.object({
  id,
  label: shortText(40),
  title: requiredText(120),
  text: shortMarkText(400),
});

export const featureGridSectionSchema = z.object({
  id,
  type: z.literal("feature-grid"),
  ...intro,
  items: z.array(featureItemSchema).min(1).max(12),
});

export const teamMemberSchema = z.object({
  id,
  name: requiredText(80),
  role: shortText(80),
  bio: shortText(300),
  image: imageSrcSchema,
  imageAlt: requiredText(200),
});

export const teamSectionSchema = z.object({
  id,
  type: z.literal("team"),
  ...intro,
  members: z.array(teamMemberSchema).min(1).max(12),
});

export const pricingTierSchema = z.object({
  id,
  name: requiredText(60),
  price: requiredText(40),
  period: shortText(40),
  summary: shortText(200),
  features: z.array(requiredText(120)).max(10),
  ctaLabel: shortText(60),
  ctaHref: optionalActionHref,
  featured: z.boolean(),
});

export const pricingSectionSchema = z.object({
  id,
  type: z.literal("pricing"),
  ...intro,
  tiers: z.array(pricingTierSchema).min(1).max(4),
});

export const testimonialSchema = z.object({
  id,
  quote: requiredText(500),
  name: requiredText(80),
  role: shortText(80),
});

export const testimonialsSectionSchema = z.object({
  id,
  type: z.literal("testimonials"),
  ...intro,
  items: z.array(testimonialSchema).min(1).max(6),
});

export const contactChannelSchema = z.object({
  id,
  label: requiredText(60),
  value: requiredText(160),
  href: optionalActionHref,
});

export const contactSectionSchema = z.object({
  id,
  type: z.literal("contact"),
  ...intro,
  channels: z.array(contactChannelSchema).min(1).max(6),
  address: shortText(300),
});

export const statSchema = z.object({
  id,
  value: requiredText(24),
  label: requiredText(80),
});

export const socialProofSectionSchema = z.object({
  id,
  type: z.literal("social-proof"),
  ...intro,
  stats: z.array(statSchema).max(4),
  brands: z.array(requiredText(60)).max(10),
});

export const ctaSectionSchema = z.object({
  id,
  type: z.literal("cta"),
  kicker: shortText(80),
  heading: requiredText(160),
  text: shortMarkText(400),
  buttonLabel: requiredText(60),
  buttonHref: actionHrefSchema,
  asks: z.array(requiredText(40)).max(4),
  note: shortText(200),
});

export const coverStorySectionSchema = z.object({
  id,
  type: z.literal("cover-story"),
  kicker: shortText(80),
  title: requiredText(180),
  dek: shortMarkText(400),
  byline: shortText(160),
  href: hrefSchema,
  linkLabel: shortText(40),
  image: imageSrcSchema,
  imageAlt: requiredText(200),
});

export const categorySchema = z.object({
  id,
  label: requiredText(60),
  dek: shortText(160),
  href: hrefSchema,
  count: shortText(24),
});

export const categoryGridSectionSchema = z.object({
  id,
  type: z.literal("category-grid"),
  kicker: shortText(80),
  heading: requiredText(160),
  categories: z.array(categorySchema).min(1).max(12),
});

export const fastFactsSectionSchema = z.object({
  id,
  type: z.literal("fast-facts"),
  kicker: shortText(80),
  heading: requiredText(160),
  facts: z.array(factSchema).min(1).max(8),
});

export const formFieldSchema = z.object({
  id,
  kind: z.enum(FORM_FIELD_KINDS),
  label: requiredText(80),
  required: z.boolean(),
  hint: shortText(120),
});

/**
 * A form on a page. Which field kinds exist and how a value is checked is fixed in `forms.ts`; the
 * author chooses a variant, relabels, reorders, adds, and removes fields. Where the submission goes is
 * the site-wide `forms.endpoint` in `site.json`, never a field of the section.
 */
export const formSectionSchema = z.object({
  id,
  type: z.literal("form"),
  ...intro,
  variant: z.enum(FORM_VARIANTS),
  fields: z.array(formFieldSchema).min(1).max(MAX_FORM_FIELDS),
  submitLabel: requiredText(40),
  successTitle: requiredText(80),
  successText: shortText(300),
  errorText: requiredText(200),
  privacy: shortMarkText(300),
});

/** Rules across a form's fields that a single field cannot state. Run by the document schema (a discriminated union cannot hold a refined object). */
function formIssues(section: z.infer<typeof formSectionSchema>, path: Array<string | number>, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  section.fields.forEach((field, index) => {
    if (seen.has(field.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, "fields", index, "id"], message: `Duplicate id "${field.id}".` });
    seen.add(field.id);
  });
  // A lead nobody can answer is not a lead: one required field has to be a way to reach the person.
  if (!section.fields.some((field) => field.required && (field.kind === "email" || field.kind === "phone"))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, "fields"], message: "Include a required email or phone field so a submission can be answered." });
  }
}

export const pageSectionSchema = z.discriminatedUnion("type", [
  carouselSectionSchema,
  storyGridSectionSchema,
  menuShelfSectionSchema,
  heroSectionSchema,
  featureGridSectionSchema,
  teamSectionSchema,
  pricingSectionSchema,
  testimonialsSectionSchema,
  contactSectionSchema,
  socialProofSectionSchema,
  ctaSectionSchema,
  coverStorySectionSchema,
  categoryGridSectionSchema,
  fastFactsSectionSchema,
  formSectionSchema,
]);

export const PAGE_SECTION_TYPES = [
  "carousel",
  "story-grid",
  "menu-shelf",
  "hero",
  "feature-grid",
  "team",
  "pricing",
  "testimonials",
  "contact",
  "social-proof",
  "cta",
  "cover-story",
  "category-grid",
  "fast-facts",
  "form",
] as const;

const articleSchema = z.object({
  id: documentId,
  kind: z.literal("article"),
  title: requiredText(180),
  slug: documentId,
  dek: shortMarkText(500),
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
  dek: shortMarkText(500),
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
    if (doc.kind === "page") {
      doc.sections.forEach((section, index) => {
        if (section.type === "form") formIssues(section, ["sections", index], ctx);
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
export type FastFactsBlock = z.infer<typeof fastFactsBlockSchema>;
export type PullQuoteBlock = z.infer<typeof pullQuoteBlockSchema>;
export type BarChartBlock = z.infer<typeof barChartBlockSchema>;
export type HeroSection = z.infer<typeof heroSectionSchema>;
export type FeatureGridSection = z.infer<typeof featureGridSectionSchema>;
export type TeamSection = z.infer<typeof teamSectionSchema>;
export type PricingSection = z.infer<typeof pricingSectionSchema>;
export type TestimonialsSection = z.infer<typeof testimonialsSectionSchema>;
export type ContactSection = z.infer<typeof contactSectionSchema>;
export type SocialProofSection = z.infer<typeof socialProofSectionSchema>;
export type CtaSection = z.infer<typeof ctaSectionSchema>;
export type CoverStorySection = z.infer<typeof coverStorySectionSchema>;
export type CategoryGridSection = z.infer<typeof categoryGridSectionSchema>;
export type FastFactsSection = z.infer<typeof fastFactsSectionSchema>;
export type FormSection = z.infer<typeof formSectionSchema>;
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
  "fast-facts": "Fast facts",
  "pull-quote": "Pull quote",
  "bar-chart": "Bar chart",
};

export const SECTION_LABELS: Record<PageSectionType, string> = {
  carousel: "Carousel",
  "story-grid": "Story grid",
  "menu-shelf": "Menu shelf",
  hero: "Hero",
  "feature-grid": "Features",
  team: "Team",
  pricing: "Pricing",
  testimonials: "Testimonials",
  contact: "Contact",
  "social-proof": "Social proof",
  cta: "Call to action",
  "cover-story": "Cover story",
  "category-grid": "Category grid",
  "fast-facts": "Fast facts",
  form: "Form",
};
