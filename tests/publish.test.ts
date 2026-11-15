import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GitHubBackend } from "../packages/backend-github/src/index";
import { gitBlobSha, mediaNames, planPublish, planSitePublish, publishDocument, publishSite } from "../packages/backend-github/src/publish";
import { defaultSite, documentSchema, serializeDocument, serializeSite, type TwildaDocument } from "@twilda/core";
import { createFakeGithub } from "./support/fake-github";

const access = (fake: ReturnType<typeof createFakeGithub>) => ({ token: "t", owner: "Artometrics", repo: "twilda", fetchImpl: fake.impl });

type Article = Extract<TwildaDocument, { kind: "article" }>;
const base: Article = {
  id: "note",
  kind: "article",
  title: "Note",
  slug: "note",
  dek: "Start",
  kicker: "Desk",
  byline: "A. Writer",
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
  blocks: [
    { id: "p1", type: "paragraph", text: "First paragraph." },
    { id: "p2", type: "paragraph", text: "Second paragraph." },
  ],
};
const edit = (doc: Article, id: string, text: string): Article => ({ ...doc, blocks: doc.blocks.map((block) => (block.id === id ? { ...block, text } : block)) as Article["blocks"] });
const seedMain = (fake: ReturnType<typeof createFakeGithub>, doc: TwildaDocument) => {
  fake.putMain(`content/${doc.id}/draft.json`, serializeDocument({ ...doc, status: "draft" }));
  fake.putMain(`content/${doc.id}/published.json`, serializeDocument({ ...doc, status: "published" }));
};
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 70, 73, 70, 0, 1]);
const imageDoc = (name: string): Article => ({
  ...base,
  blocks: [...base.blocks, { id: "i1", type: "image", src: `/media/${name}`, alt: "A photo", caption: "", role: "figure" }],
});

describe("publish: moved main", () => {
  it("publishes as it is when main still has the copy the draft started from", async () => {
    const fake = createFakeGithub();
    seedMain(fake, base);
    const ours = edit(base, "p1", "Ours.");
    const plan = await planPublish(access(fake), { base, doc: ours });
    assert.equal(plan.status, "current");
  });

  it("silently folds in changes to other fields, then opens the pull request with the merged page", async () => {
    const fake = createFakeGithub();
    const theirs = edit(base, "p2", "Theirs on main.");
    seedMain(fake, theirs);
    const ours = edit(base, "p1", "Ours.");
    const plan = await planPublish(access(fake), { base, doc: ours });
    assert.equal(plan.status, "rebased");
    const merged = plan.doc as Article;
    assert.deepEqual(merged.blocks.map((block) => (block as { text: string }).text), ["Ours.", "Theirs on main."]);
    const result = await publishDocument({ access: access(fake), doc: plan.doc, expectedTheirs: plan.theirsDigest });
    const onBranch = JSON.parse(fake.readText("twilda/draft/note", "content/note/published.json") ?? "{}") as Article;
    assert.deepEqual(onBranch.blocks.map((block) => (block as { text: string }).text), ["Ours.", "Theirs on main."]);
    assert.equal(result.number, 1);
  });

  it("hands back conflicts when both sides edited a field, and resolves them from the person's choices", async () => {
    const fake = createFakeGithub();
    seedMain(fake, edit(base, "p1", "Theirs."));
    const ours = edit(base, "p1", "Ours.");
    const plan = await planPublish(access(fake), { base, doc: ours });
    assert.equal(plan.status, "conflict");
    if (plan.status !== "conflict") return;
    assert.equal(plan.conflicts.length, 1);
    assert.equal(fake.writes().length, 0, "planning writes nothing");
    const key = plan.conflicts[0]!.key;
    for (const [choice, expected] of [["ours", "Ours."], ["theirs", "Theirs."]] as const) {
      const settled = await planPublish(access(fake), { base, doc: ours, decisions: { [key]: choice } });
      assert.equal(settled.status, "rebased", choice);
      assert.equal((settled.doc as Article).blocks[0] && ((settled.doc as Article).blocks[0] as { text: string }).text, expected);
    }
  });

  it("with no known base every difference is a conflict, so nothing on main is overwritten unseen", async () => {
    const fake = createFakeGithub();
    seedMain(fake, edit(base, "p1", "Theirs."));
    const plan = await planPublish(access(fake), { base: null, doc: edit(base, "p1", "Ours.") });
    assert.equal(plan.status, "conflict");
  });

  it("treats a copy this device already sent as its own, not as someone else's change", async () => {
    const fake = createFakeGithub();
    const sent = edit(base, "p1", "Sent earlier.");
    seedMain(fake, sent);
    const ours = edit(sent, "p2", "Edited after.");
    const without = await planPublish(access(fake), { base, doc: edit(ours, "p1", "Changed again.") });
    assert.equal(without.status, "conflict", "without the record, the earlier send looks like someone else");
    const withKnown = await planPublish(access(fake), { base, doc: edit(ours, "p1", "Changed again."), known: [sent] });
    assert.equal(withKnown.status, "current");
  });

  it("refuses to write if main moved again between the check and the write", async () => {
    const fake = createFakeGithub();
    seedMain(fake, base);
    const plan = await planPublish(access(fake), { base, doc: edit(base, "p1", "Ours.") });
    fake.putMain("content/note/draft.json", serializeDocument(edit(base, "p2", "Landed meanwhile.")));
    await assert.rejects(() => publishDocument({ access: access(fake), doc: plan.doc, expectedTheirs: plan.status === "conflict" ? null : plan.theirsDigest }), /main changed while you were publishing/);
    assert.equal(fake.writes().length, 0);
    assert.equal(fake.pulls.length, 0);
  });
});

