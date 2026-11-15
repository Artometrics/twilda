import { FORM_FIELD_KINDS, FORM_FIELD_KIND_LABELS, FORM_VARIANTS, FORM_VARIANT_LABELS, MAX_FORM_FIELDS } from "./forms";

/**
 * The fields of the mode sections and blocks, described once so the desk's forms and the
 * dev editor's inspector can render an editor for any of them, and so tests can check that
 * every string the schema accepts has a place to be edited. Existing parts (carousel, story
 * grid, and the original article blocks) keep their own hand-written forms.
 *
 * This describes fields. It does not validate: the schema in `schema.ts` is the only judge.
 */

/** `lines` is a list of short strings edited one per line. `choice` is one of a fixed list (`options`). */
export type FieldKind = "text" | "multiline" | "href" | "path" | "boolean" | "lines" | "choice";

export type FieldValue = string | boolean | string[];

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  /** For `choice`: the allowed values and how to show each. */
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface ListSpec {
  /** The array's key on the part. */
  key: string;
  label: string;
  itemLabel: string;
  /** Prefix for new item ids. */
  idPrefix: string;
  min: number;
  max: number;
  /** Fields of each item. Omitted when the list is plain strings. */
  fields?: FieldSpec[];
  /** Label for the single field when the list is plain strings. */
  stringLabel?: string;
  /** Values a new item starts with. */
  blank: Record<string, FieldValue>;
}

export interface PartFieldSpec {
  fields: FieldSpec[];
  lists: ListSpec[];
}

const variantOptions = FORM_VARIANTS.map((value) => ({ value, label: FORM_VARIANT_LABELS[value] }));
const fieldKindOptions = FORM_FIELD_KINDS.map((value) => ({ value, label: FORM_FIELD_KIND_LABELS[value] }));

const intro: FieldSpec[] = [
  { key: "kicker", label: "Kicker", kind: "text" },
  { key: "heading", label: "Heading", kind: "text" },
  { key: "intro", label: "Intro line", kind: "multiline" },
];

const facts: ListSpec = {
  key: "facts",
  label: "Facts",
  itemLabel: "fact",
  idPrefix: "fact",
  min: 1,
  max: 8,
  fields: [
    { key: "value", label: "Big number", kind: "text" },
    { key: "label", label: "What it counts", kind: "text" },
  ],
  blank: { value: "0", label: "What it counts" },
};

