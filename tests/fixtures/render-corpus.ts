import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { documentSchema, type TwildaDocument } from "@twilda/core";

export interface CorpusEntry {
  name: string;
  doc: TwildaDocument;
}

function read(file: string): TwildaDocument {
  return documentSchema.parse(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

/** A page and an article that touch every section and block type, with hostile strings. */
export const HOSTILE_ARTICLE = documentSchema.parse({
  id: "hostile",
  kind: "article",
  title: `Quote "a" & 'b' <script>alert(1)</script>`,
  slug: "hostile",
  kicker: `K'icker <b>`,
  dek: `Dek & "dek"`,
  byline: `By <i>me</i>`,
  status: "draft",
  updatedAt: "2026-11-15T00:00:00.000Z",
  blocks: [
    { id: "h2", type: "heading", level: 2, text: `Heading <2> & 'x'` },
    { id: "h3", type: "heading", level: 3, text: "Heading three" },
    { id: "p1", type: "paragraph", text: `First <img src=x onerror=alert(1)>\nsecond line\n\nSecond "paragraph" & more` },
    { id: "kf", type: "key-findings", title: "Findings <1>", items: ["Label: value & 'v'", "No colon item", "A: B: C"] },
    { id: "ch1", type: "chart", dataPath: "content/data/chart.csv", alt: "Alt <alt>", title: "Chart <t>", caption: "Cap & tion" },
    { id: "ch2", type: "chart", dataPath: "https://example.com/chart?a=1&b=2", alt: "Alt two", title: "Chart two", caption: "" },
    { id: "co", type: "callout", title: "Callout <t>", text: `Callout "text" & 'more'` },
    {
      id: "so",
      type: "sources",
      title: "Sources",
      items: [
        { id: "s1", label: "Local <s>", href: "/articles/x" },
        { id: "s2", label: "Remote", href: "https://example.com/a?b=1&c=2" },
      ],
    },
    { id: "im1", type: "image", src: "/media/plate-yard.svg", alt: `Plate "yard"`, caption: "Caption & text", role: "figure" },
    { id: "im2", type: "image", src: "data:image/png;base64,AAAA", alt: "Uploaded", caption: "", role: "banner" },
    { id: "im3", type: "image", src: "https://example.com/x.png", alt: "Remote image", caption: "", role: "figure" },
    { id: "em1", type: "embed", kind: "video", src: "https://example.com/v", title: "Clip <1>", caption: "Cap" },
    { id: "em2", type: "embed", kind: "audio", src: "/media/a.mp3", title: "Clip two", caption: "" },
    { id: "dl", type: "download", href: "/data/x.csv", label: "Data <csv>", description: "Desc & more" },
  ],
});

export const HOSTILE_PAGE = documentSchema.parse({
  id: "hostile-page",
  kind: "page",
  title: `Page "title" & <b>`,
  slug: "hostile-page",
  kicker: "Kicker",
  dek: "Dek 'x'",
  status: "draft",
  updatedAt: "2026-11-15T00:00:00.000Z",
  sections: [
    {
      id: "car",
      type: "carousel",
      label: "Row <1>",
      slides: [
        { id: "sl1", kicker: "K", title: "Slide <1>", dek: "D & d", href: "/articles/x", image: "/media/plate-map.svg", imageAlt: "Map" },
        { id: "sl2", kicker: "K2", title: "Slide 2", dek: "D2", href: "/q?x=1&y=2", image: "https://example.com/x.svg", imageAlt: "Remote" },
      ],
    },
    {
      id: "car2",
      type: "carousel",
      label: "",
      slides: [{ id: "sl3", kicker: "K", title: "Only", dek: "D", href: "/", image: "/media/plate-night.svg", imageAlt: "Night" }],
    },
    {
      id: "sg",
      type: "story-grid",
      kicker: "Desk",
      heading: "Grid <h>",
      stories: [
        { id: "st1", kicker: "Lead", title: "Lead <1>", dek: "Lead dek", href: "/a", image: "/media/plate-yard.svg", imageAlt: "Yard" },
        { id: "st2", kicker: "Two", title: "Two", dek: "Two dek", href: "/ok_path/x.y", image: "/media/plate-river.svg", imageAlt: "River" },
        { id: "st3", kicker: "Three", title: "Three", dek: "Three dek", href: "https://example.com", image: "/media/../x.svg", imageAlt: "Bad" },
      ],
    },
    {
      id: "ms",
      type: "menu-shelf",
      heading: "Shelf & co",
      items: [
        { id: "it1", label: "One", href: "/one", dek: "First" },
        { id: "it2", label: "Two <2>", href: "/two", dek: "Second" },
      ],
    },
  ],
});

/** Every document the repository ships, plus the hostile fixtures. */
export function corpus(): CorpusEntry[] {
  const out: CorpusEntry[] = [];
  for (const dir of readdirSync("content").sort()) {
    for (const file of ["draft.json", "published.json"]) {
      const full = path.join("content", dir, file);
      if (existsSync(full)) out.push({ name: `content-${dir}-${file.replace(".json", "")}`, doc: read(full) });
    }
  }
  const studio = "examples/studio/content";
  for (const id of readdirSync(studio).sort()) {
    const full = path.join(studio, id, "published.json");
    if (!existsSync(full)) continue;
    const doc = read(full);
    out.push({ name: `studio-${doc.kind === "page" ? "pages" : "articles"}-${id}`, doc });
  }
  out.push({ name: "hostile-article", doc: HOSTILE_ARTICLE }, { name: "hostile-page", doc: HOSTILE_PAGE });
  return out;
}