describe("publish: branch and writes", () => {
  it("rebuilds a stale twilda/draft branch from main so old content cannot ride along", async () => {
    const fake = createFakeGithub();
    seedMain(fake, base);
    await new GitHubBackend({ owner: "Artometrics", repo: "twilda", token: "t", fetch: fake.impl }).resetBranch("twilda/draft/note");
    fake.branches.get("twilda/draft/note")?.set("content/note/STALE.json", Buffer.from("stale"));
    fake.putMain("README.md", "main moved");
    const mainHead = fake.heads.get("main");
    await publishDocument({ access: access(fake), doc: edit(base, "p1", "Fresh.") });
    assert.equal(fake.read("twilda/draft/note", "content/note/STALE.json"), undefined);
    assert.equal(fake.readText("twilda/draft/note", "README.md"), "main moved");
    const patches = fake.calls.filter((call) => call.method === "PATCH");
    assert.equal(patches.length, 1);
    assert.equal(patches[0]?.body?.force, true);
    assert.equal(patches[0]?.body?.sha, mainHead);
    assert.match(patches[0]!.path, /heads\/twilda\/draft\/note$/);
  });

  it("never writes to main and never force-moves anything but its own branches", async () => {
    const fake = createFakeGithub();
    seedMain(fake, base);
    await publishDocument({ access: access(fake), doc: edit(base, "p1", "Ours.") });
    await publishSite({ access: access(fake), site: defaultSite() });
    for (const call of fake.calls.filter((item) => item.method !== "GET")) {
      assert.notEqual(call.body?.branch, "main", `${call.method} ${call.path}`);
      if (call.method === "PATCH") assert.match(call.path, /heads\/twilda\/(draft\/[a-z0-9-]+|site)$/);
      assert.equal(/merge$/.test(call.path), false, "it never merges");
    }
    const backend = new GitHubBackend({ owner: "a", repo: "b", token: "t", fetch: fake.impl });
    await assert.rejects(() => backend.resetBranch("main"), /may be reset/);
    await assert.rejects(() => backend.resetBranch("release"), /may be reset/);
  });

  it("writes draft.json as a draft and published.json as published, with the same content", async () => {
    const fake = createFakeGithub();
    await publishDocument({ access: access(fake), doc: edit(base, "p1", "Ours."), now: () => new Date("2026-11-15T00:00:00.000Z") });
    const draft = JSON.parse(fake.readText("twilda/draft/note", "content/note/draft.json") ?? "{}");
    const published = JSON.parse(fake.readText("twilda/draft/note", "content/note/published.json") ?? "{}");
    assert.equal(draft.status, "draft");
    assert.equal(published.status, "published");
    assert.equal(published.updatedAt, "2026-11-15T00:00:00.000Z");
    assert.deepEqual({ ...draft, status: "x", updatedAt: "" }, { ...published, status: "x", updatedAt: "" });
    assert.doesNotThrow(() => documentSchema.parse(published));
  });

  it("refuses a page that does not pass the schema, before it touches the repo", async () => {
    const fake = createFakeGithub();
    const bad = { ...base, blocks: [{ id: "p1", type: "paragraph", text: "see [x](javascript:alert(1))" }] } as TwildaDocument;
    await assert.rejects(() => publishDocument({ access: access(fake), doc: bad }), /not ready to publish/);
    assert.equal(fake.calls.length, 0);
    await assert.rejects(() => publishDocument({ access: { ...access(fake), token: "  " }, doc: base }), /Sign in/);
  });
});

