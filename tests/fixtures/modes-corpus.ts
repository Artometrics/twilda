import { PRESET_IDS, documentSchema, starterDocuments, type TwildaDocument } from "@twilda/core";

/** A string that is valid text for every plain field and full of characters an escaper must handle. */
const T = `<b>'x' & "y"</b>`;

/** A page that holds every section the modes add, with hostile (but schema-valid) text in every field. */
export const HOSTILE_MODES_PAGE: TwildaDocument = documentSchema.parse({
  id: "hostile-modes-page",
  kind: "page",
  title: `Modes <script>alert(1)</script>`,
  slug: "hostile-modes-page",
  kicker: "Kicker",
  dek: "Dek",
  status: "draft",
  updatedAt: "2026-11-15T00:00:00.000Z",
  sections: [
    {
      id: "hero-1",
      type: "hero",
      kicker: T,
      title: `Hero ${T}`,
      dek: `Pitch ${T}`,
      primaryLabel: `Go ${T}`,
      primaryHref: "https://example.com/a?b=1&c=2",
      secondaryLabel: `Mail ${T}`,
      secondaryHref: "mailto:desk@example.com",
      image: "/media/plate-signal.svg",
      imageAlt: `Alt ${T}`,
    },
    {
      id: "features-1",
      type: "feature-grid",
      kicker: T,
      heading: `Features ${T}`,
      intro: `Intro ${T}`,
      items: [
        { id: "f1", label: T, title: `Title ${T}`, text: `Text ${T}` },
        { id: "f2", label: "", title: "Second", text: "" },
      ],
    },
    {
      id: "team-1",
      type: "team",
      kicker: T,
      heading: `Team ${T}`,
      intro: "",
      members: [{ id: "m1", name: `Name ${T}`, role: T, bio: `Bio ${T}\nsecond line`, image: "/media/plate-river.svg", imageAlt: `Alt ${T}` }],
    },
    {
      id: "pricing-1",
      type: "pricing",
      kicker: T,
      heading: `Pricing ${T}`,
      intro: `Intro ${T}`,
      tiers: [
        { id: "t1", name: `Plan ${T}`, price: `$${T}`, period: T, summary: `Summary ${T}`, features: [T, `Feature ${T}`], ctaLabel: `Buy ${T}`, ctaHref: "/#contact", featured: true },
        { id: "t2", name: "Free", price: "$0", period: "", summary: "", features: [], ctaLabel: "", ctaHref: "", featured: false },
      ],
    },
    {
      id: "quotes-1",
      type: "testimonials",
      kicker: T,
      heading: `Quotes ${T}`,
      intro: "",
      items: [{ id: "q1", quote: `Quote ${T}\nnext`, name: `Name ${T}`, role: T }],
    },
    {
      id: "contact-1",
      type: "contact",
      kicker: T,
      heading: `Contact ${T}`,
      intro: `Intro ${T}`,
      channels: [
        { id: "c1", label: `Email ${T}`, value: `desk@example.com ${T}`, href: "mailto:desk@example.com" },
        { id: "c2", label: "Web", value: "example.com", href: "https://example.com/" },
        { id: "c3", label: "Plain", value: T, href: "" },
      ],
      address: `Line ${T}\nLine two`,
    },
    {
      id: "proof-1",
      type: "social-proof",
      kicker: T,
      heading: `Proof ${T}`,
      intro: "",
      stats: [{ id: "s1", value: `9${T}`, label: `Label ${T}` }],
      brands: [T, `Brand ${T}`],
    },
    {
      id: "cta-1",
      type: "cta",
      kicker: T,
      heading: `CTA ${T}`,
      text: `Text ${T}`,
      buttonLabel: `Join ${T}`,
      buttonHref: "https://forms.example.com/join?x=1&y=2",
      asks: [T, `Ask ${T}`],
      note: `Note ${T}`,
    },
    {
      id: "cover-1",
      type: "cover-story",
      kicker: T,
      title: `Cover ${T}`,
      dek: `Dek ${T}`,
      byline: `By ${T}`,
      href: "/articles/x",
      linkLabel: `Read ${T}`,
      image: "/media/plate-map.svg",
      imageAlt: `Alt ${T}`,
    },
    {
      id: "cats-1",
      type: "category-grid",
      kicker: T,
      heading: `Categories ${T}`,
      categories: [{ id: "k1", label: `Cat ${T}`, dek: `Dek ${T}`, href: "/articles/x", count: T }],
    },
    {
      id: "facts-1",
      type: "fast-facts",
      kicker: T,
      heading: `Facts ${T}`,
      facts: [{ id: "x1", value: `1${T}`, label: `Label ${T}` }],
    },
  ],
});

/** An article that holds every block the modes add. */
export const HOSTILE_MODES_ARTICLE: TwildaDocument = documentSchema.parse({
  id: "hostile-modes-article",
  kind: "article",
  title: `Article ${T}`,
  slug: "hostile-modes-article",
  dek: "Dek",
  kicker: "Kicker",
  byline: "Byline",
  status: "draft",
  updatedAt: "2026-11-15T00:00:00.000Z",
  blocks: [
    { id: "ff", type: "fast-facts", title: `Facts ${T}`, facts: [{ id: "a", value: `7${T}`, label: `Label ${T}` }, { id: "b", value: "1", label: "Two" }] },
    { id: "pq", type: "pull-quote", quote: `Quote ${T}\nnext`, attribution: `Who ${T}` },
    { id: "pq2", type: "pull-quote", quote: "Unattributed", attribution: "" },
    {
      id: "bc",
      type: "bar-chart",
      title: `Chart ${T}`,
      alt: `Alt ${T}`,
      unit: T,
      caption: `Caption ${T}`,
      bars: [
        { id: "b1", label: `One ${T}`, value: "40" },
        { id: "b2", label: "Two", value: "12.5" },
        { id: "b3", label: "Zero", value: "0" },
      ],
    },
  ],
});

/** Every starter document of every mode, plus the hostile fixtures. */
export function modesCorpus(): Array<{ name: string; doc: TwildaDocument }> {
  return [
    { name: "hostile-modes-page", doc: HOSTILE_MODES_PAGE },
    { name: "hostile-modes-article", doc: HOSTILE_MODES_ARTICLE },
    ...PRESET_IDS.flatMap((mode) => starterDocuments(mode).map((doc) => ({ name: `starter-${mode}-${doc.id}`, doc }))),
  ];
}
