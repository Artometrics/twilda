import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * The workflows run on pull requests, and a pull request is hostile input. These checks read the
 * YAML as text, so they have no parser to trust and nothing to install.
 */

const DIR = ".github/workflows";
/** The hosting workflows need id-token (WIF), checks and pull-requests (preview comment). Their jobs are gated below. */
const HOSTING = ["firebase-deploy.yml", "firebase-deploy-www.yml", "firebase-deploy-desk.yml"];
const files = fs.readdirSync(DIR).filter((name) => /\.ya?ml$/.test(name));
const text = (name: string) => fs.readFileSync(path.join(DIR, name), "utf8");

/** `github.event.*` and `github.head_ref` fields an outside contributor controls. */
const UNTRUSTED = /\$\{\{[^}]*(?:github\.event\.(?:pull_request\.(?:title|body|head\.(?:ref|label|repo\.(?:description|homepage)))|issue\.(?:title|body)|comment\.body|review\.body|review_comment\.body|head_commit\.(?:message|author\.(?:name|email))|commits\b|pages\b)|github\.head_ref)[^}]*\}\}/;

function runBlocks(source: string): string[] {
  const lines = source.split("\n");
  const blocks: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    const indent = match[1].length;
    const body = [match[2]];
    if (/^[|>]/.test(match[2])) {
      body.length = 0;
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j];
        if (next.trim() && next.length - next.trimStart().length <= indent) break;
        body.push(next);
      }
    }
    blocks.push(body.join("\n"));
  }
  return blocks;
}

describe("workflows are safe to run on a pull request", () => {
  it("there are workflows to check", () => {
    assert.ok(files.length >= 5);
  });

  for (const name of files) {
    const source = text(name);

    it(`${name}: no pull_request_target, workflow_run, or issue_comment trigger`, () => {
      assert.doesNotMatch(source, /^\s*(?:pull_request_target|workflow_run|issue_comment|pull_request_review_comment):?\s*$/m);
    });

    it(`${name}: declares the token permissions it needs instead of the default`, () => {
      assert.match(source, /^permissions:\s*$/m, "top-level permissions block");
      assert.doesNotMatch(source, /permissions:\s*write-all/);
      if (!HOSTING.includes(name)) {
        assert.doesNotMatch(source, /^\s+(?:contents|pull-requests|issues|actions|packages|security-events|checks|statuses|deployments|id-token):\s*write\s*$/m, "no write scope outside the hosting workflows");
      }
    });

    it(`${name}: never puts an outsider-controlled expression inside a shell step`, () => {
      for (const block of runBlocks(source)) assert.doesNotMatch(block, UNTRUSTED, block.slice(0, 80));
    });

    it(`${name}: does not echo secrets or print the environment`, () => {
      for (const block of runBlocks(source)) {
        assert.doesNotMatch(block, /\$\{\{\s*secrets\./);
        assert.doesNotMatch(block, /(?:^|\s)(?:printenv|env\s*$|set\s+-x)(?:\s|$)/m);
      }
    });

    it(`${name}: third-party actions are pinned to a release the owner can review`, () => {
      for (const match of source.matchAll(/uses:\s*([^\s@]+)@(\S+)/g)) {
        const [, action, ref] = match;
        assert.ok(/^(?:actions|google-github-actions|FirebaseExtended)\//.test(action) || /^[0-9a-f]{40}$/.test(ref), `${action}@${ref} must be pinned to a commit`);
        assert.doesNotMatch(ref, /^(?:main|master|latest)$/);
      }
    });
  }

  it("jobs that run pull-request code with no need for git credentials do not persist them", () => {
    for (const name of ["ci.yml", "security.yml"]) {
      const source = text(name);
      const checkouts = [...source.matchAll(/uses: actions\/checkout@v\d+\n((?:\s+with:\n(?:\s+\S.*\n)+)?)/g)];
      assert.ok(checkouts.length >= 1);
      for (const checkout of checkouts) assert.match(checkout[1], /persist-credentials:\s*false/, `${name} checkout keeps the token in .git/config`);
    }
  });

  it("hosting previews run only for branches in this repository, and deploys only from main", () => {
    for (const name of HOSTING) {
      const source = text(name);
      assert.match(source, /if: github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/, `${name}: a fork's pull request must not get the hosting credentials`);
      assert.match(source, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/, `${name}: live deploys only from main`);
      assert.doesNotMatch(source, /pull_request_target/);
    }
  });

  it("the security workflow runs on pull requests and weekly, with a read-only token and no secrets", () => {
    const source = text("security.yml");
    assert.match(source, /^on:\n\s+pull_request:/m);
    assert.match(source, /schedule:/);
    assert.match(source, /^permissions:\n\s+contents: read\s*$/m);
    assert.doesNotMatch(source, /secrets\./);
    assert.match(source, /check:content/);
    assert.match(source, /check:secrets/);
    assert.match(source, /check:audit/);
    assert.match(source, /gitleaks/);
  });

  it("CI installs with the same scripts-off stance as the security workflow where it can", () => {
    assert.match(text("security.yml"), /npm ci --ignore-scripts/);
  });

  it("no workflow deploys from CI or the security workflow, and none touches twilda.com's other projects", () => {
    for (const name of ["ci.yml", "security.yml"]) {
      const source = text(name);
      assert.doesNotMatch(source, /firebase|hosting|channelId|projectId|id-token:\s*write/i, name);
    }
    for (const name of files) {
      assert.doesNotMatch(text(name), /artometrics-510519|--force|git push/, name);
    }
  });
});
