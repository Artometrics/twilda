import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { ContentError, listPublished, publishDocument, readDraft, readPublished, revertDraft, saveDraft } from "../src/content/store";
import { contentFingerprint } from "../src/schema/fingerprint";
import type { ContentDocument } from "../src/schema/sections";
import { createSection } from "../src/schema/templates";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "twilda-content-"));
  roots.push(root);
  return root;
}

function sample(id = "desk-note"): ContentDocument {
  return {
    id,
    kind: "article",
    title: "Desk note",
    slug: id,
    dek: "A note",
    kicker: "Note",
    byline: "Desk",
    updatedAt: "2026-11-09T16:00:00.000Z",
    sections: [createSection("paragraph"), createSection("callout")],
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("content store", () => {
  it("keeps a saved draft out of the published list", async () => {
    const root = await tempRoot();
    const draft = saveDraft(sample(), root);
    assert.equal(readPublished("desk-note", root), null);
    assert.equal(listPublished(root).length, 0);
    assert.equal(readDraft("desk-note", root).title, draft.title);
  });

  it("publishes a copy and leaves later draft edits unpublished", async () => {
    const root = await tempRoot();
    const original = sample();
    publishDocument(original, root);
    const edited = saveDraft({ ...readDraft("desk-note", root), title: "Draft title" }, root);
    const published = readPublished("desk-note", root);
    assert.ok(published);
    assert.equal(published.title, "Desk note");
    assert.equal(edited.title, "Draft title");
    assert.notEqual(contentFingerprint(edited), contentFingerprint(published));
    assert.equal(listPublished(root).map((doc) => doc.id).join(), "desk-note");
  });

  it("reverts a draft back to the published copy", async () => {
    const root = await tempRoot();
    publishDocument(sample(), root);
    saveDraft({ ...readDraft("desk-note", root), title: "Draft title" }, root);
    const reverted = revertDraft("desk-note", root);
    assert.equal(reverted.draft.title, "Desk note");
    assert.equal(contentFingerprint(reverted.draft), contentFingerprint(reverted.published));
  });

  it("refuses path traversal and duplicate slugs", async () => {
    const root = await tempRoot();
    assert.throws(() => saveDraft({ ...sample(), id: "../outside" }, root), ContentError);
    publishDocument(sample("alpha"), root);
    assert.throws(
      () => publishDocument({ ...sample("beta"), slug: "alpha" }, root),
      /already used/,
    );
  });
});
