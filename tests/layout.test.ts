import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  documentDir,
  documentIdFromPath,
  draftPath,
  mediaRepoPath,
  publishedPath,
  serializeDocument,
  type TwildaDocument,
} from "@twilda/core";
import { listDocumentIds, loadContentTree, migrateLegacyLayout } from "@twilda/core/node";
import { listPublished, readPublished, saveDraft } from "../src/content/store";
import { readSite } from "../src/content/site";

const article = (id: string, status: "draft" | "published" = "published"): TwildaDocument => ({
  id,
  kind: "article",
  title: `T ${id}`,
  slug: id,
  dek: "",
  kicker: "",
  byline: "",
  status,
  updatedAt: "2026-01-01T00:00:00.000Z",
  blocks: [{ id: "p", type: "paragraph", text: `Body of ${id}.` }],
});

function legacyRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "twilda-legacy-"));
  mkdirSync(path.join(root, "articles"));
  mkdirSync(path.join(root, "pages"));
  writeFileSync(path.join(root, "articles", "alpha.json"), serializeDocument(article("alpha", "published")));
  writeFileSync(path.join(root, "articles", "beta.json"), serializeDocument(article("beta", "draft")));
  writeFileSync(path.join(root, "articles", "broken.json"), "{not json");
  return root;
}

describe("one storage layout", () => {
  it("paths are a folder per document, draft beside published", () => {
    assert.equal(draftPath("lumen-rail"), "content/lumen-rail/draft.json");
    assert.equal(publishedPath("lumen-rail"), "content/lumen-rail/published.json");
    assert.equal(documentDir("home"), "content/home");
    assert.deepEqual(documentIdFromPath("content/home/draft.json"), { id: "home", file: "draft" });
    assert.deepEqual(documentIdFromPath("content/home/published.json"), { id: "home", file: "published" });
    for (const bad of ["content/articles/home.json", "content/site.json", "content/home/other.json", "content/Home/draft.json", "content/../draft.json", "content/a/b/draft.json"]) {
      assert.equal(documentIdFromPath(bad), null, bad);
    }
  });

  it("refuses an unsafe id or media name", () => {
    for (const id of ["../x", "A", "a/b", "", "a_b", "-a"]) assert.throws(() => draftPath(id), undefined, id);
    assert.equal(mediaRepoPath("field-notes.jpg"), "public/media/field-notes.jpg");
    for (const name of ["../x.jpg", "a.exe", "A.jpg", "a b.jpg", "a/b.jpg", ".jpg", "a.svg.js", `${"a".repeat(90)}.jpg`]) assert.throws(() => mediaRepoPath(name), undefined, name);
  });

  it("every editor and the build agree: the repo's content folder is entirely in the new layout", () => {
    const root = path.resolve("content");
    const entries = readdirSync(root, { withFileTypes: true });
    assert.equal(existsSync(path.join(root, "articles")), false);
    assert.equal(existsSync(path.join(root, "pages")), false);
    for (const entry of entries.filter((item) => item.isDirectory())) {
      assert.ok(existsSync(path.join(root, entry.name, "published.json")) || existsSync(path.join(root, entry.name, "draft.json")), entry.name);
    }
    const studio = path.resolve("examples/studio/content");
    assert.equal(existsSync(path.join(studio, "articles")), false);
    assert.ok(listDocumentIds(studio).length >= 8);
  });

  it("the Astro store and the core loader read the same published documents", () => {
    const fromStore = listPublished().map((doc) => doc.id).sort();
    const fromCore = loadContentTree(path.resolve("content"));
    const coreIds = [...fromCore.articles, ...fromCore.pages].map((doc) => doc.id).sort();
    assert.deepEqual(fromStore, coreIds);
    assert.equal(readPublished("home")?.kind, "page");
  });

  it("never reads a draft into the published tree", () => {
    const root = mkdtempSync(path.join(tmpdir(), "twilda-drafts-"));
    mkdirSync(path.join(root, "only-draft"));
    writeFileSync(path.join(root, "only-draft", "draft.json"), serializeDocument(article("only-draft", "draft")));
    mkdirSync(path.join(root, "both"));
    writeFileSync(path.join(root, "both", "published.json"), serializeDocument(article("both", "published")));
    writeFileSync(path.join(root, "both", "draft.json"), serializeDocument({ ...article("both", "draft"), title: "DRAFT-ONLY SENTINEL" }));
    writeFileSync(path.join(root, "site.json"), "{}");
    const tree = loadContentTree(root);
    assert.deepEqual(tree.articles.map((doc) => doc.id), ["both"]);
    assert.equal(JSON.stringify(tree).includes("DRAFT-ONLY"), false);
    assert.deepEqual(listDocumentIds(root), ["both", "only-draft"]);
  });

  it("saving a draft through the Field Desk store writes draft.json and not published.json", () => {
    const root = mkdtempSync(path.join(tmpdir(), "twilda-store-"));
    saveDraft(article("saved", "draft"), root);
    assert.ok(existsSync(path.join(root, "saved", "draft.json")));
    assert.equal(existsSync(path.join(root, "saved", "published.json")), false);
  });

  it("a missing content/site.json builds with the default site", () => {
    const root = mkdtempSync(path.join(tmpdir(), "twilda-nosite-"));
    assert.equal(readSite(root).chrome.name, "Field Desk");
  });
});

describe("migrating the retired layout", () => {
  it("moves published to published + draft, drafts to draft only, and reports what it could not read", () => {
    const root = legacyRoot();
    const report = migrateLegacyLayout(root);
    assert.deepEqual(report.moved.map((item) => item.id).sort(), ["alpha", "beta"]);
    assert.equal(report.skipped.length, 1);
    assert.match(report.skipped[0]!.from, /broken\.json$/);
    assert.ok(existsSync(path.join(root, "alpha", "published.json")));
    assert.ok(existsSync(path.join(root, "alpha", "draft.json")));
    assert.equal(JSON.parse(readFileSync(path.join(root, "alpha", "draft.json"), "utf8")).status, "draft");
    assert.equal(JSON.parse(readFileSync(path.join(root, "alpha", "published.json"), "utf8")).status, "published");
    assert.ok(existsSync(path.join(root, "beta", "draft.json")));
    assert.equal(existsSync(path.join(root, "beta", "published.json")), false);
    assert.ok(existsSync(path.join(root, "articles", "alpha.json")), "legacy files stay unless --remove");
  });

  it("is a dry run on request and does not overwrite without force", () => {
    const root = legacyRoot();
    migrateLegacyLayout(root, { dryRun: true });
    assert.equal(existsSync(path.join(root, "alpha")), false);
    migrateLegacyLayout(root);
    writeFileSync(path.join(root, "alpha", "draft.json"), "KEEP ME");
    const again = migrateLegacyLayout(root);
    assert.ok(again.skipped.some((item) => /already exists/.test(item.reason)));
    assert.equal(readFileSync(path.join(root, "alpha", "draft.json"), "utf8"), "KEEP ME");
    migrateLegacyLayout(root, { force: true });
    assert.notEqual(readFileSync(path.join(root, "alpha", "draft.json"), "utf8"), "KEEP ME");
  });

  it("removes legacy files and empty folders only with remove, and the loader then sees the same documents", () => {
    const root = legacyRoot();
    migrateLegacyLayout(root, { remove: true });
    assert.equal(existsSync(path.join(root, "articles", "alpha.json")), false);
    assert.ok(existsSync(path.join(root, "articles", "broken.json")), "an unreadable file is never deleted");
    assert.deepEqual(loadContentTree(root).articles.map((doc) => doc.id), ["alpha"]);
  });
});
