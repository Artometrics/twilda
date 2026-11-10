import { seedDemoState, type DemoState } from "./demo-backend";
import type { ArticleDocument, PageDocument, TwildaDocument } from "./schema";

/**
 * Sample desk seeded from public Artometrics titles and a few published figures.
 * Bodies are short fixtures, not the live articles. Figures below were read from
 * the public pages on 2026-11-10 and can go stale while those articles are rewritten.
 * Banner images are original demo plates, not Artometrics art.
 */

export const FRANCHISE_CSV = `stream,share_percent
Merchandise licensing and retail,55.8
Box office,18.3
Games,17.9
`;

const PLATE = "/media/plate-franchise.svg";
const PLATE_ALT = "Original geometric demo plate. Not the Artometrics banner.";

const franchisePublished: ArticleDocument = {
  id: "franchise",
  kind: "article",
  title: "Franchise: Merchandise Owns the Ledger",
  slug: "franchise",
  dek: "140 franchises on the October 2026 Wikipedia ledger sum to $1.45T lifetime revenue. Merchandise is 55.8%.",
  kicker: "Franchise",
  byline: "Kyle McAuliffe",
  status: "published",
  updatedAt: "2026-04-08T00:00:00.000Z",
  blocks: [
    {
      id: "banner",
      type: "image",
      src: PLATE,
      alt: "Demo banner plate for the Franchise fixture. Not the live Artometrics banner.",
      caption: "Fixture plate. The public article's banner was not copied.",
      role: "banner",
    },
    {
      id: "findings",
      type: "key-findings",
      title: "Published figures",
      items: [
        "$1,448.1B lifetime revenue, 140 franchises (Wikipedia, Oct 12 2026, S017)",
        "55.8% merchandise, licensing and retail",
        "$130.7B Pokémon",
        "94.4% franchise share of 2025's worldwide top-ten box office",
      ],
    },
    {
      id: "h-ledger",
      type: "heading",
      level: 2,
      text: "One ledger",
    },
    {
      id: "p-ledger",
      type: "paragraph",
      text: "The public report reads Wikipedia's highest-grossing media franchises list as a ledger of revenue streams. This fixture keeps the section order and the headline figures. It does not reproduce the article.",
    },
    {
      id: "h-question",
      type: "heading",
      level: 2,
      text: "Research question",
    },
    {
      id: "p-question",
      type: "paragraph",
      text: "How much of the October 2026 ledger sits in merchandise versus box office and games, and how do origin and ownership change that mix?",
    },
    {
      id: "chart-mix",
      type: "chart",
      dataPath: "content/data/franchise-revenue-mix.csv",
      alt: "Bar comparison of merchandise, box office, and games as shares of the October 2026 franchise ledger.",
      title: "Revenue mix",
      caption: "Static table of the published shares. The live page's Plotly chart is not in this file.",
    },
    {
      id: "method",
      type: "callout",
      title: "Data and method",
      text: "Primary ledger cited on the public page: Wikipedia's list, revision 1379832186 (October 12, 2026). Ranges and cleaning rules stay in the Artometrics article.",
    },
    {
      id: "sources",
      type: "sources",
      title: "Sources",
      items: [
        {
          id: "s-wiki",
          label: "Wikipedia. List of highest-grossing media franchises.",
          href: "https://en.wikipedia.org/wiki/List_of_highest-grossing_media_franchises",
        },
        {
          id: "s-tidy",
          label: "TidyTuesday 2019-07-02 media franchise revenues.",
          href: "https://github.com/rfordatascience/tidytuesday",
        },
      ],
    },
    {
      id: "audio",
      type: "embed",
      kind: "audio",
      src: "https://artometrics.com/franchise",
      title: "Audio on the public Franchise article",
      caption: "The audio file was not copied. This block points at the public page.",
    },
    {
      id: "csv",
      type: "download",
      href: "/data/franchise-revenue-mix.csv",
      label: "Revenue mix CSV",
      description: "Three published shares used by the chart block.",
    },
  ],
};

const franchiseDraft: ArticleDocument = {
  ...franchisePublished,
  status: "draft",
  updatedAt: "2026-11-10T06:00:00.000Z",
  blocks: [
    ...franchisePublished.blocks,
    {
      id: "demo-draft-note",
      type: "callout",
      title: "Demo draft note",
      text: "Saved on the draft branch only. Publishing is a separate step, and this note is not in the published fixture.",
    },
  ],
};

