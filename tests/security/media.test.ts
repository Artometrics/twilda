import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RASTER_BYTES, auditSvg, inspectUpload, sniffImage } from "@twilda/core";
import { mediaNames, publishDocument } from "../../packages/backend-github/src/publish";
import type { TwildaDocument } from "@twilda/core";
import { createFakeGithub } from "../support/fake-github";

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13];
const GIF_HEAD = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0];
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20];

const bytes = (head: number[], tail = "") => Uint8Array.from([...head, ...Buffer.from(tail, "latin1")]);

test("real raster images are accepted under a matching name", () => {
  assert.equal(inspectUpload("photo.jpg", bytes(JPEG_HEAD, "payload")), null);
  assert.equal(inspectUpload("photo.png", bytes(PNG_HEAD, "payload")), null);
  assert.equal(inspectUpload("photo.gif", bytes(GIF_HEAD, "payload")), null);
  assert.equal(inspectUpload("photo.webp", bytes(WEBP_HEAD, "payload")), null);
});

test("file names that traverse, hide, or double-extend are refused", () => {
  const names = [
    "../evil.jpg",
    "..\\evil.jpg",
    "a/../b.jpg",
    "/etc/passwd.jpg",
    "sub/dir.jpg",
    "evil.jpg/",
    ".htaccess",
    ".jpg",
    "-lead.jpg",
    "photo.jpg.php",
    "photo.php.jpg",
    "photo.JPG",
    "Photo.jpg",
    "photo .jpg",
    "photo.jpg ",
    "photo\u0000.jpg",
    "photo.jpg\u0000.php",
    "photo%2e%2e.jpg",
    "photo%00.jpg",
    "con.jpg ",
    "photo.html",
    "photo.js",
    "photo.svgz",
    "photo.jpg;.php",
    "ph\u043eto.jpg",
    "photo\u202egpj.exe",
    `${"a".repeat(90)}.jpg`,
    "",
  ];
  for (const name of names) {
    assert.notEqual(inspectUpload(name, bytes(JPEG_HEAD, "x")), null, `accepted ${JSON.stringify(name)}`);
  }
});

test("bytes must match the extension, not just look like an image at the start", () => {
  assert.match(inspectUpload("a.png", bytes(JPEG_HEAD, "x")) ?? "", /JPEG image, not a \.png/);
  assert.match(inspectUpload("a.jpg", Uint8Array.from(Buffer.from("<html><script>alert(1)</script>"))) ?? "", /not a JPEG/);
  assert.match(inspectUpload("a.jpg", Uint8Array.from(Buffer.from("GIF89a<script>alert(1)</script>"))) ?? "", /./);
  assert.match(inspectUpload("a.gif", Uint8Array.from(Buffer.from("MZ\u0090\u0000"))) ?? "", /not a JPEG, PNG/);
  assert.equal(sniffImage(Uint8Array.from(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))), null);
});

test("polyglots: a valid image header with script or markup behind it is refused", () => {
  const trailers = [
    "<script>alert(1)</script>",
    "<SCRIPT SRC=//evil.example/x.js></SCRIPT>",
    "<svg onload=alert(1)>",
    "<html><body onload=alert(1)>",
    "<iframe src=javascript:alert(1)>",
    "<?php system($_GET['c']); ?>",
    "<object data=x>",
    "<style>*{}</style>",
    "<meta http-equiv=refresh content=0;url=//evil.example>",
    "javascript:alert(1)",
    "<a onclick='alert(1)'>",
    "<foreignObject>",
  ];
  for (const [name, head] of [["a.jpg", JPEG_HEAD], ["a.png", PNG_HEAD], ["a.gif", GIF_HEAD], ["a.webp", WEBP_HEAD]] as const) {
    for (const trailer of trailers) {
      assert.match(inspectUpload(name, bytes(head, `\u0000\u0001${trailer}`)) ?? "", /markup or script/, `${name} + ${trailer}`);
    }
  }
});

test("size and emptiness limits", () => {
  assert.match(inspectUpload("a.jpg", bytes(JPEG_HEAD).slice(0, 0)) ?? "", /empty/);
  assert.match(inspectUpload("a.jpg", new Uint8Array(MAX_RASTER_BYTES + 1).fill(0xff)) ?? "", /larger than/);
  const justUnder = new Uint8Array(MAX_RASTER_BYTES);
  justUnder.set(JPEG_HEAD);
  assert.equal(inspectUpload("a.jpg", justUnder), null);
});

test("SVG is never accepted from a device", () => {
  assert.match(inspectUpload("plate.svg", Uint8Array.from(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))) ?? "", /SVG cannot be uploaded/);
});

