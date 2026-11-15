import nodeCrypto from "node:crypto";
/**
 * A small stateful stand-in for the GitHub REST API: branches with their own files, the
 * Contents API (text and binary), refs (create and force-move), and pull requests.
 * Enough to exercise the real `GitHubBackend` and the publish module without a network.
 */

export interface FakeCall {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  auth: string | null;
}

export interface FakePull {
  number: number;
  head: string;
  base: string;
  title: string;
  body: string;
}

function blobSha(bytes: Buffer): string {
  const { createHash } = nodeCrypto;
  return createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest("hex");
}

export function createFakeGithub(repo = "Artometrics/twilda") {
  const calls: FakeCall[] = [];
  const branches = new Map<string, Map<string, Buffer>>([["main", new Map()]]);
  const heads = new Map<string, string>([["main", "head-main-0"]]);
  const pulls: FakePull[] = [];
  let commits = 0;

  const files = (branch: string) => branches.get(branch);

  function putMain(path: string, content: string | Buffer): void {
    files("main")?.set(path, typeof content === "string" ? Buffer.from(content, "utf8") : content);
    heads.set("main", `head-main-${(commits += 1)}`);
  }

  const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  const base = `/repos/${repo}`;

  const impl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, path: url.pathname, body, auth: headers.get("authorization") });
    const p = url.pathname;

    const ref = /^\/repos\/[^/]+\/[^/]+\/git\/ref\/heads\/(.+)$/.exec(p);
    if (ref && method === "GET") {
      const sha = heads.get(ref[1] as string);
      return sha ? json(200, { object: { sha } }) : json(404, { message: "Not Found" });
    }
    if (p === `${base}/git/refs` && method === "POST") {
      const name = String(body?.ref).replace("refs/heads/", "");
      const from = [...heads.entries()].find(([, sha]) => sha === body?.sha)?.[0] ?? "main";
      branches.set(name, new Map(files(from) ?? []));
      heads.set(name, String(body?.sha));
      return json(201, { object: { sha: body?.sha } });
    }
    const patch = /^\/repos\/[^/]+\/[^/]+\/git\/refs\/heads\/(.+)$/.exec(p);
    if (patch && method === "PATCH") {
      const name = patch[1] as string;
      if (!branches.has(name)) return json(404, { message: "Not Found" });
      if (body?.force !== true) return json(422, { message: "Update is not a fast forward" });
      const from = [...heads.entries()].find(([key, sha]) => sha === body?.sha && key !== name)?.[0] ?? "main";
      branches.set(name, new Map(files(from) ?? []));
      heads.set(name, String(body?.sha));
      return json(200, { object: { sha: body?.sha } });
    }

    const contents = /^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/.exec(p);
    if (contents) {
      const path = decodeURIComponent(contents[1] as string);
      const branch = method === "GET" ? (url.searchParams.get("ref") ?? "main") : String(body?.branch ?? "main");
      const tree = files(branch);
      if (!tree) return json(404, { message: "No such ref" });
      if (method === "GET") {
        const listing = [...tree.keys()].filter((key) => key.startsWith(`${path}/`));
        if (listing.length > 0 && !tree.has(path)) {
          const names = new Map<string, "file" | "dir">();
          for (const key of listing) {
            const rest = key.slice(path.length + 1);
            const slash = rest.indexOf("/");
            names.set(slash < 0 ? `${path}/${rest}` : `${path}/${rest.slice(0, slash)}`, slash < 0 ? "file" : "dir");
          }
          return json(200, [...names].map(([name, type]) => ({ type, path: name, sha: "x" })));
        }
        const file = tree.get(path);
        if (!file) return json(404, { message: "Not Found" });
        return json(200, { type: "file", path, sha: blobSha(file), encoding: "base64", content: file.toString("base64") });
      }
      if (method === "PUT") {
        const existing = tree.get(path);
        if (existing && body?.sha !== blobSha(existing)) return json(409, { message: "sha does not match" });
        if (!existing && body?.sha) return json(422, { message: "sha given for a new file" });
        tree.set(path, Buffer.from(String(body?.content), "base64"));
        heads.set(branch, `head-${branch}-${(commits += 1)}`);
        return json(201, { commit: { sha: heads.get(branch) }, content: { path } });
      }
    }

    if (p === `${base}/pulls` && method === "GET") {
      const head = (url.searchParams.get("head") ?? "").split(":").pop();
      return json(
        200,
        pulls
          .filter((pull) => pull.head === head)
          .map((pull) => ({ number: pull.number, html_url: `https://github.com/${repo}/pull/${pull.number}`, title: pull.title, state: "open", head: { ref: pull.head }, base: { ref: pull.base } })),
      );
    }
    if (p === `${base}/pulls` && method === "POST") {
      const pull = { number: pulls.length + 1, head: String(body?.head), base: String(body?.base), title: String(body?.title), body: String(body?.body ?? "") };
      pulls.push(pull);
      return json(201, { number: pull.number, html_url: `https://github.com/${repo}/pull/${pull.number}`, title: pull.title, state: "open", head: { ref: pull.head }, base: { ref: pull.base } });
    }
    return json(500, { message: `unmocked ${method} ${p}` });
  };

  return {
    impl,
    calls,
    pulls,
    branches,
    heads,
    /** Put a file on `main` as if someone merged it. Moves main's head. */
    putMain,
    read: (branch: string, path: string): Buffer | undefined => files(branch)?.get(path),
    readText: (branch: string, path: string): string | undefined => files(branch)?.get(path)?.toString("utf8"),
    writes: (): FakeCall[] => calls.filter((call) => call.method === "PUT"),
  };
}

export type FakeGithub = ReturnType<typeof createFakeGithub>;
