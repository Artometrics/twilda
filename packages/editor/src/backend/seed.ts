import type { ArticleDoc, MediaAsset, PageDoc } from "../model";
import { MemoryBackend } from "./memory";
import { MEDIA_INDEX, draftPath, previewPath, publishedPath } from "./paths";

const PLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90" role="img">
  <rect width="160" height="90" fill="#1b1714"/>
  <rect x="12" y="18" width="136" height="6" fill="#f3efe6"/>
  <rect x="12" y="36" width="88" height="6" fill="#8f2419"/>
  <rect x="12" y="54" width="136" height="6" fill="#f3efe6"/>
  <rect x="12" y="72" width="40" height="6" fill="#f3efe6"/>
</svg>`;

const plate: MediaAsset = {
  name: "plate-yard.svg",
  path: "media/plate-yard.svg",
  dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLATE)}`,
  width: 160,
  height: 90,
  scaled: false,
  originalWidth: 160,
  originalHeight: 90,
};

const lumenDraft: ArticleDoc = {
  id: "lumen-rail",
  kind: "article",
  title: "Lumen Rail",
  slug: "lumen-rail",
  kicker: "Franchise",
  dek: "A fictional municipal operator, written so a franchise template can be reordered block by block.",
  byline: "Desk sample · Field Desk",
  updatedAt: "2026-11-09T18:30:00.000Z",
  blocks: [
    { id: "h-concession", type: "heading", level: 2, text: "The concession" },
    {
      id: "p-concession",
      type: "paragraph",
      text: "Lumen Rail is not a transit agency you can ride. It is the sample franchise in this repository: a city-owned concession that runs a light line along a river the demo never names.\n\nThe night timetable is a public document. In the CMS, it is a paragraph an editor can move.",
    },
    { id: "h-yard", type: "heading", level: 2, text: "How the yard runs" },
    {
      id: "findings-sheet",
      type: "key-findings",
      title: "What the concession records",
      findings: [
        { id: "f-year", label: "Story year", detail: "1978" },
        { id: "f-stations", label: "Stations", detail: "24" },
        { id: "f-span", label: "Night span", detail: "18 minutes" },
      ],
    },
    {
      id: "chart-span",
      type: "chart",
      title: "Night span, by hour",
      caption: "A chart embed. The bars are a stand-in until a data file is attached.",
      src: "",
    },
    {
      id: "fig-yard",
      type: "image",
      src: "media/plate-yard.svg",
      alt: "Geometric plate of tracks, ties, and a pale shed",
      caption: "Plate for the yard. Original geometry for the demo, not a photograph.",
    },
    {
      id: "sources-desk",
      type: "sources",
      items: [
        { id: "src-sheet", label: "Sample night sheet", href: "/articles/lumen-rail" },
        { id: "src-clause", label: "Concession clause 4", href: "/articles/lumen-rail" },
      ],
    },
    {
      id: "video-span",
      type: "video",
      src: "",
      caption: "A clip of the night span would sit here. The demo does not ship a video file.",
    },
    {
      id: "audio-bell",
      type: "audio",
      src: "",
      caption: "The platform bell, if a recording is uploaded.",
    },
    {
      id: "download-sheet",
      type: "download",
      label: "Night sheet (sample)",
      href: "",
    },
    {
      id: "note-draft-only",
      type: "callout",
      title: "Unpublished yard note",
      text: "DRAFT-ONLY SENTINEL: the yard lights stay on past midnight.",
    },
  ],
};

const lumenPublished: ArticleDoc = {
  ...lumenDraft,
  updatedAt: "2026-11-09T16:00:00.000Z",
  blocks: lumenDraft.blocks.filter((block) => block.id !== "note-draft-only"),
};

const home: PageDoc = {
  id: "home",
  kind: "page",
  title: "Field Desk",
  slug: "home",
  kicker: "Demo issue 01",
  dek: "A sample issue assembled from prepared sections. Field Desk is demo content, not a live magazine.",
  byline: "",
  updatedAt: "2026-11-09T16:00:00.000Z",
  sections: [
    {
      id: "issue-carousel",
      type: "carousel",
      label: "In this issue",
      summary: "Three leads, including the Lumen Rail franchise.",
    },
    {
      id: "issue-grid",
      type: "story-grid",
      label: "The desk",
      summary: "A franchise page is a stack, not a canvas.",
    },
    {
      id: "issue-feature",
      type: "magazine-feature",
      label: "The shed faces the river",
      summary: "One feature plate for the yard, with a dek under it.",
    },
  ],
};

const river: ArticleDoc = {
  id: "river-note",
  kind: "article",
  title: "River note",
  slug: "river-note",
  kicker: "Draft",
  dek: "A short draft that has never been published. It stays off the static site.",
  byline: "Desk sample",
  updatedAt: "2026-11-09T19:00:00.000Z",
  blocks: [
    {
      id: "p-river",
      type: "paragraph",
      text: "The river in the sample has no name a reader could search for on a map.",
    },
  ],
};

function serialize(doc: ArticleDoc | PageDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** Load the Field Desk sample into a memory backend. Safe to call from dev and tests. */
export async function seedFieldDesk(backend: MemoryBackend): Promise<void> {
  await backend.write(draftPath(lumenDraft.id), serialize(lumenDraft));
  await backend.write(publishedPath(lumenDraft.id), serialize(lumenPublished));
  await backend.write(previewPath(lumenDraft.id), "/preview-frame.html");
  await backend.write(draftPath(home.id), serialize(home));
  await backend.write(publishedPath(home.id), serialize(home));
  await backend.write(previewPath(home.id), "/preview-frame.html");
  await backend.write(draftPath(river.id), serialize(river));
  await backend.write(plate.path, plate.dataUrl);
  await backend.write(MEDIA_INDEX, JSON.stringify([plate]));
}
