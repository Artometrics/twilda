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
  it("does not keep the old hosting or secret templates", () => {
    for (const file of ["firebase.json", ".firebaserc", "netlify.toml", ".env", ".env.example", "app.json"]) {
      assert.equal(existsSync(file), false, file);
    }
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