test("the SVG audit flags every way an SVG can run code or reach out", () => {
  const SAFE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#243126"/><use href="#a"/></svg>`;
  assert.deepEqual(auditSvg(SAFE), []);
  const hostile: Array<[string, string]> = [
    ["script element", `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`],
    ["script, mixed case", `<svg xmlns="http://www.w3.org/2000/svg"><ScRiPt>alert(1)</sCrIpT></svg>`],
    ["onload", `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`],
    ["onload without quotes", `<svg xmlns="http://www.w3.org/2000/svg" onload=alert(1)></svg>`],
    ["onclick on a child", `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)"/></svg>`],
    ["javascript url", `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>x</text></a></svg>`],
    ["javascript url with tab", `<svg xmlns="http://www.w3.org/2000/svg"><a href="java&#9;script:alert(1)"><text>x</text></a></svg>`],
    ["external href", `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>`],
    ["external xlink:href", `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="https://evil.example/x.png"/></svg>`],
    ["data html", `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:text/html,<script>alert(1)</script>"/></svg>`],
    ["foreignObject", `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>`],
    ["iframe", `<svg xmlns="http://www.w3.org/2000/svg"><iframe src="x"/></svg>`],
    ["animate to javascript", `<svg xmlns="http://www.w3.org/2000/svg"><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>`],
    ["set", `<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="href" to="x"/></a></svg>`],
    ["doctype entity", `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>`],
    ["xml-stylesheet", `<?xml-stylesheet href="https://evil.example/x.css"?><svg xmlns="http://www.w3.org/2000/svg"/>`],
    ["css import", `<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(//evil.example/x.css);</style></svg>`],
    ["css url", `<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://evil.example/x)"/></svg>`],
    ["not an svg at all", `<html><script>alert(1)</script></html>`],
    ["html with svg later", `<html><body><svg/></body></html>`],
    ["empty", ``],
  ];
  for (const [label, svg] of hostile) {
    assert.ok(auditSvg(svg).length > 0, `audit passed: ${label}`);
  }
});

test("shipped SVG media passes the audit", async () => {
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  for (const dir of ["public/media", "public", "examples/studio/public/media", "packages/editor/public"]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".svg"))) {
      assert.deepEqual(auditSvg(readFileSync(`${dir}/${file}`, "utf8")), [], `${dir}/${file}`);
    }
  }
});

const doc = (src: string): TwildaDocument => ({
  id: "note",
  kind: "article",
  title: "Note",
  slug: "note",
  dek: "Start",
  kicker: "Desk",
  byline: "A. Writer",
  status: "draft",
  updatedAt: "2026-01-01T00:00:00.000Z",
  blocks: [{ id: "i1", type: "image", src, alt: "A photo", caption: "", role: "figure" }],
});

const access = (fake: ReturnType<typeof createFakeGithub>) => ({ token: "t", owner: "Artometrics", repo: "twilda", fetchImpl: fake.impl });

test("publish refuses hostile uploads before any commit is written", async () => {
  const hostileUploads: Array<[string, Buffer]> = [
    ["evil.jpg", Buffer.from([...JPEG_HEAD, ...Buffer.from("<script>alert(1)</script>")])],
    ["evil.png", Buffer.from(JPEG_HEAD)],
    ["evil.svg", Buffer.from(`<svg onload="alert(1)"/>`)],
    ["big.jpg", Buffer.concat([Buffer.from(JPEG_HEAD), Buffer.alloc(MAX_RASTER_BYTES)])],
  ];
  for (const [name, content] of hostileUploads) {
    const fake = createFakeGithub();
    await assert.rejects(
      () => publishDocument({ access: access(fake), doc: doc(`/media/${name}`), media: { [name]: content.toString("base64") } }),
      (error: Error & { code?: string }) => {
        assert.ok(["media-rejected", "media-too-large", "invalid-document"].includes(error.code ?? ""), `${name}: ${error.code} ${error.message}`);
        return true;
      },
      name,
    );
    assert.deepEqual(
      fake.calls.filter((call) => call.method !== "GET"),
      [],
      `${name}: nothing may be written when the upload is refused`,
    );
  }
});

test("a non-image name in the media map is never written, even when the draft points at it", async () => {
  const fake = createFakeGithub();
  await publishDocument({ access: access(fake), doc: doc("/media/page.html"), media: { "page.html": Buffer.from("<html><script>alert(1)</script>").toString("base64") } });
  const written = fake.calls.filter((call) => call.method === "PUT").map((call) => decodeURIComponent(call.path.split("/contents/")[1] ?? ""));
  assert.ok(!written.some((path) => path.startsWith("public/")), written.join(", "));
});

test("publish only writes media the document references, whatever other keys the caller sends", async () => {
  const fake = createFakeGithub();
  const jpeg = Buffer.from(JPEG_HEAD).toString("base64");
  const extra = ["../../.github/workflows/x.jpg", "..%2f..%2fx.jpg", "a/b.jpg", "x.jpg/../../y.jpg", "unreferenced.jpg"];
  const media: Record<string, string> = { "ok.jpg": jpeg };
  for (const name of extra) media[name] = jpeg;
  await publishDocument({ access: access(fake), doc: doc("/media/ok.jpg"), media });
  const written = fake.calls.filter((call) => call.method === "PUT").map((call) => decodeURIComponent(call.path.split("/contents/")[1] ?? ""));
  assert.deepEqual(written.sort(), ["content/note/draft.json", "content/note/published.json", "public/media/ok.jpg"]);
  assert.deepEqual(mediaNames(doc("/media/ok.jpg")), ["ok.jpg"]);
});

test("publish refuses oversized base64 without decoding it", async () => {
  const fake = createFakeGithub();
  const huge = "A".repeat(60_000_000);
  const started = performance.now();
  await assert.rejects(() => publishDocument({ access: access(fake), doc: doc("/media/big.jpg"), media: { "big.jpg": huge } }));
  assert.ok(performance.now() - started < 2000, "rejection must be cheap");
  assert.deepEqual(fake.calls.filter((call) => call.method !== "GET"), []);
});

test("publish refuses bytes that are not base64", async () => {
  const fake = createFakeGithub();
  await assert.rejects(() => publishDocument({ access: access(fake), doc: doc("/media/x.jpg"), media: { "x.jpg": "%%%not base64%%%" } }));
  assert.deepEqual(fake.calls.filter((call) => call.method !== "GET"), []);
});
