import { BLOCK_CATALOG, SECTION_CATALOG } from "./library";
import { DEFAULT_MODE, PRESET_IDS, isPresetId, type PresetId } from "./modes";
import { DEFAULT_CHROME, type SiteChrome } from "./render";
import { documentSchema, type BlockType, type PageSectionType, type TwildaDocument } from "./schema";
import { DEFAULT_THEME, SITE_VERSION, type SiteSettings, type Theme } from "./site";

export { DEFAULT_MODE, PRESET_IDS, isPresetId };
export type { PresetId };

/**
 * A mode is three things: the library of prepared parts the desk offers, the theme tokens,
 * and the default masthead and footer. It is a starting point, not a lock. A page may hold any
 * prepared section, and the editor can change every token afterwards.
 *
 * Every mode draws from the same schema in `schema.ts`. A mode adds no new kind of freedom.
 */
export interface Preset {
  id: PresetId;
  label: string;
  /** One line for the chooser. */
  tagline: string;
  /** Who it is for. */
  audience: string;
  /** Sections the desk offers when adding to a page, in the order shown. */
  sections: readonly PageSectionType[];
  /** Blocks the desk offers when adding to an article, in the order shown. */
  blocks: readonly BlockType[];
  theme: Theme;
  chrome: SiteChrome;
}

const CORPORATE_THEME: Theme = {
  colors: { paper: "#ffffff", ink: "#0f172a", muted: "#475569", hair: "#e2e8f0", kicker: "#1d4ed8", plate: "#0f2a4a" },
  fonts: { heading: "public-sans", body: "public-sans" },
  baseSize: 17,
  headingScale: 0.85,
  spacing: 1.1,
};

const LEADGEN_THEME: Theme = {
  colors: { paper: "#fff8ee", ink: "#1b1b1f", muted: "#4b4b55", hair: "#eadfce", kicker: "#b93a0b", plate: "#5b1e08" },
  fonts: { heading: "humanist", body: "system-sans" },
  baseSize: 17.5,
  headingScale: 0.9,
  spacing: 1.2,
};

export const PRESETS: Record<PresetId, Preset> = {
  corporate: {
    id: "corporate",
    label: "Corporate",
    tagline: "A company site: hero, features, team, pricing, testimonials, contact.",
    audience: "A business, studio, or product that wants a clear, calm front door.",
    sections: ["hero", "feature-grid", "team", "pricing", "testimonials", "contact", "story-grid", "menu-shelf"],
    blocks: ["heading", "paragraph", "image", "key-findings", "fast-facts", "pull-quote", "callout", "bar-chart", "embed", "download"],
    theme: CORPORATE_THEME,
    chrome: {
      name: "Brightline",
      issueLabel: "",
      note: "",
      nav: [
        { label: "Features", href: "/#features" },
        { label: "Team", href: "/#team" },
        { label: "Pricing", href: "/#pricing" },
        { label: "Contact", href: "/#contact" },
      ],
      colophon: "Brightline is a fictional company. This demo site ships with Twilda CMS so it can be tried without touching a live business.",
    },
  },
  magazine: {
    id: "magazine",
    label: "Magazine",
    tagline: "An editorial site: cover story, articles, fast facts, charts, category grid.",
    audience: "A publication or newsroom that publishes articles and data stories.",
    sections: ["cover-story", "carousel", "story-grid", "fast-facts", "category-grid", "menu-shelf"],
    blocks: ["heading", "paragraph", "key-findings", "fast-facts", "pull-quote", "chart", "bar-chart", "callout", "image", "embed", "download", "sources"],
    theme: DEFAULT_THEME,
    chrome: DEFAULT_CHROME,
  },
  leadgen: {
    id: "leadgen",
    label: "Lead generation",
    tagline: "A landing page: hero, benefits, social proof, and one call to action.",
    audience: "A campaign or offer that exists to get one action from a visitor.",
    sections: ["hero", "feature-grid", "social-proof", "testimonials", "cta", "contact"],
    blocks: ["heading", "paragraph", "image", "fast-facts", "pull-quote", "callout", "download"],
    theme: LEADGEN_THEME,
    chrome: {
      name: "Launchpad",
      issueLabel: "",
      note: "",
      nav: [
        { label: "Benefits", href: "/#benefits" },
        { label: "Results", href: "/#proof" },
        { label: "Get started", href: "/#start" },
      ],
      colophon: "Launchpad is a fictional offer. This demo landing page ships with Twilda CMS so it can be tried without touching a live campaign.",
    },
  },
};