export const PART_FIELDS: {
  sections: Record<string, PartFieldSpec>;
  blocks: Record<string, PartFieldSpec>;
} = {
  sections: {
    hero: {
      fields: [
        { key: "kicker", label: "Kicker", kind: "text" },
        { key: "title", label: "Headline", kind: "text" },
        { key: "dek", label: "Pitch", kind: "multiline" },
        { key: "primaryLabel", label: "Main button label", kind: "text" },
        { key: "primaryHref", label: "Main button link", kind: "href" },
        { key: "secondaryLabel", label: "Second button label", kind: "text" },
        { key: "secondaryHref", label: "Second button link", kind: "href" },
        { key: "image", label: "Plate (/media/name.svg)", kind: "path" },
        { key: "imageAlt", label: "Plate alt text", kind: "text" },
      ],
      lists: [],
    },
    "feature-grid": {
      fields: intro,
      lists: [
        {
          key: "items",
          label: "Cards",
          itemLabel: "card",
          idPrefix: "feature",
          min: 1,
          max: 12,
          fields: [
            { key: "label", label: "Small label", kind: "text" },
            { key: "title", label: "Title", kind: "text" },
            { key: "text", label: "Line", kind: "multiline" },
          ],
          blank: { label: "", title: "New card", text: "One line on what it does for the reader." },
        },
      ],
    },
    team: {
      fields: intro,
      lists: [
        {
          key: "members",
          label: "People",
          itemLabel: "person",
          idPrefix: "member",
          min: 1,
          max: 12,
          fields: [
            { key: "name", label: "Name", kind: "text" },
            { key: "role", label: "Role", kind: "text" },
            { key: "bio", label: "Line about them", kind: "multiline" },
            { key: "image", label: "Plate (/media/name.svg)", kind: "path" },
            { key: "imageAlt", label: "Plate alt text", kind: "text" },
          ],
          blank: { name: "Name Surname", role: "Role", bio: "", image: "/media/plate-signal.svg", imageAlt: "Geometric plate" },
        },
      ],
    },
    pricing: {
      fields: intro,
      lists: [
        {
          key: "tiers",
          label: "Plans",
          itemLabel: "plan",
          idPrefix: "tier",
          min: 1,
          max: 4,
          fields: [
            { key: "name", label: "Plan name", kind: "text" },
            { key: "price", label: "Price", kind: "text" },
            { key: "period", label: "Per", kind: "text" },
            { key: "summary", label: "Who it is for", kind: "multiline" },
            { key: "ctaLabel", label: "Button label", kind: "text" },
            { key: "ctaHref", label: "Button link", kind: "href" },
            { key: "features", label: "Features (one per line)", kind: "lines" },
            { key: "featured", label: "Recommended plan", kind: "boolean" },
          ],
          blank: { name: "New plan", price: "$0", period: "per month", summary: "", ctaLabel: "Choose", ctaHref: "/", features: [], featured: false },
        },
      ],
    },
    testimonials: {
      fields: intro,
      lists: [
        {
          key: "items",
          label: "Quotes",
          itemLabel: "quote",
          idPrefix: "quote",
          min: 1,
          max: 6,
          fields: [
            { key: "quote", label: "Quote", kind: "multiline" },
            { key: "name", label: "Name", kind: "text" },
            { key: "role", label: "Role and company", kind: "text" },
          ],
          blank: { quote: "A short quote from a real customer.", name: "Name Surname", role: "" },
        },
      ],
    },
    contact: {
      fields: [...intro, { key: "address", label: "Address", kind: "multiline" }],
      lists: [
        {
          key: "channels",
          label: "Ways to reach you",
          itemLabel: "channel",
          idPrefix: "channel",
          min: 1,
          max: 6,
          fields: [
            { key: "label", label: "Label", kind: "text" },
            { key: "value", label: "Shown text", kind: "text" },
            { key: "href", label: "Link (mailto:, https://, or a site path)", kind: "href" },
          ],
          blank: { label: "Email", value: "hello@example.com", href: "mailto:hello@example.com" },
        },
      ],
    },
    "social-proof": {
      fields: intro,
      lists: [
        {
          key: "stats",
          label: "Numbers",
          itemLabel: "number",
          idPrefix: "stat",
          min: 0,
          max: 4,
          fields: [
            { key: "value", label: "Big number", kind: "text" },
            { key: "label", label: "What it counts", kind: "text" },
          ],
          blank: { value: "100+", label: "customers" },
        },
        { key: "brands", label: "Names that trust you", itemLabel: "name", idPrefix: "brand", min: 0, max: 10, stringLabel: "Name", blank: {} },
      ],
    },
    cta: {
      fields: [
        { key: "kicker", label: "Kicker", kind: "text" },
        { key: "heading", label: "Heading", kind: "text" },
        { key: "text", label: "Text", kind: "multiline" },
        { key: "buttonLabel", label: "Button label", kind: "text" },
        { key: "buttonHref", label: "Button link (your form's address)", kind: "href" },
        { key: "note", label: "Small print", kind: "text" },
      ],
      lists: [{ key: "asks", label: "What the form asks", itemLabel: "question", idPrefix: "ask", min: 0, max: 4, stringLabel: "Question", blank: {} }],
    },
    "cover-story": {
      fields: [
        { key: "kicker", label: "Kicker", kind: "text" },
        { key: "title", label: "Headline", kind: "text" },
        { key: "dek", label: "Dek", kind: "multiline" },
        { key: "byline", label: "Byline", kind: "text" },
        { key: "href", label: "Story link", kind: "href" },
        { key: "linkLabel", label: "Link label", kind: "text" },
        { key: "image", label: "Plate (/media/name.svg)", kind: "path" },
        { key: "imageAlt", label: "Plate alt text", kind: "text" },
      ],
      lists: [],
    },
    "category-grid": {
      fields: [
        { key: "kicker", label: "Kicker", kind: "text" },
        { key: "heading", label: "Heading", kind: "text" },
      ],
      lists: [
        {
          key: "categories",
          label: "Categories",
          itemLabel: "category",
          idPrefix: "category",
          min: 1,
          max: 12,
          fields: [
            { key: "label", label: "Name", kind: "text" },
            { key: "dek", label: "What it covers", kind: "text" },
            { key: "href", label: "Link", kind: "href" },
            { key: "count", label: "Count label (for example 12 stories)", kind: "text" },
          ],
          blank: { label: "New desk", dek: "", href: "/", count: "" },
        },
      ],
    },
    "fast-facts": {
      fields: [
        { key: "kicker", label: "Kicker", kind: "text" },
        { key: "heading", label: "Heading", kind: "text" },
      ],
      lists: [facts],
    },
    form: {
      fields: [
        ...intro,
        { key: "variant", label: "Kind of form", kind: "choice", options: variantOptions },
        { key: "submitLabel", label: "Send button label", kind: "text" },
        { key: "successTitle", label: "After sending: title", kind: "text" },
        { key: "successText", label: "After sending: message", kind: "multiline" },
        { key: "errorText", label: "If it fails: message", kind: "multiline" },
        { key: "privacy", label: "Small print under the form", kind: "multiline" },
      ],
      lists: [
        {
          key: "fields",
          label: "Fields",
          itemLabel: "field",
          idPrefix: "field",
          min: 1,
          max: MAX_FORM_FIELDS,
          fields: [
            { key: "kind", label: "Kind of field", kind: "choice", options: fieldKindOptions },
            { key: "label", label: "Label", kind: "text" },
            { key: "hint", label: "Hint under the label", kind: "text" },
            { key: "required", label: "Required", kind: "boolean" },
          ],
          blank: { kind: "text", label: "Another question", hint: "", required: false },
        },
      ],
    },
  },
  blocks: {
    "fast-facts": {
      fields: [{ key: "title", label: "Title", kind: "text" }],
      lists: [{ ...facts, max: 6 }],
    },
    "pull-quote": {
      fields: [
        { key: "quote", label: "Quote", kind: "multiline" },
        { key: "attribution", label: "Who said it", kind: "text" },
      ],
      lists: [],
    },
    "bar-chart": {
      fields: [
        { key: "title", label: "Title", kind: "text" },
        { key: "alt", label: "Alt text (what the bars show)", kind: "multiline" },
        { key: "unit", label: "Unit (for example %)", kind: "text" },
        { key: "caption", label: "Caption and source line", kind: "multiline" },
      ],
      lists: [
        {
          key: "bars",
          label: "Bars",
          itemLabel: "bar",
          idPrefix: "bar",
          min: 2,
          max: 12,
          fields: [
            { key: "label", label: "Label", kind: "text" },
            { key: "value", label: "Number", kind: "text" },
          ],
          blank: { label: "New bar", value: "10" },
        },
      ],
    },
  },
};

/** The new item for a list: its blank values, or an empty string for a plain-string list. */
export function blankItem(list: ListSpec, id: string): Record<string, FieldValue> | string {
  if (list.stringLabel) return "";
  return { id, ...list.blank };
}
