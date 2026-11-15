import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultSite } from "@twilda/core";
import type { Doc, MediaAsset } from "../model";
import { afterPublish, emptySync, loadSiteSync, loadSync, mediaPayload, saveSiteSync, saveSync, syncPath } from "./sync";

const doc = (title: string): Doc => ({
  id: "note",
  kind: "article",
  title,
  slug: "note",
  dek: "",
  kicker: "",
  byline: "",
  status: "draft",
  updatedAt: "2026-11-15T00:00:00.000Z",
  blocks: [{ id: "p1", type: "paragraph", text: title }],
});

function memory() {
  const files = new Map<string, string>();
  return {
    files,
    async read(path: string) {
      const value = files.get(path);
      if (value === undefined) throw new Error("missing");
      return value;
    },
    async write(path: string, text: string) {
      files.set(path, text);
    },
  };
}

describe("sync record", () => {
  it("is empty when nothing was stored, and survives a round trip", async () => {
    const store = memory();
    assert.deepEqual(await loadSync(store, "note"), emptySync());
    await saveSync(store, "note", { base: doc("base"), sent: [doc("one")] });
    const back = await loadSync(store, "note");
    assert.equal(back.base?.title, "base");
    assert.equal(back.sent[0]?.title, "one");
    assert.equal(syncPath("note"), "meta/sync/note.json");
  });

  it("recovers from damaged or hostile stored data instead of throwing", async () => {
    const store = memory();
    for (const raw of ["{nope", "null", '{"base":"x","sent":"y"}', '{"base":{"kind":"article","blocks":[{"type":"<script>"}]},"sent":[null,7]}']) {
      store.files.set(syncPath("note"), raw);
      await assert.doesNotReject(() => loadSync(store, "note"), raw);
    }
  });

  it("keeps the last four sent copies and records what main held", () => {
    let record = emptySync();
    for (const title of ["a", "b", "c", "d", "e", "f"]) record = afterPublish(record, doc(title), doc(`main-${title}`));
    assert.deepEqual(record.sent.map((item) => item.title), ["c", "d", "e", "f"]);
    assert.equal(record.base?.title, "main-f");
    assert.equal(afterPublish(record, doc("g"), null).base?.title, "main-f", "no new sighting keeps the last base");
  });

  it("stores site settings separately and ignores a stored value that fails the schema", async () => {
    const store = memory();
    assert.deepEqual(await loadSiteSync(store), { base: null, sent: [] });
    await saveSiteSync(store, { base: defaultSite(), sent: [defaultSite()] });
    assert.equal((await loadSiteSync(store)).sent.length, 1);
    store.files.set("meta/sync/site.json", JSON.stringify({ base: { theme: { colors: { paper: "url(javascript:1)" } } }, sent: [{ nope: 1 }] }));
    assert.deepEqual(await loadSiteSync(store), { base: null, sent: [] });
  });
});

describe("mediaPayload", () => {
  const asset = (name: string, dataUrl: string): MediaAsset => ({ name, dataUrl, path: `media/${name}`, alt: "", bytes: 1, kind: "image" }) as unknown as MediaAsset;
  const withImage = (src: string): Doc => ({
    ...(doc("x") as Extract<Doc, { kind: "article" }>),
    blocks: [{ id: "i", type: "image", src, alt: "a", caption: "", role: "figure" }],
  });

  it("sends only the uploads the page prints, as base64 without the data URL prefix", () => {
    const payload = mediaPayload(withImage("/media/a.jpg"), [asset("a.jpg", "data:image/jpeg;base64,QUJD"), asset("b.jpg", "data:image/jpeg;base64,REVG")]);
    assert.deepEqual(payload, { "a.jpg": "QUJD" });
  });

  it("skips plates that are not data URLs and anything that is not an image", () => {
    assert.deepEqual(mediaPayload(withImage("/media/a.jpg"), [asset("a.jpg", "/media/a.jpg")]), {});
    assert.deepEqual(mediaPayload(withImage("/media/a.jpg"), [asset("a.jpg", "data:text/html;base64,PHNjcmlwdD4=")]), {});
    assert.deepEqual(mediaPayload(withImage("https://evil.example/a.jpg"), [asset("a.jpg", "data:image/jpeg;base64,QUJD")]), {});
  });
});