export function getPreset(id: PresetId): Preset {
  return PRESETS[id];
}

/** The mode a site is in. A site with no `mode` is a magazine, as every site was before modes existed. */
export function modeOf(site: Pick<SiteSettings, "mode"> | null | undefined): PresetId {
  return site?.mode ?? DEFAULT_MODE;
}

/**
 * The site with a mode applied: its theme tokens and its default masthead and footer replace
 * the current ones. Per-template and per-document masthead overrides are kept.
 */
export function applyPreset(site: SiteSettings, id: PresetId): SiteSettings {
  const preset = PRESETS[id];
  return { ...site, mode: id, theme: structuredClone(preset.theme), chrome: structuredClone(preset.chrome) };
}

/** A new `content/site.json` for a mode. */
export function starterSite(id: PresetId): SiteSettings {
  return applyPreset({ version: SITE_VERSION, chrome: structuredClone(DEFAULT_CHROME), templates: {}, documents: {}, theme: structuredClone(DEFAULT_THEME) }, id);
}

/** The catalog of sections the desk offers to add in a mode. */
export function sectionCatalogFor(mode: PresetId) {
  const offered = PRESETS[mode].sections;
  return offered.map((type) => SECTION_CATALOG.find((entry) => entry.type === type)).filter((entry): entry is (typeof SECTION_CATALOG)[number] => entry !== undefined);
}

/** The catalog of blocks the desk offers to add in a mode. */
export function blockCatalogFor(mode: PresetId) {
  const offered = PRESETS[mode].blocks;
  return offered.map((type) => BLOCK_CATALOG.find((entry) => entry.type === type)).filter((entry): entry is (typeof BLOCK_CATALOG)[number] => entry !== undefined);
}

/** True when a part of this type is part of the mode's library. Used to say "not in this mode" in the desk. It never blocks rendering. */
export function inLibrary(mode: PresetId, type: string, kind: "page" | "article"): boolean {
  return (kind === "page" ? (PRESETS[mode].sections as readonly string[]) : (PRESETS[mode].blocks as readonly string[])).includes(type);
}

const STAMP = "2026-11-15T00:00:00.000Z";
const PLATE = {
  signal: "/media/plate-signal.svg",
  river: "/media/plate-river.svg",
  map: "/media/plate-map.svg",
  night: "/media/plate-night.svg",
  yard: "/media/plate-yard.svg",
  archive: "/media/plate-archive.svg",
  carriage: "/media/plate-carriage.svg",
} as const;

function doc(value: unknown): TwildaDocument {
  return documentSchema.parse(value);
}

