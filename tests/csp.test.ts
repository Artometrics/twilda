import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { EDIT_CSP } from "../astro.edit.config";
import { headersFor, hostingConfig, hostingTarget, parsePolicy, policyProblems, type Target } from "./support/csp";

const STREAMS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];

const EXPECT: Record<Target, { runsScript: boolean; images: "self" | "self-data-blob"; connect: string[]; frames: string[]; workers: string[]; referrer: string }> = {
  site: { runsScript: false, images: "self", connect: ["'none'"], frames: STREAMS, workers: ["'none'"], referrer: "strict-origin-when-cross-origin" },
  www: { runsScript: false, images: "self", connect: ["'none'"], frames: ["'none'"], workers: ["'none'"], referrer: "strict-origin-when-cross-origin" },
  desk: { runsScript: true, images: "self-data-blob", connect: ["'self'", "https://api.github.com"], frames: ["'self'", ...STREAMS], workers: ["'self'"], referrer: "no-referrer" },
};

describe("firebase.json response headers", () => {
  for (const target of ["site", "desk", "www"] as const) {
    const expected = EXPECT[target];
    const entry = hostingTarget(target);
    const headers = headersFor(entry);

    it(`${target}: the Content-Security-Policy is strict and exact`, () => {
      const csp = headers.get("Content-Security-Policy");
      assert.ok(csp, "no Content-Security-Policy header");
      const policy = parsePolicy(csp);
      assert.deepEqual(policyProblems(policy, expected), []);
      assert.ok(policy.has("upgrade-insecure-requests"));
      assert.equal(csp.includes("unsafe-"), false, "no unsafe-* keyword anywhere");
      for (const required of ["manifest-src"]) assert.ok(policy.has(required), `${required} is not set`);
    });

    it(`${target}: clickjacking, sniffing, referrer, isolation, and transport headers are set`, () => {
      assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal(headers.get("X-Frame-Options"), "DENY");
      assert.equal(headers.get("Referrer-Policy"), expected.referrer);
      assert.equal(headers.get("Cross-Origin-Opener-Policy"), "same-origin");
      assert.equal(headers.get("Cross-Origin-Resource-Policy"), "same-origin");
      assert.equal(headers.get("X-Permitted-Cross-Domain-Policies"), "none");
      assert.match(headers.get("X-Robots-Tag") ?? "", /noindex/);
      const hsts = /max-age=(\d+)/.exec(headers.get("Strict-Transport-Security") ?? "");
      assert.ok(hsts && Number(hsts[1]) >= 31_536_000, "HSTS must last at least a year");
      assert.doesNotMatch(headers.get("Strict-Transport-Security") ?? "", /preload/, "preload is a one-way door; leave it to the owner");
    });

    it(`${target}: powerful browser features are denied`, () => {
      const permissions = headers.get("Permissions-Policy") ?? "";
      for (const feature of ["camera", "microphone", "geolocation", "payment", "usb", "serial", "bluetooth", "accelerometer", "gyroscope", "magnetometer", "interest-cohort"]) {
        assert.match(permissions, new RegExp(`${feature}=\\(\\)`), feature);
      }
    });

    it(`${target}: no header opens the origin to other sites`, () => {
      for (const group of entry.headers) {
        for (const header of group.headers) {
          assert.ok(!/^access-control-allow-/i.test(header.key), `${header.key} must not be set`);
        }
      }
    });
  }

  it("the magazine and marketing sites keep hashed assets immutable and everything else revalidated", () => {
    for (const target of ["site", "www"] as const) {
      const entry = hostingTarget(target);
      assert.equal(headersFor(entry).get("Cache-Control"), "public, max-age=0, must-revalidate");
      assert.equal(headersFor(entry, "/_astro/**").get("Cache-Control"), "public, max-age=31536000, immutable");
    }
  });

  it("each target publishes its own folder and never another project's", () => {
    const entries = hostingConfig();
    assert.deepEqual(entries.map((entry) => entry.public).sort(), ["dist", "packages/editor/dist", "www/dist"]);
    assert.equal(entries.filter((entry) => entry.site).length, 1);
    assert.equal(entries.find((entry) => entry.site)?.site, "twilda-510519");
    const rc = fs.readFileSync(".firebaserc", "utf8");
    assert.ok(!/artometrics-510519|private_key|token|secret|password/i.test(rc), ".firebaserc holds project ids only");
  });
});

describe("the edit build's policy", () => {
  it("is as strict as the desk, with the same two outside origins at most", () => {
    const policy = parsePolicy(EDIT_CSP);
    assert.deepEqual(
      policyProblems(policy, { runsScript: true, images: "self-data-blob", connect: ["'self'", "https://api.github.com"], frames: STREAMS, workers: ["'none'"] }),
      [],
    );
    assert.ok(!EDIT_CSP.includes("unsafe-"));
    assert.deepEqual(policy.get("worker-src"), ["'none'"]);
    assert.deepEqual(policy.get("manifest-src"), ["'none'"]);
  });
});

describe("the desk's preview frame", () => {
  it("is a static page with no inline script, no inline style, and a linked stylesheet", () => {
    const html = fs.readFileSync("packages/editor/public/preview-frame.html", "utf8");
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<style/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
    assert.match(html, /<link rel="stylesheet" href="\/preview-frame\.css"/);
  });
});
