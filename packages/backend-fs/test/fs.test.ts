import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FsBackend } from "../src/index";
import { serializeDocument } from "../../core/src/serialize";
import { sampleArticles } from "../../core/src/sample";

test("filesystem backend writes a real file per branch", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "twilda-fs-"));
  const backend = FsBackend.open(root);
  await backend.write("content/articles/franchise.json", serializeDocument(sampleArticles.franchise));
  const mirror = path.join(root, "tree", encodeURIComponent("main"), "content/articles/franchise.json");
  assert.equal(fs.existsSync(mirror), true);
  assert.match(fs.readFileSync(mirror, "utf8"), /Merchandise Owns the Ledger/);
  const reopened = FsBackend.open(root);
  const read = await reopened.read("content/articles/franchise.json");
  assert.match(read.text, /Merchandise Owns the Ledger/);
});