const pixar: ArticleDocument = {
  id: "pixar",
  kind: "article",
  title: "Pixar: Pixar's Critic Scores Broke Only Twice—Cars 2 and Lightyear",
  slug: "pixar",
  dek: "Pixar's median Rotten Tomatoes score is 96%, but Cars 2 hit 40% and Lightyear stalled the streak—data from 24 rated theatrical features.",
  kicker: "Pixar",
  byline: "Kyle McAuliffe",
  status: "published",
  updatedAt: "2026-06-15T00:00:00.000Z",
  blocks: [
    {
      id: "findings",
      type: "key-findings",
      title: "Published figures",
      items: ["96% median Rotten Tomatoes score", "40% for Cars 2", "+17 minutes median runtime from the early era to 2017–present", "0 PG-13 ratings in the theatrical set"],
    },
    {
      id: "p-lede",
      type: "paragraph",
      text: "Public page summary, not the full Pixar article. The live report joins TidyTuesday Pixar films data with reception scores. Charts on that page are Plotly and are not embedded here.",
    },
    {
      id: "sources",
      type: "sources",
      title: "Sources",
      items: [
        {
          id: "s-tt",
          label: "TidyTuesday: Pixar Films (2025-03-11).",
          href: "https://github.com/rfordatascience/tidytuesday",
        },
      ],
    },
  ],
};

const anime: ArticleDocument = {
  id: "anime",
  kind: "article",
  title: "Anime: Source Sets the Audience Floor",
  slug: "anime",
  dek: "On the October 2026 MyAnimeList ledger, light-novel TV adaptations still draw 27.5 times the median audience of originals.",
  kicker: "Anime",
  byline: "Artometrics",
  status: "published",
  updatedAt: "2026-03-31T00:00:00.000Z",
  blocks: [
    {
      id: "findings",
      type: "key-findings",
      title: "Published figures",
      items: ["27.5× median members, light-novel TV versus original TV"],
    },
    {
      id: "p-lede",
      type: "paragraph",
      text: "Title, dek, and the 27.5× figure are from the public page fetched 2026-11-10. A byline was not in that extract, so this fixture uses Artometrics. The article body was not copied.",
    },
    {
      id: "sources",
      type: "sources",
      title: "Sources",
      items: [
        {
          id: "s-page",
          label: "Artometrics public article: Anime.",
          href: "https://artometrics.com/anime",
        },
      ],
    },
  ],
};

const dodgers: ArticleDocument = {
  id: "dodgers",
  kind: "article",
  title: "Dodgers: 111 Wins Still Wasn't Enough",
  slug: "dodgers",
  dek: "Twelve straight playoff trips, eight championships, and 32 years between rings reveal how payroll and depth buy access—but not closure.",
  kicker: "Dodgers",
  byline: "Artometrics",
  status: "published",
  updatedAt: "2026-07-01T00:00:00.000Z",
  blocks: [
    {
      id: "findings",
      type: "key-findings",
      title: "Published figures",
      items: ["111 regular-season wins in 2022", "12 straight postseason appearances from 2013 through 2024", "8 World Series championships", "32 years between the 1988 and 2020 titles"],
    },
    {
      id: "p-lede",
      type: "paragraph",
      text: "Figures and the dek are from the public Dodgers page fetched 2026-11-10. updatedAt is the sitemap lastmod (2026-07-01), not a byline date. The article body was not copied. A byline was not in that extract.",
    },
    {
      id: "sources",
      type: "sources",
      title: "Sources",
      items: [
        {
          id: "s-page",
          label: "Artometrics public article: Dodgers.",
          href: "https://artometrics.com/dodgers",
        },
      ],
    },
  ],
};

const simpsons: ArticleDocument = {
  id: "simpsons",
  kind: "article",
  title: "Marcia Wallace, 175 Guest Appearances",
  slug: "simpsons",
  dek: "Homepage card on artometrics.com. The article page was not fetched for this fixture.",
  kicker: "Simpsons",
  byline: "Artometrics",
  status: "published",
  updatedAt: "2026-06-15T00:00:00.000Z",
  blocks: [
    {
      id: "p-card",
      type: "paragraph",
      text: "The homepage card read Simpsons / Marcia Wallace, 175 Guest Appearances when fetched on 2026-11-10. Sitemap lastmod for /simpsons was 2026-06-15. Body, byline, and charts were not copied.",
    },
    {
      id: "sources",
      type: "sources",
      title: "Sources",
      items: [
        {
          id: "s-home",
          label: "Artometrics homepage card.",
          href: "https://artometrics.com/",
        },
      ],
    },
  ],
};

