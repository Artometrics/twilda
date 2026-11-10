import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fingerprint } from "../model";
import { MemoryBackend } from "./memory";
import { draftPath, publishedPath } from "./paths";
import { seedFieldDesk } from "./seed";
import { CmsError, createCms } from "./service";

async function desk() {
  const now = () => "2026-11-10T12:00:00.000Z";
  const backend = new MemoryBackend(now);
  await seedFieldDesk(backend);
  return { backend, cms: createCms(backend, now) };
}

describe("memory backend and cms client", () => {
  it("lists drafts with published and unpublished badges", async () => {
    const { cms } = await desk();
    const docs = await cms.listDocuments();
    const byId = Object.fromEntries(docs.map((doc) => [doc.id, doc]));
    assert.equal(byId["lumen-rail"]?.status, "unpublished");
    assert.equal(byId["lumen-rail"]?.hasPublished, true);
    assert.equal(byId.home?.status, "published");
    assert.equal(byId["river-note"]?.status, "draft-only");
    assert.equal(byId["river-note"]?.hasPublished, false);
  });

  it("saves a draft without changing the published file", async () => {
    const { backend, cms } = await desk();
    const before = await backend.read(publishedPath("lumen-rail"));
    const opened = await cms.open("lumen-rail");
    assert.equal(opened.previewUrl, "/preview-frame.html");
    const draft = opened.draft;
    if (draft.kind !== "article") throw new Error("expected an article");
    const paragraph = draft.blocks.find((block) => block.id === "p-concession");
    if (paragraph?.type !== "paragraph") throw new Error("missing paragraph");
    const next = {
      ...draft,
      blocks: draft.blocks.map((block) =>
        block.id === "p-concession" && block.type === "paragraph"
          ? { ...block, text: "The night sheet moved." }
          : block,
      ),
    };
    const saved = await cms.save(next);
    assert.equal(saved.updatedAt, "2026-11-10T12:00:00.000Z");
    assert.equal(await backend.read(publishedPath("lumen-rail")), before);
    const reread = JSON.parse(await backend.read(draftPath("lumen-rail"))) as typeof next;
    assert.equal(fingerprint(reread), fingerprint(saved));
  });

  it("publishes only after save and build both succeed", async () => {
    const { backend, cms } = await desk();
    const { draft } = await cms.open("home");
    const published = await cms.publish(draft);
    const onDisk = JSON.parse(await backend.read(publishedPath("home"))) as typeof published;
    assert.equal(fingerprint(onDisk), fingerprint(published));
    assert.equal(fingerprint(JSON.parse(await backend.read(draftPath("home")))), fingerprint(published));
  });

  it("reports save, build, and publish as different failures", async () => {
    const { backend, cms } = await desk();
    const { draft } = await cms.open("home");

    backend.failNextWrite((path) => path.endsWith("/draft.json"), "Disk full while writing the draft.");
    await assert.rejects(cms.publish(draft), (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.phase, "save");
      assert.match(error.message, /Disk full/);
      return true;
    });

    await backend.write("content/home/build-fault.txt", "The static build exited with status 1.");
    await assert.rejects(cms.publish(draft), (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.phase, "build");
      assert.match(error.message, /status 1/);
      return true;
    });
    await backend.delete("content/home/build-fault.txt");

    backend.failNextWrite((path) => path.endsWith("/published.json"), "The published branch is protected.");
    await assert.rejects(cms.publish(draft), (error: unknown) => {
      assert.ok(error instanceof CmsError);
      assert.equal(error.phase, "publish");
      assert.match(error.message, /protected/);
      return true;
    });
    const saved = JSON.parse(await backend.read(draftPath("home"))) as { title: string };
    assert.equal(saved.title, "Field Desk");
  });

  it("reverts the draft to the published copy", async () => {
    const { cms } = await desk();
    const reverted = await cms.revert("lumen-rail");
    assert.equal(reverted.kind, "article");
    if (reverted.kind !== "article") return;
    assert.equal(
      reverted.blocks.some((block) => block.id === "note-draft-only"),
      false,
    );
  });

  it("stores an uploaded image and lists it", async () => {
    const { backend, cms } = await desk();
    const asset = await cms.upload({
      name: "yard-night.png",
      path: "media/yard-night.png",
      dataUrl: "data:image/png;base64,aaaa",
      width: 1,
      height: 1,
      scaled: false,
      originalWidth: 1,
      originalHeight: 1,
    });
    assert.equal(await backend.read(asset.path), asset.dataUrl);
    const listed = await cms.listMedia();
    assert.ok(listed.some((item) => item.name === "yard-night.png"));
  });

  it("implements branch and pull request methods without leaving the process", async () => {
    const { backend } = await desk();
    const branch = await backend.createBranch({ name: "desk/lumen-rail", from: "main" });
    const pull = await backend.openPullRequest({
      title: "Publish Lumen Rail",
      head: branch.name,
      base: "main",
    });
    const merged = await backend.mergePullRequest({ number: pull.number });
    assert.equal(merged.merged, true);
    assert.equal(pull.url.startsWith("memory://"), true);
    const drafts = await backend.listDrafts();
    assert.deepEqual(
      drafts.map((item) => item.id),
      ["home", "lumen-rail", "river-note"],
    );
  });
});