function corporateDocuments(): TwildaDocument[] {
  return [
    doc({
      id: "home",
      kind: "page",
      title: "Brightline: plain tools for small teams",
      slug: "home",
      dek: "Brightline makes planning software for teams of five to fifty.",
      kicker: "Home",
      status: "published",
      updatedAt: STAMP,
      sections: [
        {
          id: "hero",
          type: "hero",
          kicker: "Planning software",
          title: "Plan the week in ten minutes",
          dek: "Brightline turns a pile of requests into a plan your whole team can read on a phone.",
          primaryLabel: "See pricing",
          primaryHref: "/#pricing",
          secondaryLabel: "Talk to us",
          secondaryHref: "/#contact",
          image: PLATE.signal,
          imageAlt: "Geometric plate: three signal lights over a rail",
        },
        {
          id: "features",
          type: "feature-grid",
          kicker: "What you get",
          heading: "Everything a small team needs, nothing it does not",
          intro: "One shared plan, one inbox for requests, and a weekly review that fits in a meeting.",
          items: [
            { id: "f1", label: "01", title: "One shared plan", text: "Everyone sees the same list, in the same order, on any screen." },
            { id: "f2", label: "02", title: "A single inbox", text: "Requests land in one place and are triaged once, not five times." },
            { id: "f3", label: "03", title: "Weekly review", text: "A ten-minute summary of what moved, what stalled, and what is next." },
            { id: "f4", label: "04", title: "Works offline", text: "Open it on a train. Changes sync when the signal returns." },
          ],
        },
        {
          id: "team",
          type: "team",
          kicker: "People",
          heading: "The team behind Brightline",
          intro: "Six people, one office, and a habit of answering email the same day.",
          members: [
            { id: "m1", name: "Priya Raman", role: "Founder and product", bio: "Spent ten years running operations for logistics teams before writing software for them.", image: PLATE.river, imageAlt: "Geometric plate: a river bend" },
            { id: "m2", name: "Tomas Ellery", role: "Engineering", bio: "Builds the sync engine and keeps the app fast on old phones.", image: PLATE.map, imageAlt: "Geometric plate: a folded map" },
            { id: "m3", name: "Dana Okafor", role: "Customer success", bio: "Answers the support inbox and writes the guides customers actually read.", image: PLATE.night, imageAlt: "Geometric plate: a night scene" },
          ],
        },
        {
          id: "pricing",
          type: "pricing",
          kicker: "Pricing",
          heading: "Simple plans, billed monthly",
          intro: "Every plan includes the shared plan, the inbox, and the weekly review.",
          tiers: [
            { id: "t1", name: "Starter", price: "$0", period: "per team", summary: "For a team trying it out.", features: ["Up to 5 people", "One shared plan", "Weekly review email"], ctaLabel: "Start free", ctaHref: "/#contact", featured: false },
            { id: "t2", name: "Team", price: "$12", period: "per person, monthly", summary: "For teams that plan every week.", features: ["Up to 50 people", "Request inbox", "Offline mode", "Priority support"], ctaLabel: "Choose Team", ctaHref: "/#contact", featured: true },
            { id: "t3", name: "Studio", price: "$29", period: "per person, monthly", summary: "For agencies running many clients.", features: ["Unlimited people", "Client views", "Export to CSV"], ctaLabel: "Choose Studio", ctaHref: "/#contact", featured: false },
          ],
        },
        {
          id: "testimonials",
          type: "testimonials",
          kicker: "Customers",
          heading: "What teams say",
          intro: "",
          items: [
            { id: "q1", quote: "We dropped three tools the week we switched. The Monday meeting now takes ten minutes.", name: "Mina Holt", role: "Operations lead, Kettle & Oar" },
            { id: "q2", quote: "It is the first planner my drivers actually open. It works on their phones.", name: "Jorge Salinas", role: "Dispatcher, Northline Freight" },
          ],
        },
        {
          id: "contact",
          type: "contact",
          kicker: "Contact",
          heading: "Talk to a person",
          intro: "We reply within one working day.",
          channels: [
            { id: "c1", label: "Email", value: "hello@brightline.example", href: "mailto:hello@brightline.example" },
            { id: "c2", label: "Support guides", value: "brightline.example/help", href: "https://brightline.example/help" },
          ],
          address: "Brightline Ltd\n12 Canal Row\nLeeds LS1 4AB",
        },
      ],
    }),
    doc({
      id: "launch-notes",
      kind: "article",
      title: "What changed in the March release",
      slug: "launch-notes",
      dek: "Offline mode, a faster inbox, and one thing we removed.",
      kicker: "Product notes",
      byline: "By Tomas Ellery",
      status: "published",
      updatedAt: STAMP,
      blocks: [
        { id: "intro", type: "paragraph", text: "The March release is about two things: working without a signal, and getting requests into the plan faster." },
        { id: "facts", type: "fast-facts", title: "The release in numbers", facts: [{ id: "n1", value: "40%", label: "Faster inbox triage" }, { id: "n2", value: "0", label: "Signal needed to edit" }, { id: "n3", value: "3", label: "Screens removed" }] },
        { id: "h-offline", type: "heading", level: 2, text: "Offline mode" },
        { id: "offline", type: "paragraph", text: "Open the plan on a train, edit it, and close the app. Changes sync the next time your phone finds a connection." },
        { id: "quote", type: "pull-quote", quote: "The best feature is the one you stop noticing.", attribution: "Priya Raman, founder" },
        { id: "note", type: "callout", title: "One removal", text: "We removed the calendar view. Almost nobody used it, and it slowed the app down." },
      ],
    }),
  ];
}

