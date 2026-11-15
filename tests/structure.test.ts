import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  BLOCK_TYPES,
  MAX_BLOCKS,
  MAX_SECTIONS,
  PAGE_SECTION_TYPES,
  addNode,
  canRedo,
  canUndo,
  documentSchema,
  duplicateNode,
  emptyHistory,
  libraryFor,
  mergeDocuments,
  mergeSites,
  moveNode,
  parseNodePath,
  recordChange,
  redo,
  removeNode,
  undo,
  defaultSite,
  type TwildaDocument,
} from "@twilda/core";

const load = (id: string) => documentSchema.parse(JSON.parse(readFileSync(`content/${id}/draft.json`, "utf8")));
const home = load("home");
const article = load("lumen-rail");
const ids = (doc: TwildaDocument) => (doc.kind === "page" ? doc.sections : doc.blocks).map((item) => item.id);

describe("section and block structure", () => {
  it("moves, bounds-checks, and keeps every id", () => {
    const moved = moveNode(home, 0, 1);
    assert.ok(moved.ok);
    if (!moved.ok) return;
    assert.equal(moved.index, 1);
    assert.deepEqual(ids(moved.doc), [ids(home)[1], ids(home)[0], ...ids(home).slice(2)]);
    assert.equal(moveNode(home, 0, -1).ok, false);
    assert.equal(moveNode(home, 0, ids(home).length).ok, false);
    assert.equal(moveNode(home, 99, 0).ok, false);
    assert.equal(moveNode(home, 0.5, 1).ok, false);
    assert.deepEqual(ids((moveNode(home, 1, 1) as { doc: TwildaDocument }).doc), ids(home));
  });

  it("removes but never empties a page or an article", () => {
    const one = { ...home, sections: [home.sections[0]!] } as TwildaDocument;
    assert.equal(removeNode(one, 0).ok, false);
    const fewer = removeNode(home, 0);
    assert.ok(fewer.ok && ids(fewer.doc).length === ids(home).length - 1);
    assert.equal(removeNode(home, -1).ok, false);
    assert.equal(removeNode(home, 50).ok, false);
  });

  it("adds each prepared type and the result stays schema-valid", () => {
    for (const type of PAGE_SECTION_TYPES) {
      const result = addNode(home, type, 1);
      assert.ok(result.ok, type);
      if (result.ok) {
        assert.equal(documentSchema.safeParse(result.doc).success, true, type);
        assert.equal(ids(result.doc).length, ids(home).length + 1);
        assert.equal(result.index, 1);
      }
    }
    for (const type of BLOCK_TYPES) {
      const result = addNode(article, type, 0);
      assert.ok(result.ok, type);
      if (result.ok) assert.equal(ids(result.doc).length, ids(article).length + 1);
    }
  });

  it("refuses a type outside the library, in either direction", () => {
    for (const type of ["freeform", "script", "__proto__", "paragraph", ""]) assert.equal(addNode(home, type, 0).ok, type === "paragraph" ? false : false, type);
    for (const type of ["carousel", "freeform", "constructor"]) assert.equal(addNode(article, type, 0).ok, false, type);
    assert.deepEqual([...libraryFor(home)], [...PAGE_SECTION_TYPES]);
    assert.deepEqual([...libraryFor(article)], [...BLOCK_TYPES]);
  });

  it("clamps the insertion point and enforces the part limits", () => {
    const end = addNode(home, "menu-shelf", 999);
    assert.ok(end.ok && end.index === ids(home).length);
    const start = addNode(home, "menu-shelf", -5);
    assert.ok(start.ok && start.index === 0);
    let page = home;
    while (ids(page).length < MAX_SECTIONS) {
      const next = addNode(page, "menu-shelf", 0);
      assert.ok(next.ok);
      if (next.ok) page = next.doc;
    }
    assert.equal(addNode(page, "menu-shelf", 0).ok, false);
    assert.equal(duplicateNode(page, 0).ok, false);
    assert.ok(MAX_BLOCKS > MAX_SECTIONS);
  });

  it("duplicates with fresh ids at every level so ids stay unique", () => {
    const copy = duplicateNode(home, 0);
    assert.ok(copy.ok);
    if (!copy.ok) return;
    const all: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [key, entry] of Object.entries(value)) {
          if (key === "id" && typeof entry === "string") all.push(entry);
          else walk(entry);
        }
      }
    };
    walk(copy.doc);
    assert.equal(new Set(all).size, all.length);
    assert.equal(documentSchema.safeParse(copy.doc).success, true);
  });

  it("maps a data-twilda-node path back to an index", () => {
    assert.equal(parseNodePath(home, "sections.1"), 1);
    assert.equal(parseNodePath(home, "sections.99"), null);
    assert.equal(parseNodePath(home, "blocks.0"), null);
    assert.equal(parseNodePath(article, "blocks.0"), 0);
    assert.equal(parseNodePath(article, "blocks.0.text"), null);
  });
});

