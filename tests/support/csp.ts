import fs from "node:fs";
import { fileURLToPath } from "node:url";

const FIREBASE_JSON = fileURLToPath(new URL("../../firebase.json", import.meta.url));

/** A small, strict reading of a Content-Security-Policy header, enough to check built output against it. */

export type Policy = Map<string, string[]>;

export function parsePolicy(value: string): Policy {
  const policy: Policy = new Map();
  for (const part of value.split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    const name = tokens.shift()?.toLowerCase();
    if (!name || policy.has(name)) continue;
    policy.set(name, tokens);
  }
  return policy;
}

export interface HostingEntry {
  site?: string;
  target?: string;
  public: string;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
}

export function hostingConfig(): HostingEntry[] {
  return (JSON.parse(fs.readFileSync(FIREBASE_JSON, "utf8")) as { hosting: HostingEntry[] }).hosting;
}

export function headersFor(entry: HostingEntry, source = "**"): Map<string, string> {
  return new Map((entry.headers.find((item) => item.source === source)?.headers ?? []).map((header) => [header.key, header.value]));
}

export type Target = "site" | "desk" | "www";

export function hostingTarget(target: Target): HostingEntry {
  const entry = hostingConfig().find((item) => (target === "site" ? item.site === "twilda-510519" : item.target === (target === "desk" ? "twilda-desk" : "www")));
  if (!entry) throw new Error(`no hosting entry for ${target}`);
  return entry;
}

const FETCH_DIRECTIVES = ["default-src", "script-src", "style-src", "img-src", "font-src", "connect-src", "media-src", "frame-src", "worker-src", "manifest-src", "object-src"];

/** Sources a directive may list. Anything else is a way in that a reviewer should see. */
const KNOWN_SOURCE = /^(?:'none'|'self'|data:|blob:|https:\/\/[a-z0-9.-]+(?::\d+)?)$/;

/**
 * Directives and sources that must hold for every target. `kind` carries what differs:
 * only the desk and the edit build run script, only they need data: and blob: images.
 */
export function policyProblems(policy: Policy, options: { runsScript: boolean; images: "self" | "self-data-blob"; connect: string[]; frames: string[]; workers?: string[]; manifest?: boolean }): string[] {
  const problems: string[] = [];
  const get = (name: string) => policy.get(name);
  const expectExact = (name: string, expected: string[]) => {
    const actual = get(name);
    if (!actual || actual.join(" ") !== expected.join(" ")) problems.push(`${name} is ${JSON.stringify(actual?.join(" "))}, expected ${JSON.stringify(expected.join(" "))}`);
  };

  expectExact("default-src", ["'none'"]);
  expectExact("base-uri", ["'none'"]);
  expectExact("form-action", ["'none'"]);
  expectExact("frame-ancestors", ["'none'"]);
  expectExact("object-src", ["'none'"]);
  expectExact("media-src", ["'none'"]);
  expectExact("script-src", options.runsScript ? ["'self'"] : ["'none'"]);
  expectExact("style-src", ["'self'"]);
  expectExact("font-src", ["'self'"]);
  expectExact("img-src", options.images === "self" ? ["'self'"] : ["'self'", "data:", "blob:"]);
  expectExact("connect-src", options.connect);
  expectExact("frame-src", options.frames);
  if (options.workers) expectExact("worker-src", options.workers);

  for (const directive of FETCH_DIRECTIVES) {
    for (const source of get(directive) ?? []) {
      if (!KNOWN_SOURCE.test(source)) problems.push(`${directive} lists an unexpected source ${source}`);
      if (source === "'unsafe-inline'" || source === "'unsafe-eval'" || source === "'unsafe-hashes'" || source === "'wasm-unsafe-eval'") problems.push(`${directive} allows ${source}`);
      if (source === "*" || source === "https:" || source === "http:" || source.startsWith("http://") || source.includes("*")) problems.push(`${directive} is too wide: ${source}`);
      if (/^'(?:nonce|sha\d+)-/.test(source)) problems.push(`${directive} uses a nonce or hash, which a static host cannot rotate`);
    }
  }
  for (const directive of ["script-src", "style-src", "default-src"]) {
    for (const source of get(directive) ?? []) if (source === "data:" || source === "blob:") problems.push(`${directive} allows ${source}`);
  }
  for (const known of get("img-src") ?? []) if (known.startsWith("https://")) problems.push("img-src allows a remote origin");
  return problems;
}

/** Whether `source` allows loading `target` for a page at `page`, by the rules that matter here. */
export function allows(policy: Policy, directive: string, target: string, page = "https://site.test/"): boolean {
  const list = policy.get(directive) ?? policy.get("default-src") ?? [];
  if (list.includes("'none'")) return false;
  let url: URL;
  try {
    url = new URL(target, page);
  } catch {
    return false;
  }
  const origin = new URL(page).origin;
  for (const source of list) {
    if (source === "'self'" && url.origin === origin) return true;
    if (source === "data:" && url.protocol === "data:") return true;
    if (source === "blob:" && url.protocol === "blob:") return true;
    if (source.startsWith("https://") && url.protocol === "https:" && `${url.protocol}//${url.host}` === source) return true;
  }
  return false;
}