function leadgenDocuments(): TwildaDocument[] {
  return [
    doc({
      id: "home",
      kind: "page",
      title: "Launchpad: get your first ten customers",
      slug: "home",
      dek: "A free two-week program for founders who have a product and no customers yet.",
      kicker: "Home",
      status: "published",
      updatedAt: STAMP,
      sections: [
        {
          id: "hero",
          type: "hero",
          kicker: "Free two-week program",
          title: "Get your first ten customers in fourteen days",
          dek: "A daily email and one short call a week. No slides, no upsell. Starts the first Monday of every month.",
          primaryLabel: "Save my seat",
          primaryHref: "/#start",
          secondaryLabel: "See the results",
          secondaryHref: "/#proof",
          image: PLATE.carriage,
          imageAlt: "Geometric plate: a carriage on a rail",
        },
        {
          id: "benefits",
          type: "feature-grid",
          kicker: "Why it works",
          heading: "Three things you get",
          intro: "",
          items: [
            { id: "b1", label: "Daily", title: "One task a day", text: "A single email each morning with one task that takes under an hour." },
            { id: "b2", label: "Weekly", title: "A short call", text: "Twenty minutes with a founder who has done it, to unstick the week." },
            { id: "b3", label: "Always", title: "A private group", text: "Forty founders at your stage, sharing what worked." },
          ],
        },
        {
          id: "proof",
          type: "social-proof",
          kicker: "Results",
          heading: "What past cohorts did",
          intro: "Numbers from the last four cohorts, self-reported by founders.",
          stats: [
            { id: "s1", value: "312", label: "founders took part" },
            { id: "s2", value: "74%", label: "reached ten customers" },
            { id: "s3", value: "14", label: "days, start to finish" },
          ],
          brands: ["Kettle & Oar", "Northline", "Paper Mile", "Fieldnote", "Harbor Labs"],
        },
        {
          id: "voices",
          type: "testimonials",
          kicker: "In their words",
          heading: "Founders on the program",
          intro: "",
          items: [
            { id: "v1", quote: "I had been stuck for six months. By day nine I had four paying customers.", name: "Amara Neal", role: "Founder, Paper Mile" },
            { id: "v2", quote: "The daily task was small enough that I never skipped a day.", name: "Leo Brandt", role: "Founder, Fieldnote" },
          ],
        },
        {
          id: "start",
          type: "cta",
          kicker: "Next cohort",
          heading: "Save your seat for the next cohort",
          text: "Seats are free and limited to forty. Tell us where to send the first email.",
          buttonLabel: "Join the waitlist",
          buttonHref: "https://forms.example.com/launchpad",
          asks: ["Your name", "Your email", "What you are building"],
          note: "No spam. One email a day for fourteen days, then nothing unless you ask.",
        },
      ],
    }),
    doc({
      id: "case-paper-mile",
      kind: "article",
      title: "How Paper Mile got ten customers in nine days",
      slug: "case-paper-mile",
      dek: "A small stationery subscription, a very short list, and one daily task.",
      kicker: "Case study",
      byline: "By the Launchpad team",
      status: "published",
      updatedAt: STAMP,
      blocks: [
        { id: "intro", type: "paragraph", text: "Amara Neal started the program with a product, a landing page, and no customers." },
        { id: "facts", type: "fast-facts", title: "Paper Mile in nine days", facts: [{ id: "n1", value: "10", label: "Paying customers" }, { id: "n2", value: "9", label: "Days to the tenth" }, { id: "n3", value: "$0", label: "Spent on ads" }] },
        { id: "quote", type: "pull-quote", quote: "I stopped polishing and started asking.", attribution: "Amara Neal" },
        { id: "next", type: "callout", title: "Want the same plan?", text: "The next cohort starts on the first Monday of the month." },
      ],
    }),
  ];
}