describe("undo and redo", () => {
  it("steps back and forward through snapshots", () => {
    let h = emptyHistory<string>();
    h = recordChange(h, "a", { key: null, at: 0 });
    h = recordChange(h, "b", { key: null, at: 10 });
    assert.ok(canUndo(h) && !canRedo(h));
    const back = undo(h, "c");
    assert.deepEqual([back?.value, back?.history.past, back?.history.future], ["b", ["a"], ["c"]]);
    const again = undo(back!.history, "b");
    assert.equal(again?.value, "a");
    assert.equal(undo(again!.history, "a"), null);
    const fwd = redo(again!.history, "a");
    assert.equal(fwd?.value, "b");
    assert.ok(canRedo(fwd!.history));
  });

  it("a new edit clears redo", () => {
    let h = recordChange(emptyHistory<string>(), "a", { at: 0 });
    const back = undo(h, "b")!;
    assert.ok(canRedo(back.history));
    h = recordChange(back.history, "a", { at: 5 });
    assert.equal(canRedo(h), false);
  });

  it("collapses typing in one field into one step, but not across fields or pauses", () => {
    let h = emptyHistory<string>();
    for (const [i, previous] of ["", "h", "he", "hel"].entries()) h = recordChange(h, previous, { key: "title", at: i * 100 });
    assert.deepEqual(h.past, [""]);
    h = recordChange(h, "hell", { key: "dek", at: 450 });
    assert.equal(h.past.length, 2);
    h = recordChange(h, "x", { key: "dek", at: 450 + 5000 });
    assert.equal(h.past.length, 3);
  });

  it("is bounded", () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 300; i += 1) h = recordChange(h, i, { at: i, limit: 50 });
    assert.equal(h.past.length, 50);
    assert.equal(h.past.at(-1), 299);
  });
});

