import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { headersFor, hostingTarget, parsePolicy, policyProblems } from "../../../tests/support/csp";
import { auditOutput, walk } from "../../../tests/support/dist";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-desk-"));
const csp = headersFor(hostingTarget("desk")).get("Content-Security-Policy") as string;
const policy = parsePolicy(csp);

before(async () => {
  await build({ root, logLevel: "silent", build: { outDir: scratch, emptyOutDir: true } });
});

after(() => fs.rmSync(scratch, { recursive: true, force: true }));

describe("the built desk against the policy Firebase sends for twilda-desk", () => {
  it("the policy itself is the strict one", () => {
    assert.deepEqual(
      policyProblems(policy, {
        runsScript: true,
        images: "self-data-blob",
        connect: ["'self'", "https://api.github.com"],
        frames: ["'self'", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
        workers: ["'self'"],
      }),
      [],
    );
  });

  it("loads only same-origin module scripts and stylesheets, with nothing inline", () => {
    assert.deepEqual(auditOutput(scratch, { policy, runsScript: true }), []);
  });

  it("is a static folder: no source maps, no server files, no environment files", () => {
    const names = walk(scratch).map((file) => path.relative(scratch, file));
    assert.ok(names.includes("index.html"));
    for (const name of names) assert.doesNotMatch(name, /\.map$|\.env|node_modules|\.ts$|\.tsx$/);
  });

  it("holds no token, key, or client secret in any built file", () => {
    for (const file of walk(scratch)) {
      if (!/\.(?:html|js|css|json|webmanifest|svg)$/.test(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(text, /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|client_secret/i, path.relative(scratch, file));
    }
  });
});
