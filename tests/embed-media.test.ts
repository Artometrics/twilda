import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EMBED_FRAME_HOSTS, documentSchema, parseVideoUrl, renderDocument, type TwildaDocument } from "@twilda/core";
import { MAX_UPLOAD_EDGE, applyImageChoice, applyVideoChoice, fitWithin, mediaFileName, sniffImage } from "@twilda/core/edit";

const article = (embedSrc = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"): TwildaDocument =>
  documentSchema.parse({
    id: "clip",
    kind: "article",
    title: "Clip",
    slug: "clip",
    dek: "",
    kicker: "",
    byline: "",
    status: "draft",
    updatedAt: "2026-01-01T00:00:00.000Z",
    blocks: [
      { id: "i1", type: "image", src: "/media/plate-signal.svg", alt: "A plate", caption: "", role: "figure" },
      { id: "e1", type: "embed", kind: "video", src: embedSrc, title: "A clip", caption: "" },
    ],
  });

describe("video allowlist", () => {
  const ok: Array<[string, string, string]> = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x", "youtube", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "vimeo", "76979871"],
    ["https://player.vimeo.com/video/76979871?h=abc", "vimeo", "76979871"],
  ];
  it("accepts the providers' own addresses and rebuilds the canonical ones", () => {
    for (const [input, provider, id] of ok) {
      const video = parseVideoUrl(input);
      assert.equal(video?.provider, provider, input);
      assert.equal(video?.id, id, input);
      assert.ok(EMBED_FRAME_HOSTS.some((host) => video?.embedUrl.startsWith(`${host}/`)), input);
      assert.equal(video?.embedUrl.includes("?"), false, "no pasted query reaches the player");
    }
  });

  it("refuses look-alike hosts, other schemes, credentials, ports, and malformed ids", () => {
    const bad = [
      "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      "https://evil.test/youtube.com/watch?v=dQw4w9WgXcQ",
      "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com.evil.test/embed/dQw4w9WgXcQ",
      "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ",
      "https://user:pw@www.youtube.com/watch?v=dQw4w9WgXcQ",
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)//youtube.com/watch?v=dQw4w9WgXcQ",
      "data:text/html,<script>alert(1)</script>",
      "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      'https://www.youtube.com/watch?v=dQw4w9WgXc"onload="x',
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ%22%3E",
      "https://www.youtube.com/channel/UC1234567890123456789012",
      "https://vimeo.com/channels/staffpicks/76979871",
      "https://vimeo.com/abc",
      "https://player.vimeo.com/video/76979871abc",
      "https://vimeo.com.evil.test/76979871",
      "https://xn--vimeo-9ra.com/76979871",
      "",
      "   ",
      `https://www.youtube.com/watch?v=${"a".repeat(500)}`,
    ];
    for (const input of bad) assert.equal(parseVideoUrl(input), null, input);
  });

  it("prints a sandboxed, lazy iframe built from the id, and nothing else for a refused address", () => {
    const html = renderDocument(article());
    assert.match(html, /<iframe [^>]*src="https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ"/);
    assert.match(html, /sandbox="allow-scripts allow-same-origin allow-presentation"/);
    assert.match(html, /loading="lazy"/);
    assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
    assert.match(html, /<iframe [^>]*title="A clip"/);
    const evil = renderDocument({ ...article(), blocks: [{ id: "e1", type: "embed", kind: "video", src: "https://evil.test/v", title: "x", caption: "" }] } as TwildaDocument);
    assert.equal(evil.includes("<iframe"), false);
  });

  it("the site CSP frame-src lists exactly the allowlisted hosts", () => {
    const config = JSON.parse(readFileSync("firebase.json", "utf8")) as { hosting: Array<{ site?: string; target?: string; headers: Array<{ headers: Array<{ key: string; value: string }> }> }> };
    for (const entry of config.hosting.filter((item) => item.site === "twilda-510519" || item.target === "twilda-desk")) {
      const csp = entry.headers[0]?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
      const frame = /frame-src ([^;]+)/.exec(csp)?.[1]?.split(" ").sort();
      assert.deepEqual(frame, [...EMBED_FRAME_HOSTS].sort(), entry.site ?? entry.target);
      assert.doesNotMatch(csp, /frame-src[^;]*\*/);
    }
    const www = config.hosting.find((item) => item.target === "www");
    assert.doesNotMatch(JSON.stringify(www), /frame-src/);
  });

  it("applyVideoChoice stores the rebuilt watch address, not the pasted text", () => {
    const doc = article();
    const result = applyVideoChoice(doc, "blocks.1.src", "blocks.1.title", { url: "https://youtu.be/AAAAAAAAAAA?si=track&t=9", title: "  New   clip " });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const block = (result.doc as Extract<TwildaDocument, { kind: "article" }>).blocks[1] as { src: string; title: string };
    assert.equal(block.src, "https://www.youtube.com/watch?v=AAAAAAAAAAA");
    assert.equal(block.title, "New clip");
    for (const url of ["https://evil.test/x", "javascript:alert(1)", "https://youtube.com.evil.test/watch?v=AAAAAAAAAAA"]) {
      const refused = applyVideoChoice(doc, "blocks.1.src", "blocks.1.title", { url });
      assert.equal(refused.ok, false, url);
    }
    assert.equal(applyVideoChoice(doc, "blocks.1.src", "blocks.1.title", { title: "   " }).ok, false);
    assert.equal(applyVideoChoice(doc, "blocks.0.alt", "blocks.1.title", { url: "https://vimeo.com/76979871" }).ok, true, "a string ref is a string ref; the schema decides");
    assert.equal(applyVideoChoice(doc, "blocks.9.src", "blocks.1.title", { url: "https://vimeo.com/76979871" }).ok, false);
  });
});