function magazineDocuments(): TwildaDocument[] {
  return [
    doc({
      id: "home",
      kind: "page",
      title: "The Ledger: Issue 01",
      slug: "home",
      dek: "A sample magazine about money, cities, and the numbers behind both.",
      kicker: "Issue 01",
      status: "published",
      updatedAt: STAMP,
      sections: [
        {
          id: "cover",
          type: "cover-story",
          kicker: "Cover story",
          title: "The city that stopped printing parking tickets",
          dek: "Eighteen months after Harrow turned off its enforcement cameras, the budget did not collapse. Here is what did change.",
          byline: "By Ines Marlowe",
          href: "/articles/parking-tickets",
          linkLabel: "Read the story",
          image: PLATE.map,
          imageAlt: "Geometric plate: a folded city map",
        },
        {
          id: "numbers",
          type: "fast-facts",
          kicker: "At a glance",
          heading: "Harrow in four numbers",
          facts: [
            { id: "n1", value: "-18%", label: "Downtown car trips" },
            { id: "n2", value: "$2.1M", label: "Ticket revenue lost" },
            { id: "n3", value: "31%", label: "More bus riders" },
            { id: "n4", value: "0", label: "Layoffs" },
          ],
        },
        {
          id: "latest",
          type: "story-grid",
          kicker: "Latest",
          heading: "Also this week",
          stories: [
            { id: "s1", kicker: "Data", title: "Where the rent went", dek: "A decade of rent against wages in six mid-size cities.", href: "/articles/parking-tickets", image: PLATE.river, imageAlt: "Geometric plate: a river" },
            { id: "s2", kicker: "Profile", title: "The last night bus", dek: "Route 9 runs until four. Who rides it?", href: "/articles/parking-tickets", image: PLATE.night, imageAlt: "Geometric plate: a night scene" },
            { id: "s3", kicker: "Field notes", title: "Counting cars by hand", dek: "Why a city hired students with clickers.", href: "/articles/parking-tickets", image: PLATE.yard, imageAlt: "Geometric plate: a rail yard" },
          ],
        },
        {
          id: "categories",
          type: "category-grid",
          kicker: "Sections",
          heading: "Browse by desk",
          categories: [
            { id: "c1", label: "Cities", dek: "Transit, housing, and streets.", href: "/articles/parking-tickets", count: "24 stories" },
            { id: "c2", label: "Money", dek: "Budgets, prices, and wages.", href: "/articles/parking-tickets", count: "18 stories" },
            { id: "c3", label: "Data", dek: "Charts with the working shown.", href: "/articles/parking-tickets", count: "12 stories" },
            { id: "c4", label: "Profiles", dek: "People behind the numbers.", href: "/articles/parking-tickets", count: "9 stories" },
          ],
        },
      ],
    }),
    doc({
      id: "parking-tickets",
      kind: "article",
      title: "The city that stopped printing parking tickets",
      slug: "parking-tickets",
      dek: "Eighteen months after Harrow turned off its enforcement cameras, the budget did not collapse. Here is what did change.",
      kicker: "Cities",
      byline: "By Ines Marlowe",
      status: "published",
      updatedAt: STAMP,
      blocks: [
        { id: "banner", type: "image", src: PLATE.map, alt: "Geometric plate: a folded city map", caption: "Harrow's downtown, redrawn.", role: "banner" },
        { id: "lede", type: "paragraph", text: "When Harrow turned off its enforcement cameras, the finance office predicted a two-million-dollar hole. The hole arrived. The collapse did not." },
        { id: "facts", type: "fast-facts", title: "Fast facts", facts: [{ id: "n1", value: "-18%", label: "Downtown car trips" }, { id: "n2", value: "$2.1M", label: "Ticket revenue lost" }, { id: "n3", value: "31%", label: "More bus riders" }, { id: "n4", value: "0", label: "Layoffs" }] },
        { id: "h-money", type: "heading", level: 2, text: "Where the money went" },
        { id: "money", type: "paragraph", text: "Ticket revenue had been 4 percent of the general fund. The city covered the gap with a small parking-meter increase and a hiring freeze that was already planned." },
        {
          id: "chart",
          type: "bar-chart",
          title: "Downtown trips by mode, after the change",
          alt: "Bars compare the change in trips by car, bus, bike, and on foot.",
          unit: "% change",
          caption: "Source: Harrow transport office, fictional demo data.",
          bars: [
            { id: "b1", label: "Car", value: "18" },
            { id: "b2", label: "Bus", value: "31" },
            { id: "b3", label: "Bike", value: "12" },
            { id: "b4", label: "Foot", value: "9" },
          ],
        },
        { id: "quote", type: "pull-quote", quote: "We expected a hole. We got a different city.", attribution: "Harrow city treasurer, in this demo" },
        { id: "sources", type: "sources", title: "Sources", items: [{ id: "so1", label: "Harrow transport office, annual report (fictional)", href: "https://example.com/harrow-report" }] },
      ],
    }),
  ];
}

/** Starter documents for a mode: a home page and an article, all passing the core schema. Fictional content only. */
export function starterDocuments(id: PresetId): TwildaDocument[] {
  if (id === "corporate") return corporateDocuments();
  if (id === "leadgen") return leadgenDocuments();
  return magazineDocuments();
}