describe("publish: images", () => {
  it("commits uploaded bytes unchanged under public/media in the same pull request", async () => {
    const fake = createFakeGithub();
    const result = await publishDocument({ access: access(fake), doc: imageDoc("field-notes.jpg"), media: { "field-notes.jpg": JPEG.toString("base64") } });
    assert.deepEqual(fake.read("twilda/draft/note", "public/media/field-notes.jpg"), JPEG);
    assert.deepEqual(result.media, ["public/media/field-notes.jpg"]);
    assert.ok(result.files.includes("public/media/field-notes.jpg"));
    assert.equal(fake.pulls.length, 1);
    assert.match(fake.pulls[0]!.body, /public\/media\/field-notes\.jpg/);
    assert.equal(fake.read("main", "public/media/field-notes.jpg"), undefined);
  });

  it("commits only the images the page still prints", async () => {
    const fake = createFakeGithub();
    await publishDocument({ access: access(fake), doc: imageDoc("kept.jpg"), media: { "kept.jpg": JPEG.toString("base64"), "dropped.jpg": JPEG.toString("base64") } });
    assert.ok(fake.read("twilda/draft/note", "public/media/kept.jpg"));
    assert.equal(fake.read("twilda/draft/note", "public/media/dropped.jpg"), undefined);
    assert.deepEqual(mediaNames(imageDoc("kept.jpg")), ["kept.jpg"]);
  });

  it("does not re-commit an identical file, and renames when main has a different file of that name", async () => {
    const fake = createFakeGithub();
    fake.putMain("public/media/clash.jpg", JPEG);
    const same = await publishDocument({ access: access(fake), doc: imageDoc("clash.jpg"), media: { "clash.jpg": JPEG.toString("base64") } });
    assert.deepEqual(same.media, []);
    const other = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 9, 9, 9]);
    const renamed = await publishDocument({ access: access(fake), doc: imageDoc("clash.jpg"), media: { "clash.jpg": other.toString("base64") } });
    assert.deepEqual(renamed.media, ["public/media/clash-2.jpg"]);
    assert.deepEqual(fake.read("twilda/draft/note", "public/media/clash-2.jpg"), other);
    assert.equal((renamed.doc as Article).blocks.find((block) => block.type === "image") && ((renamed.doc as Article).blocks.find((block) => block.type === "image") as { src: string }).src, "/media/clash-2.jpg");
    assert.deepEqual(fake.read("main", "public/media/clash.jpg"), JPEG, "main's file is untouched");
  });

  it("refuses an oversized file and hostile names", async () => {
    const fake = createFakeGithub();
    const big = Buffer.alloc(1_100_000, 1);
    await assert.rejects(() => publishDocument({ access: access(fake), doc: imageDoc("big.jpg"), media: { "big.jpg": big.toString("base64") } }), /too large/);
    assert.equal(fake.writes().length, 0);
    for (const name of ["../escape.jpg", "a b.jpg", "x.exe"]) {
      assert.deepEqual(mediaNames({ ...base, blocks: [{ id: "i", type: "image", src: `/media/${name}`, alt: "x", caption: "", role: "figure" }] } as TwildaDocument), [], name);
    }
  });

  it("computes the same blob sha git does", async () => {
    const { createHash } = await import("node:crypto");
    const expected = createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${JPEG.length}\0`), JPEG])).digest("hex");
    assert.equal(await gitBlobSha(new Uint8Array(JPEG)), expected);
  });
});

describe("publish: site settings", () => {
  it("opens a pull request that changes only content/site.json", async () => {
    const fake = createFakeGithub();
    const site = defaultSite();
    site.theme.colors.paper = "#ffffff";
    const pr = await publishSite({ access: access(fake), site });
    assert.deepEqual(pr.files, ["content/site.json"]);
    assert.deepEqual(fake.writes().map((call) => call.path.split("/contents/")[1]), ["content/site.json"]);
    assert.equal(fake.pulls[0]?.head, "twilda/site");
    assert.equal(fake.readText("twilda/site", "content/site.json"), serializeSite(site));
  });

  it("merges unrelated changes on main and reports the same setting changed on both sides", async () => {
    const fake = createFakeGithub();
    const start = defaultSite();
    const theirs = structuredClone(start);
    theirs.chrome.name = "Their Desk";
    fake.putMain("content/site.json", serializeSite(theirs));
    const ours = structuredClone(start);
    ours.theme.colors.paper = "#ffffff";
    const merged = await planSitePublish(access(fake), { base: start, site: ours });
    assert.equal(merged.status, "rebased");
    assert.equal(merged.site.chrome.name, "Their Desk");
    assert.equal(merged.site.theme.colors.paper, "#ffffff");
    const clash = structuredClone(start);
    clash.chrome.name = "My Desk";
    const conflict = await planSitePublish(access(fake), { base: start, site: clash });
    assert.equal(conflict.status, "conflict");
    await assert.rejects(() => publishSite({ access: access(fake), site: ours, expectedTheirs: serializeSite(start) }), /main changed/);
  });
});
