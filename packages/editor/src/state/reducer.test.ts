import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBlock, createSection, fingerprint, type ArticleDoc, type PageDoc } from "../model";
import { moveItem } from "./move";
import { editorReducer, initialState, type EditorState } from "./reducer";

const article: ArticleDoc = {
  id: "lumen-rail",
  kind: "article",
  title: "Lumen Rail",
  slug: "lumen-rail",
  kicker: "Franchise",
  dek: "A sample.",
  byline: "Desk",
  updatedAt: "2026-11-09T18:30:00.000Z",
  blocks: [
    { id: "h-concession", type: "heading", level: 2, text: "The concession" },
    { id: "p-concession", type: "paragraph", text: "Night timetable." },
    { id: "h-yard", type: "heading", level: 2, text: "How the yard runs" },
  ],
};

const page: PageDoc = {
  id: "home",
  kind: "page",
  title: "Field Desk",
  slug: "home",
  kicker: "Issue",
  dek: "Sample issue.",
  byline: "",
  updatedAt: "2026-11-09T16:00:00.000Z",
  sections: [
    { id: "issue-carousel", type: "carousel", label: "In this issue", summary: "Leads." },
    { id: "issue-grid", type: "story-grid", label: "The desk", summary: "A stack." },
  ],
};

function opened(doc: ArticleDoc | PageDoc, published: ArticleDoc | PageDoc | null = null): EditorState {
  return editorReducer(initialState, {
    type: "opened",
    draft: doc,
    published,
    previewUrl: "/preview-frame.html",
  });
}

describe("moveItem", () => {
  it("moves an item to the index it should occupy", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 1, 1), ["a", "b", "c"]);
    assert.deepEqual(moveItem(["a", "b", "c"], -1, 1), ["a", "b", "c"]);
  });
});

describe("editor reducer", () => {
  it("opens a document and remembers the preview URL", () => {
    const state = opened(article, { ...article, blocks: article.blocks.slice(0, 2) });
    assert.equal(state.activeId, "lumen-rail");
    assert.equal(state.view, "edit");
    assert.equal(state.previewUrl, "/preview-frame.html");
    assert.equal(state.published?.kind, "article");
  });

  it("edits a paragraph without touching the saved copy", () => {
    const start = opened(article, article);
    const block = article.blocks[1];
    assert.equal(block?.type, "paragraph");
    if (block?.type !== "paragraph") return;
    const next = editorReducer(start, {
      type: "update-block",
      block: { ...block, text: "The night sheet moved." },
    });
    assert.equal(next.draft?.kind, "article");
    if (next.draft?.kind !== "article" || next.saved?.kind !== "article") return;
    assert.equal(next.draft.blocks[1]?.type === "paragraph" && next.draft.blocks[1].text, "The night sheet moved.");
    assert.equal(next.saved.blocks[1]?.type === "paragraph" && next.saved.blocks[1].text, "Night timetable.");
    assert.notEqual(fingerprint(next.draft), fingerprint(next.saved));
  });

  it("reorders blocks by destination index and ignores a page", () => {
    const start = opened(article);
    const down = editorReducer(start, { type: "move-block", id: "p-concession", to: 2 });
    assert.deepEqual(
      down.draft?.kind === "article" ? down.draft.blocks.map((block) => block.id) : [],
      ["h-concession", "h-yard", "p-concession"],
    );
    const up = editorReducer(down, { type: "move-block", id: "p-concession", to: 1 });
    assert.deepEqual(
      up.draft?.kind === "article" ? up.draft.blocks.map((block) => block.id) : [],
      ["h-concession", "p-concession", "h-yard"],
    );
    const pageState = opened(page);
    const ignored = editorReducer(pageState, { type: "move-block", id: "p-concession", to: 0 });
    assert.equal(ignored, pageState);
  });

  it("adds and deletes a block, and refuses a block on a page", () => {
    const block = createBlock("callout", "note-new");
    const added = editorReducer(opened(article), { type: "add-block", block });
    assert.equal(added.draft?.kind === "article" && added.draft.blocks.at(-1)?.id, "note-new");
    const removed = editorReducer(added, { type: "remove-block", id: "note-new" });
    assert.equal(
      removed.draft?.kind === "article" && removed.draft.blocks.some((item) => item.id === "note-new"),
      false,
    );
    const pageState = opened(page);
    assert.equal(editorReducer(pageState, { type: "add-block", block }), pageState);
  });

  it("adds, edits, reorders, and removes prepared page sections", () => {
    const section = createSection("category-tiles", "issue-tiles");
    const added = editorReducer(opened(page), { type: "add-section", section });
    assert.equal(added.draft?.kind === "page" && added.draft.sections.at(-1)?.label, "Sections");
    const edited = editorReducer(added, {
      type: "update-section",
      section: { ...section, label: "The doors" },
    });
    assert.equal(edited.draft?.kind === "page" && edited.draft.sections.at(-1)?.label, "The doors");
    const moved = editorReducer(edited, { type: "move-section", id: "issue-tiles", to: 0 });
    assert.equal(moved.draft?.kind === "page" && moved.draft.sections[0]?.id, "issue-tiles");
    const removed = editorReducer(moved, { type: "remove-section", id: "issue-tiles" });
    assert.equal(
      removed.draft?.kind === "page" && removed.draft.sections.some((item) => item.id === "issue-tiles"),
      false,
    );
    const articleState = opened(article);
    assert.equal(editorReducer(articleState, { type: "add-section", section }), articleState);
  });

  it("keeps save, build, and publish failures distinct", () => {
    const start = opened(article, article);
    for (const phase of ["save", "build", "publish"] as const) {
      const failed = editorReducer({ ...start, phase: "busy", busyLabel: "Working" }, {
        type: "failed",
        phase,
        message: `${phase} stopped`,
      });
      assert.equal(failed.phase, "ready");
      assert.equal(failed.error?.phase, phase);
      assert.equal(failed.error?.message, `${phase} stopped`);
      assert.equal(failed.confirm, null);
    }
  });

  it("confirms publish, then records the published copy", () => {
    const start = opened(article, null);
    const asking = editorReducer(start, { type: "ask-confirm", confirm: "publish" });
    assert.equal(asking.confirm, "publish");
    const dismissed = editorReducer(asking, { type: "dismiss-confirm" });
    assert.equal(dismissed.confirm, null);
    const published = editorReducer(start, {
      type: "published",
      draft: article,
      published: article,
      documents: [],
    });
    assert.equal(published.published?.id, "lumen-rail");
    assert.match(published.notice ?? "", /Published/);
  });

  it("refuses revert when nothing is published", () => {
    const start = opened(article, null);
    assert.equal(editorReducer(start, { type: "ask-confirm", confirm: "revert" }).confirm, null);
    const withPublished = opened(article, article);
    assert.equal(editorReducer(withPublished, { type: "ask-confirm", confirm: "revert" }).confirm, "revert");
  });

  it("ignores updatedAt in the fingerprint", () => {
    assert.equal(
      fingerprint(article),
      fingerprint({ ...article, updatedAt: "2020-01-01T00:00:00.000Z" }),
    );
  });
});
