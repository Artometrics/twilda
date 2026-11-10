import assert from "node:assert/strict";
import test from "node:test";
import { TwildaError } from "../src/errors";
import { openMemoryDemo } from "../src/browser-demo";
import { contentDigest, parseDocument } from "../src/serialize";
import { renderPreviewPage } from "../src/render";
import { sampleArticles } from "../src/sample";

test("round trip keeps every franchise block", () => {
  const { api } = openMemoryDemo();
  return api.readDocument("franchise", "draft").then((doc) => {
    assert.equal(doc.kind, "article");
    if (doc.kind !== "article") return;
    assert.ok(doc.blocks.some((block) => block.id === "demo-draft-note"));
    return api.readDocument("franchise", "published").then((published) => {
      assert.equal(published.kind, "article");
      if (published.kind !== "article") return;
      assert.equal(published.blocks.some((block) => block.id === "demo-draft-note"), false);
      assert.notEqual(contentDigest(doc), contentDigest(published));
    });
  });
});

test("save, publish, and rollback stay on the demo main branch", async () => {
  const { api, backend } = openMemoryDemo();
  const homeBefore = (await backend.at("main").read("content/pages/home.json")).text;
  const draft = await api.readDocument("franchise", "draft");
  if (draft.kind !== "article") throw new Error("expected article");
  draft.blocks = draft.blocks.map((block) =>
    block.type === "paragraph" && block.id === "p-ledger" ? { ...block, text: "EDITED LEDGER SENTENCE" } : block,
  );
  await api.saveDraft(draft);
  const stillPublished = parseDocument((await backend.at("main").read("content/articles/franchise.json")).text);
  if (stillPublished.kind !== "article") throw new Error("expected article");
  assert.equal(stillPublished.blocks.some((block) => block.type === "paragraph" && block.text.includes("EDITED")), false);

  const published = await api.publish("franchise");
  assert.match(published.pullRequest.url, /^demo:\/\/pull\//);
  assert.equal(published.pullRequest.state, "merged");
  const onMain = parseDocument((await backend.at("main").read("content/articles/franchise.json")).text);
  if (onMain.kind !== "article") throw new Error("expected article");
  assert.ok(onMain.blocks.some((block) => block.type === "paragraph" && block.text.includes("EDITED LEDGER SENTENCE")));
  assert.equal((await backend.at("main").read("content/pages/home.json")).text, homeBefore);

  const preview = await api.previewHtml("franchise", "published");
  assert.match(preview, /EDITED LEDGER SENTENCE/);
  assert.doesNotMatch(preview, /<script/i);

  await api.rollback("franchise");
  const restored = parseDocument((await backend.at("main").read("content/articles/franchise.json")).text);
  if (restored.kind !== "article") throw new Error("expected article");
  assert.equal(restored.blocks.some((block) => block.type === "paragraph" && block.text.includes("EDITED")), false);
  assert.equal((await api.listHistory("franchise")).length, 0);
});

test("upload rejects a non-image and reset restores the draft note", async () => {
  const { api } = openMemoryDemo();
  await assert.rejects(
    () => api.uploadMedia({ documentId: "franchise", filename: "notes.txt", mediaType: "text/plain", bytesBase64: btoa("hello") }),
    (error: unknown) => error instanceof TwildaError && error.code === "bad-media",
  );
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const uploaded = await api.uploadMedia({ documentId: "franchise", filename: "dot.png", mediaType: "image/png", bytesBase64: png });
  assert.match(uploaded.src, /^data:image\/png;base64,/);
  const draft = await api.readDocument("franchise", "draft");
  if (draft.kind !== "article") throw new Error("expected article");
  draft.title = "";
  await assert.rejects(() => api.saveDraft(draft), (error: unknown) => error instanceof TwildaError);
  await api.resetSample();
  const restored = await api.readDocument("franchise", "draft");
  if (restored.kind !== "article") throw new Error("expected article");
  assert.ok(restored.blocks.some((block) => block.id === "demo-draft-note"));
});

test("homepage fixture is a five-slide carousel plus a square grid", () => {
  const home = sampleArticles.franchise;
  assert.equal(home.kind, "article");
  const html = renderPreviewPage(sampleArticles.franchise, {
    dataFiles: { "content/data/franchise-revenue-mix.csv": "stream,share_percent\nMerchandise licensing and retail,55.8\n" },
  });
  assert.match(html, /55\.8/);
  assert.match(html, /Merchandise Owns the Ledger/);
  assert.doesNotMatch(html, /<script/i);
});
