import fs from "node:fs";
import path from "node:path";
import { allows, type Policy } from "./csp";

/** Audits a built folder against the policy its host will send with it. Returns one line per problem. */

export interface AuditOptions {
  policy: Policy;
  /** Pages where an external script is expected (desk, edit build). Inline script is never allowed. */
  runsScript: boolean;
  page?: string;
}

const PAGE = "https://host.test/";

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) out.push(full);
    else if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function attrs(tag: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of tag.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (name === "link" || name === "meta" || name === "img" || name === "iframe" || name === "script") continue;
    found.set(name, match[2] ?? match[3] ?? match[4] ?? "");
  }
  return found;
}

function directiveFor(tag: string, a: Map<string, string>): string | null {
  if (tag === "script") return "script-src";
  if (tag === "img") return "img-src";
  if (tag === "iframe") return "frame-src";
  if (tag === "link") {
    const rel = (a.get("rel") ?? "").toLowerCase().split(/\s+/);
    if (rel.includes("stylesheet")) return "style-src";
    if (rel.includes("icon") || rel.includes("apple-touch-icon")) return "img-src";
    if (rel.includes("manifest")) return "manifest-src";
    if (rel.includes("modulepreload")) return "script-src";
    if (rel.includes("preload") || rel.includes("prefetch")) {
      const as = a.get("as");
      return as === "font" ? "font-src" : as === "style" ? "style-src" : as === "script" ? "script-src" : as === "image" ? "img-src" : "connect-src";
    }
    return null;
  }
  return null;
}

export function auditHtml(file: string, html: string, options: AuditOptions): string[] {
  const problems: string[] = [];
  const at = (message: string) => problems.push(`${file}: ${message}`);

  for (const tag of ["base", "form", "object", "embed", "applet", "frame", "frameset", "portal", "template"]) {
    if (new RegExp(`<${tag}[\\s>/]`, "i").test(html)) at(`<${tag}> is not allowed`);
  }
  if (/<meta[^>]+http-equiv/i.test(html)) at("a meta http-equiv would override the header policy");
  if (/<style[\s>]/i.test(html)) at("inline <style> would need style-src 'unsafe-inline'");
  if (/\sstyle\s*=/i.test(html)) at("a style attribute would need style-src 'unsafe-inline'");
  if (/\son[a-z]+\s*=/i.test(html)) at("an inline event handler");
  if (/javascript\s*:/i.test(html)) at("a javascript: URL");
  if (/<svg[\s>]/i.test(html) && /<svg[\s\S]*?<(?:script|foreignObject)/i.test(html)) at("script or foreignObject inside inline svg");

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const a = attrs(match[1]);
    if (/^application\/(?:ld\+)?json$/i.test(a.get("type") ?? "")) continue;
    if (!options.runsScript) at("script on a page whose policy has script-src 'none'");
    else if (!a.has("src") || match[2].trim()) at("inline script");
    else if (!allows(options.policy, "script-src", a.get("src") ?? "", options.page ?? PAGE)) at(`script ${a.get("src")} is not allowed by the policy`);
  }

  for (const match of html.matchAll(/<(link|img|iframe|script)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const a = attrs(match[2]);
    const directive = directiveFor(tag, a);
    if (!directive) continue;
    const url = a.get(tag === "link" ? "href" : "src");
    if (url === undefined) continue;
    if (!allows(options.policy, directive, url, options.page ?? PAGE)) at(`<${tag}> ${url} is blocked by ${directive}`);
    if (a.has("srcset")) {
      for (const part of (a.get("srcset") ?? "").split(",")) {
        const candidate = part.trim().split(/\s+/)[0];
        if (candidate && !allows(options.policy, "img-src", candidate, options.page ?? PAGE)) at(`srcset ${candidate} is blocked by img-src`);
      }
    }
  }

  if (!/<html[^>]*\slang="[a-z-]+"/i.test(html)) at("missing lang attribute");
  if (!/<meta[^>]+charset/i.test(html)) at("missing charset");
  return problems;
}

export function auditCss(file: string, css: string, options: AuditOptions): string[] {
  const problems: string[] = [];
  if (/@import/i.test(css)) problems.push(`${file}: @import pulls a second stylesheet the policy cannot see in review`);
  if (/expression\s*\(|(?<![-\w])behavior\s*:|-moz-binding/i.test(css)) problems.push(`${file}: legacy script hook in CSS`);
  for (const match of css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    const url = match[2];
    if (/^\s*(?:#|about:)/.test(url)) continue;
    const directive = /\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(url) ? "font-src" : "img-src";
    if (!allows(options.policy, directive, url, options.page ?? PAGE)) problems.push(`${file}: url(${url.slice(0, 60)}) is blocked by ${directive}`);
  }
  return problems;
}

const ALLOWED_ROOT_MODULES = new Set(["content-assets.mjs", "content-modules.mjs"]);

/** Files that should never reach a host: source maps, env files, sources, VCS data, symlinks. */
export function auditFiles(dir: string, files: string[]): string[] {
  const problems: string[] = [];
  for (const file of files) {
    const rel = path.relative(dir, file);
    if (fs.lstatSync(file).isSymbolicLink()) problems.push(`${rel}: symlink in build output`);
    if (/\.(?:map|ts|tsx|astro|md|mdx|env|pem|key|log)$/i.test(rel) || /(?:^|\/)\.(?!well-known)/.test(rel)) problems.push(`${rel}: should not be published`);
    if (rel.endsWith(".mjs") && !ALLOWED_ROOT_MODULES.has(rel)) problems.push(`${rel}: unexpected module at the output root`);
  }
  return problems;
}

export function auditOutput(dir: string, options: AuditOptions): string[] {
  const files = walk(dir);
  const problems = auditFiles(dir, files);
  for (const file of files) {
    const rel = path.relative(dir, file);
    if (rel.endsWith(".html")) problems.push(...auditHtml(rel, fs.readFileSync(file, "utf8"), options));
    if (rel.endsWith(".css")) problems.push(...auditCss(rel, fs.readFileSync(file, "utf8"), options));
  }
  return problems;
}