function slide(id: string, doc: ArticleDocument, href: string) {
  return {
    id,
    kicker: doc.kicker,
    title: doc.title,
    dek: doc.dek.slice(0, 280),
    href,
    image: PLATE,
    imageAlt: PLATE_ALT,
  };
}

const home: PageDocument = {
  id: "home",
  kind: "page",
  title: "Artometrics",
  slug: "home",
  dek: "Sample homepage for the Twilda demo. Section order is editable. This is not the live site.",
  kicker: "Desk",
  status: "published",
  updatedAt: "2026-11-10T00:00:00.000Z",
  sections: [
    {
      id: "lead-carousel",
      type: "carousel",
      label: "Five stories",
      slides: [
        slide("s-franchise", franchisePublished, "/articles/franchise"),
        slide("s-pixar", pixar, "/articles/pixar"),
        slide("s-anime", anime, "/articles/anime"),
        slide("s-dodgers", dodgers, "/articles/dodgers"),
        slide("s-simpsons", simpsons, "/articles/simpsons"),
      ],
    },
    {
      id: "square-grid",
      type: "story-grid",
      kicker: "Arts and sports",
      heading: "Square story grid",
      stories: [franchisePublished, pixar, anime, dodgers].map((doc) => ({
        id: `g-${doc.id}`,
        kicker: doc.kicker,
        title: doc.title,
        dek: doc.dek.slice(0, 180),
        href: `/articles/${doc.slug}`,
        image: PLATE,
        imageAlt: PLATE_ALT,
      })),
    },
    {
      id: "shelf",
      type: "menu-shelf",
      heading: "Menu",
      items: [
        { id: "m-arts", label: "Arts", href: "/topics/arts", dek: "Franchise, Pixar, Anime" },
        { id: "m-sports", label: "Sports", href: "/topics/sports", dek: "Dodgers" },
        { id: "m-science", label: "Science", href: "https://artometrics.com/topics/science", dek: "Public topic. Not built in this demo." },
        { id: "m-culture", label: "Culture", href: "https://artometrics.com/topics/culture", dek: "Public topic. Not built in this demo." },
        { id: "m-humanities", label: "Humanities", href: "https://artometrics.com/topics/humanities", dek: "Public topic. Not built in this demo." },
        { id: "m-civics", label: "Civics", href: "https://artometrics.com/topics/civics", dek: "Public topic. Not built in this demo." },
      ],
    },
  ],
};

const arts: PageDocument = {
  id: "arts",
  kind: "page",
  title: "Arts",
  slug: "arts",
  dek: "Category page for the demo. Three public Arts titles.",
  kicker: "Topic",
  status: "published",
  updatedAt: "2026-11-10T00:00:00.000Z",
  sections: [
    {
      id: "arts-grid",
      type: "story-grid",
      kicker: "Arts",
      heading: "In this category",
      stories: [franchisePublished, pixar, anime].map((doc) => ({
        id: `a-${doc.id}`,
        kicker: doc.kicker,
        title: doc.title,
        dek: doc.dek.slice(0, 180),
        href: `/articles/${doc.slug}`,
        image: PLATE,
        imageAlt: PLATE_ALT,
      })),
    },
  ],
};

const sports: PageDocument = {
  id: "sports",
  kind: "page",
  title: "Sports",
  slug: "sports",
  dek: "Category page for the demo. One public Sports title.",
  kicker: "Topic",
  status: "published",
  updatedAt: "2026-11-10T00:00:00.000Z",
  sections: [
    {
      id: "sports-grid",
      type: "story-grid",
      kicker: "Sports",
      heading: "In this category",
      stories: [
        {
          id: "a-dodgers",
          kicker: dodgers.kicker,
          title: dodgers.title,
          dek: dodgers.dek.slice(0, 180),
          href: "/articles/dodgers",
          image: PLATE,
          imageAlt: PLATE_ALT,
        },
      ],
    },
  ],
};

export const sampleArticles = {
  franchise: franchisePublished,
  pixar,
  anime,
  dodgers,
  simpsons,
};

export const sampleDrafts = {
  franchise: franchiseDraft,
};

export const samplePages = {
  home,
  arts,
  sports,
};

export function publishedDocuments(): TwildaDocument[] {
  return [...Object.values(sampleArticles), ...Object.values(samplePages)];
}

export function createSampleState(): DemoState {
  return seedDemoState({
    published: publishedDocuments(),
    drafts: [franchiseDraft],
    files: { "content/data/franchise-revenue-mix.csv": FRANCHISE_CSV },
    now: "2026-11-10T00:00:00.000Z",
  });
}
