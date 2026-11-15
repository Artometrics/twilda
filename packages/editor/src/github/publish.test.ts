import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBlock } from "../model";
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

  it("creates a branch and opens a pull request with a fake fetch", async () => {
    const hits: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      hits.push(`${init?.method ?? "GET"} ${url}`);
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
      if (url.includes("/git/ref/heads/twilda/draft/note")) return json({ message: "missing" }, 404);
      if (url.includes("/git/ref/heads/main")) return json({ object: { sha: "abc123" } });
      if (url.endsWith("/git/refs") && init?.method === "POST") return json({ object: { sha: "def456" } });
      if (url.includes("/contents/content/articles/note.json") && init?.method === "PUT") {
        return json({ commit: { sha: "def456" }, content: { path: "content/articles/note.json" } });
      }
      if (url.includes("/contents/content/articles/note.json")) return json({ message: "missing" }, 404);
      if (url.includes("/pulls?") && (init?.method ?? "GET") === "GET") return json([]);
      if (url.endsWith("/pulls") && init?.method === "POST") {
        return json({
          number: 7,
          html_url: "https://github.com/Artometrics/twilda/pull/7",
          title: "Publish Note",
          state: "open",
          head: { ref: "twilda/draft/note" },
          base: { ref: "main" },
        });
      }
      return json({ message: `unhandled ${url}` }, 500);
    };

    const pr = await openGithubPullRequest({
      token: "pasted-token",
      owner: "Artometrics",
      repo: "twilda",
      doc: {
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
      },
      fetchImpl,
    });
    assert.equal(pr.number, 7);
    assert.equal(pr.url, "https://github.com/Artometrics/twilda/pull/7");
    assert.equal(hits.some((hit) => hit.startsWith("POST") && hit.includes("/git/refs")), true);
    assert.equal(hits.some((hit) => hit.startsWith("POST") && hit.includes("/pulls")), true);
    assert.equal(hits.some((hit) => hit.includes("api.github.com") && hit.includes("example.com")), false);
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
