import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

describe("repository boundaries", () => {
  it("does not keep secret templates or a Netlify config", () => {
    for (const file of ["netlify.toml", ".env", ".env.example", "app.json"]) {
      assert.equal(existsSync(file), false, file);
    }
  });

  it("pins the editor dev server to loopback", () => {
    const config = readFileSync("editor/vite.config.ts", "utf8");
    assert.match(config, /host:\s*"127\.0\.0\.1"/);
  });

  it("records Firebase Hosting headers for the static dist", () => {
    type HostingSite = {
      site: string;
      public: string;
      ignore: string[];
      cleanUrls: boolean;
      trailingSlash: boolean;
      redirects?: { source: string; destination: string; type: number }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const config = JSON.parse(readFileSync("firebase.json", "utf8")) as { hosting: HostingSite[] };
    assert.equal(Array.isArray(config.hosting), true);
    const magazine = config.hosting.find((site) => site.site === "twilda-510519");
    const desk = config.hosting.find((site) => site.site === "twilda-desk-510519");
    assert.ok(magazine, "magazine hosting site is missing");
    assert.ok(desk, "desk hosting site is missing");
    assert.equal(magazine.public, "dist");
    assert.deepEqual(magazine.ignore, ["firebase.json", "**/node_modules/**"]);
    assert.equal(magazine.cleanUrls, true);
    assert.equal(magazine.trailingSlash, false);
    assert.ok(magazine.redirects?.some((row) => row.source === "/desk" && row.destination === "https://twilda-desk-510519.web.app/"));
    const bySource = new Map(magazine.headers.map((entry) => [entry.source, entry.headers]));
    const common = new Map(bySource.get("**")?.map((header) => [header.key, header.value]));
    assert.equal(common.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
    assert.equal(common.get("Cache-Control"), "public, max-age=0, must-revalidate");
    assert.equal(common.get("X-Content-Type-Options"), "nosniff");
    assert.equal(common.get("X-Frame-Options"), "DENY");
    assert.equal(common.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(
      common.get("Permissions-Policy"),
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    );
    assert.equal(
      common.get("Content-Security-Policy"),
      "default-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; img-src 'self'; font-src 'self'; style-src 'self'; script-src 'none'; upgrade-insecure-requests",
    );
    const hashed = new Map(bySource.get("/_astro/**")?.map((header) => [header.key, header.value]));
    assert.equal(hashed.get("Cache-Control"), "public, max-age=31536000, immutable");

    assert.equal(desk.public, "packages/editor/dist");
    const deskHeaders = new Map(
      desk.headers.find((entry) => entry.source === "**")?.headers.map((header) => [header.key, header.value]),
    );
    assert.equal(deskHeaders.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
    assert.match(deskHeaders.get("Content-Security-Policy") ?? "", /script-src 'self'/);
    assert.match(deskHeaders.get("Content-Security-Policy") ?? "", /script-src(?! 'none')/);

    const rc = JSON.parse(readFileSync(".firebaserc", "utf8")) as { projects: { default: string } };
    assert.deepEqual(Object.keys(rc), ["projects"]);
    assert.deepEqual(rc.projects, { default: "twilda-510519" });
  });

  it("has no deploy script", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    for (const [name, command] of Object.entries(pkg.scripts)) {
      assert.equal(/deploy|firebase|netlify|twilda-510519|artometrics-510519/i.test(`${name} ${command}`), false);
    }
  });

  it("keeps the editor out of the Astro source", () => {
    const hits = walk("src").filter((file) => {
      const text = readFileSync(file, "utf8");
      return text.includes("editor/") || text.includes("twilda-surface") || text.includes("/api/documents");
    });
    assert.deepEqual(hits, []);
  });

  it("mentions the previous product only as history, not as a live target", () => {
    const history = readFileSync("HISTORY.md", "utf8");
    assert.match(history, /106b96f/);
    assert.match(history, /Expo/);
  });
});