describe("three-way merge of documents", () => {
  const text = (doc: TwildaDocument, id: string, value: string): TwildaDocument => {
    const clone = structuredClone(doc) as Extract<TwildaDocument, { kind: "article" }>;
    const block = clone.blocks.find((item) => item.id === id) as { text?: string } | undefined;
    if (block) block.text = value;
    return clone;
  };
  const firstParagraph = (article.kind === "article" ? article.blocks.find((block) => block.type === "paragraph") : undefined)!;

  it("keeps edits to different blocks from both sides without asking", () => {
    const other = article.kind === "article" ? article.blocks.filter((block) => block.type === "paragraph")[1] ?? article.blocks.find((block) => block.type === "heading")! : firstParagraph;
    const ours = text(article, firstParagraph.id, "Ours.");
    const theirs = structuredClone(article) as typeof article & { blocks: Array<{ id: string; text?: string; type: string }> };
    const target = theirs.blocks.find((block) => block.id === other.id)!;
    target.text = "Theirs.";
    const result = mergeDocuments(article, ours, theirs);
    assert.deepEqual(result.conflicts, []);
    assert.equal(result.theirsChanged, true);
    const merged = result.doc as typeof article & { blocks: Array<{ id: string; text?: string }> };
    assert.equal(merged.blocks.find((block) => block.id === firstParagraph.id)?.text, "Ours.");
    assert.equal(merged.blocks.find((block) => block.id === other.id)?.text, "Theirs.");
  });

  it("reports a field both sides changed, and applies the choice", () => {
    const ours = text(article, firstParagraph.id, "Ours.");
    const theirs = text(article, firstParagraph.id, "Theirs.");
    const result = mergeDocuments(article, ours, theirs);
    assert.equal(result.conflicts.length, 1);
    const conflict = result.conflicts[0]!;
    assert.equal(conflict.ours, "Ours.");
    assert.equal(conflict.theirs, "Theirs.");
    assert.match(conflict.label, /text/i);
    const keepMine = mergeDocuments(article, ours, theirs, { [conflict.key]: "ours" });
    const takeTheirs = mergeDocuments(article, ours, theirs, { [conflict.key]: "theirs" });
    assert.deepEqual(keepMine.conflicts, []);
    assert.equal((keepMine.doc as typeof article & { blocks: Array<{ id: string; text?: string }> }).blocks.find((block) => block.id === firstParagraph.id)?.text, "Ours.");
    assert.equal((takeTheirs.doc as typeof article & { blocks: Array<{ id: string; text?: string }> }).blocks.find((block) => block.id === firstParagraph.id)?.text, "Theirs.");
  });

  it("a block added on main and another added here both survive, matched by id", () => {
    const added = addNode(article, "callout", 0);
    const theirsAdded = addNode(article, "download", 0);
    assert.ok(added.ok && theirsAdded.ok);
    if (!added.ok || !theirsAdded.ok) return;
    const result = mergeDocuments(article, added.doc, theirsAdded.doc);
    const merged = ids(result.doc);
    assert.ok(merged.includes(ids(added.doc)[0]!));
    assert.ok(merged.includes(ids(theirsAdded.doc)[0]!));
    assert.equal(merged.length, ids(article).length + 2);
  });

  it("with no base, every difference is a conflict and identical copies are not", () => {
    const edited = text(article, firstParagraph.id, "Ours.");
    assert.ok(mergeDocuments(null, edited, article).conflicts.length >= 1);
    assert.deepEqual(mergeDocuments(null, article, article).conflicts, []);
  });

  it("a status or timestamp difference alone is not a change", () => {
    const stamped = { ...article, updatedAt: "2030-01-01T00:00:00.000Z", status: "published" as const };
    const result = mergeDocuments(article, article, stamped);
    assert.deepEqual(result.conflicts, []);
    assert.equal(result.theirsChanged, false);
  });
});

describe("three-way merge of site settings", () => {
  it("merges different settings and conflicts on the same one", () => {
    const base = defaultSite();
    const ours = structuredClone(base);
    ours.theme.colors.paper = "#ffffff";
    const theirs = structuredClone(base);
    theirs.chrome.name = "Their Desk";
    const clean = mergeSites(base, ours, theirs);
    assert.deepEqual(clean.conflicts, []);
    assert.equal(clean.site.theme.colors.paper, "#ffffff");
    assert.equal(clean.site.chrome.name, "Their Desk");
    const theirsPaper = structuredClone(base);
    theirsPaper.theme.colors.paper = "#000000";
    const conflict = mergeSites(base, ours, theirsPaper);
    assert.equal(conflict.conflicts.length, 1);
    assert.equal(conflict.conflicts[0]?.key, "theme.colors.paper");
    assert.equal(mergeSites(base, ours, theirsPaper, { "theme.colors.paper": "theirs" }).site.theme.colors.paper, "#000000");
    assert.equal(mergeSites(base, ours, theirsPaper, { "theme.colors.paper": "ours" }).site.theme.colors.paper, "#ffffff");
  });
});
