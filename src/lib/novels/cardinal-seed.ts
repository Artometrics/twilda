import type { Novel } from "@/apps/novelcrafter/data";

/** Cardinal — blank starter novel restored to the library. */
export const cardinalSeed: Novel = {
  id: "cardinal",
  title: "Cardinal",
  author: "KSM",
  series: undefined,
  updated: "May 24",
  sortKey: 1,
  synopsis: "A Subliminal History of Silicon Valley.",
  cover: "cardinal",
  blank: true,
  codex: [],
  chapters: [
    {
      title: "Chapter I",
      scenes: [{ title: "Scene 1", text: "" }],
    },
  ],
};

export const cardinalDraftMeta = {
  name: "Main",
  slug: "main",
  summary: "Primary Cardinal draft.",
} as const;
