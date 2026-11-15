import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFakeGithub } from "../../../../tests/support/fake-github";
import { createBlock, type Doc } from "../model";
import { deviceFlowAvailable, githubOwner, githubRepo } from "./config";
import { describeAuthError, openGithubPullRequest } from "./publish";

describe("openGithubPullRequest", () => {
  it("does not call the network without a token", async () => {
    let called = false;
    await assert.rejects(
      () =>
        openGithubPullRequest({
          token: "  ",
          owner: "Artometrics",
          repo: "twilda",
          doc: {
            id: "note",
            kind: "article",
            title: "Note",
            slug: "note",
            dek: "",
            kicker: "",
            byline: "",
            status: "draft",
            updatedAt: "2026-11-15T00:00:00.000Z",
            blocks: [createBlock("paragraph", "p1")],
          },
          fetchImpl: async () => {
            called = true;
            throw new Error("network");
          },
        }),
      /needs a token/,
    );
    assert.equal(called, false);
  });

  it("creates the branch, writes draft and published, and opens a pull request", async () => {
    const fake = createFakeGithub();
    fake.putMain("README.md", "x");
    const doc: Doc = {
      id: "note",
      kind: "article",
      title: "Note",
      slug: "note",
      dek: "A note",
      kicker: "",
      byline: "Desk",
      status: "draft",
      updatedAt: "2026-11-15T00:00:00.000Z",
      blocks: [{ id: "p1", type: "paragraph", text: "Hello from the desk." }],
    };
    const pr = await openGithubPullRequest({ token: "pasted-token", owner: "Artometrics", repo: "twilda", doc, fetchImpl: fake.impl });
    assert.equal(pr.number, 1);
    assert.equal(pr.url, "https://github.com/Artometrics/twilda/pull/1");
    assert.equal(pr.rebased, false);
    assert.deepEqual(
      fake.writes().map((call) => call.path.split("/contents/")[1]),
      ["content/note/draft.json", "content/note/published.json"],
    );
    assert.equal(JSON.parse(fake.readText("twilda/draft/note", "content/note/published.json") ?? "{}").status, "published");
    assert.equal(fake.readText("main", "content/note/published.json"), undefined, "main is never written");
    assert.ok(fake.calls.every((call) => call.auth === "Bearer pasted-token"));
  });

  it("carries an uploaded image in the same pull request and prints no image that is not committed", async () => {
    const fake = createFakeGithub();
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const doc: Doc = {
      id: "note",
      kind: "article",
      title: "Note",
      slug: "note",
      dek: "",
      kicker: "",
      byline: "",
      status: "draft",
      updatedAt: "2026-11-15T00:00:00.000Z",
      blocks: [{ id: "i1", type: "image", src: "/media/field-notes.jpg", alt: "A notebook", caption: "", role: "figure" }],
    };
    const pr = await openGithubPullRequest({
      token: "t",
      owner: "Artometrics",
      repo: "twilda",
      doc,
      media: { "field-notes.jpg": jpeg.toString("base64"), "unused.jpg": jpeg.toString("base64") },
      fetchImpl: fake.impl,
    });
    assert.equal(pr.number, 1);
    assert.deepEqual(fake.read("twilda/draft/note", "public/media/field-notes.jpg"), jpeg);
    assert.equal(fake.read("twilda/draft/note", "public/media/unused.jpg"), undefined, "an image the page does not print is not committed");
  });

  it("refuses without a token and never calls the network", async () => {
    const fake = createFakeGithub();
    await assert.rejects(
      () => openGithubPullRequest({ token: " ", owner: "a", repo: "b", doc: { id: "x" } as Doc, fetchImpl: fake.impl }),
      /needs a token/,
    );
    assert.equal(fake.calls.length, 0);
  });
});

describe("sign-in defaults", () => {
  it("defaults to token paste: no client id or proxy means no device flow", () => {
    assert.equal(deviceFlowAvailable(), false);
    assert.equal(githubOwner(), "Artometrics");
    assert.equal(githubRepo(), "twilda");
  });

  it("explains a blocked device flow and points at the proxy hook", () => {
    assert.match(describeAuthError(new TypeError("Failed to fetch"), ""), /Paste a token/);
    assert.match(describeAuthError(new TypeError("Failed to fetch"), "https://proxy.test"), /PUBLIC_TWILDA_DEVICE_FLOW_PROXY/);
    assert.equal(describeAuthError(new Error("expired"), ""), "expired");
  });
});