describe("image choices", () => {
  it("accepts only repo media paths and requires alt text", () => {
    const doc = article();
    const ok = applyImageChoice(doc, "blocks.0.src", "blocks.0.alt", { src: "/media/new-photo.jpg", alt: "  A   photo " });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal((ok.doc as { blocks: Array<{ alt: string }> }).blocks[0]?.alt, "A photo");
    for (const src of ["https://evil.test/a.jpg", "/media/a.svg.exe", "/media/../secret.jpg", "media/a.jpg", "/media/A.JPG", "javascript:alert(1)", "data:image/png;base64,AAAA", "/media/a b.jpg", "/media/.jpg", `/media/${"a".repeat(100)}.jpg`]) {
      assert.equal(applyImageChoice(doc, "blocks.0.src", "blocks.0.alt", { src }).ok, false, src);
    }
    assert.equal(applyImageChoice(doc, "blocks.0.src", "blocks.0.alt", { alt: "   " }).ok, false);
  });
});

describe("upload preparation helpers", () => {
  it("fits within the edge limit without distorting", () => {
    assert.deepEqual(fitWithin(800, 600, MAX_UPLOAD_EDGE), { width: 800, height: 600, scaled: false });
    assert.deepEqual(fitWithin(4000, 3000, 1600), { width: 1600, height: 1200, scaled: true });
    assert.deepEqual(fitWithin(3000, 6000, 1600), { width: 800, height: 1600, scaled: true });
    assert.throws(() => fitWithin(0, 10, 1600));
    assert.throws(() => fitWithin(Number.NaN, 10, 1600));
  });

  it("names files from the content of the type, never from a path or an unsafe name", () => {
    assert.equal(mediaFileName("My Photo (1).PNG", "jpg"), "my-photo-1.jpg");
    assert.equal(mediaFileName("../../etc/passwd", "jpg"), "etc-passwd.jpg");
    assert.equal(mediaFileName("", "jpg"), "image.jpg");
    assert.equal(mediaFileName("日本語.png", "jpg"), "image.jpg");
    assert.equal(mediaFileName("a.jpg", "jpg", ["a.jpg"]), "a-2.jpg");
    assert.equal(mediaFileName("a.jpg", "jpg", ["a.jpg", "a-2.jpg", "A-3.jpg"]), "a-4.jpg");
    const long = mediaFileName(`${"x".repeat(200)}.jpg`, "jpg");
    assert.ok(long.length <= 56);
    assert.match(mediaFileName('"><script>.jpg', "jpg"), /^[a-z0-9][a-z0-9-]*\.jpg$/);
  });

  it("sniffs images from their first bytes, so a script named .jpg is not an image", () => {
    assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
    assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
    assert.equal(sniffImage(new TextEncoder().encode("GIF89a")), "gif");
    assert.equal(sniffImage(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "webp");
    assert.equal(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>")), null);
    assert.equal(sniffImage(new TextEncoder().encode("<script>alert(1)</script>")), null);
    assert.equal(sniffImage(new Uint8Array([])), null);
  });
});
