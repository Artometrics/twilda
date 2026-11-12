import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEEDED_MARKER, seedArtometrics, seedOnFirstVisit } from "./artometrics";
import { draftPath } from "./paths";
import { LocalStorageStore, MemoryStore, PersistentBackend, type KeyValueStore } from "./persistent";
import { createCms } from "./service";
import { createArticle } from "../doc";

const now = () => "2026-11-12T12:00:00.000Z";

class FakeStorage {
  readonly map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

describe("persistent backend", () => {
  it("keeps a saved draft across a reopen of the same store", async () => {
    const store = new MemoryStore();
    const first = await PersistentBackend.open(store, now);
    const cms = createCms(first, now);
    await cms.create(createArticle({ title: "Keep me", now: now() }));

    const second = await PersistentBackend.open(store, now);
    const docs = await createCms(second, now).listDocuments();
    assert.deepEqual(docs.map((doc) => doc.id), ["keep-me"]);
  });

  it("works over localStorage and namespaces its keys", async () => {
    const storage = new FakeStorage();
    storage.setItem("someone-elses-key", "x");
    const store = new LocalStorageStore(storage);
    const backend = await PersistentBackend.open(store, now);
    await createCms(backend, now).create(createArticle({ title: "Local", now: now() }));
    assert.ok([...storage.map.keys()].some((key) => key.startsWith("twilda:file:") && key.endsWith("draft.json")));

    const again = await PersistentBackend.open(new LocalStorageStore(storage), now);
    assert.equal((await createCms(again, now).listDocuments()).length, 1);
  });

  it("reports a failed store write as a failed save and rolls back", async () => {
    class FullStore extends MemoryStore {
      override async set(key: string, value: string): Promise<void> {
        if (key.endsWith("draft.json") && this.data.size >= 1) throw new Error("Quota exceeded.");
        await super.set(key, value);
      }
    }
    const store: KeyValueStore = new FullStore();
    const backend = await PersistentBackend.open(store, now);
    const cms = createCms(backend, now);
    const first = await cms.create(createArticle({ title: "First", now: now() }));
    await store.set("filler", "x");
    await assert.rejects(() => cms.save({ ...first, title: "Changed" }), /would not keep the file/);
    const reread = await cms.open("first");
    assert.equal(reread.draft.title, "First");
  });

  it("deleting a document removes it from the store", async () => {
    const store = new MemoryStore();
    const backend = await PersistentBackend.open(store, now);
    const cms = createCms(backend, now);
    await cms.create(createArticle({ title: "Gone", now: now() }));
    await cms.remove("gone");
    assert.deepEqual([...store.data.keys()].filter((key) => key.includes("gone")), []);
    const reopened = await PersistentBackend.open(store, now);
    assert.deepEqual(await createCms(reopened, now).listDocuments(), []);
  });
});

describe("cms create and remove", () => {
  it("refuses to overwrite an existing id", async () => {
    const backend = await PersistentBackend.open(new MemoryStore(), now);
    const cms = createCms(backend, now);
    const doc = createArticle({ title: "Twice", now: now() });
    await cms.create(doc);
    await assert.rejects(() => cms.create(doc), /exists|already/i);
  });

  it("publishing and saving stay separate for a new article", async () => {
    const backend = await PersistentBackend.open(new MemoryStore(), now);
    const cms = createCms(backend, now);
    const doc = await cms.create(createArticle({ title: "Split", now: now() }));
    assert.equal((await cms.listDocuments())[0]?.hasPublished, false);
    await cms.save({ ...doc, title: "Split two" });
    assert.equal((await cms.listDocuments())[0]?.hasPublished, false);
  });
});

describe("sample drafts", () => {
  it("seed once, and deleting one does not bring it back", async () => {
    const store = new MemoryStore();
    const backend = await PersistentBackend.open(store, now);
    await seedOnFirstVisit(backend);
    const cms = createCms(backend, now);
    const docs = await cms.listDocuments();
    assert.equal(docs.length, 3);
    assert.ok(docs.every((doc) => doc.verifyCount > 0));
    assert.ok(store.data.has(SEEDED_MARKER));

    await cms.remove(docs[0]!.id);
    const reopened = await PersistentBackend.open(store, now);
    await seedOnFirstVisit(reopened);
    assert.equal((await createCms(reopened, now).listDocuments()).length, 2);
  });

  it("restore brings back only the missing ones and keeps edits", async () => {
    const backend = await PersistentBackend.open(new MemoryStore(), now);
    await seedOnFirstVisit(backend);
    const cms = createCms(backend, now);
    const [first, second] = await cms.listDocuments();
    const opened = await cms.open(first!.id);
    await cms.save({ ...opened.draft, title: "My edit" });
    await cms.remove(second!.id);

    assert.equal(await seedArtometrics(backend), 1);
    const docs = await cms.listDocuments();
    assert.equal(docs.length, 3);
    assert.ok(docs.some((doc) => doc.title === "My edit"));
    assert.ok(await backend.read(draftPath(second!.id)));
  });
});
