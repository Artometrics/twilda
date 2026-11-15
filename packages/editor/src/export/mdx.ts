import type { ArticleDoc, Block, Doc, MediaAsset } from "../model";

export type Flavor = "md" | "mdx";

export interface ExportOptions {
  flavor: Flavor;
  /** Uploaded images, so `media/x.png` can become a file next to the article. */
  media?: MediaAsset[];
  /** Mark the frontmatter `draft: true`. Astro's blog template hides these from lists. */
  draft?: boolean;
  /** Where the MDX components live, relative to the article file. */
  componentsImport?: string;
}

export interface ExportedImage {
  /** Path used inside the article, for example `./images/franchise-1-plate.png`. */
  ref: string;
  /** Path inside a bundle, for example `images/franchise-1-plate.png`. */
  file: string;
  dataUrl: string;
}

export interface ExportedArticle {
  filename: string;
  text: string;
  images: ExportedImage[];
}

export const DEFAULT_COMPONENTS_IMPORT = "../../components/twilda/index.ts";

const SAFE_SCHEME = /^(https?:|mailto:)/i;

/** A link target that is safe to put in a published page, or "" if it is not. */
export function safeHref(value: string): string {
  const href = value.trim();
  if (!href) return "";
  if (SAFE_SCHEME.test(href)) {
    try {
      const url = new URL(href);
      if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".")) return "";
    } catch {
      return "";
    }
    return href;
  }
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("./") || href.startsWith("../") || href.startsWith("#")) return href;
  return "";
}

function encodeDestination(href: string): string {
  return href.replace(/[\s()<>{}\\"]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

/** Escape plain text so Markdown and MDX read it back as the same characters. */
export function escapeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      let out = line.replace(/[\\`*_[\]<>{}~|]/g, (char) => `\\${char}`);
      out = out.replace(/^(\s*)#/, "$1\\#");
      out = out.replace(/^(\s*)([-+])(\s|$)/, "$1\\$2$3");
      out = out.replace(/^(\s*\d+)([.)])(\s|$)/, "$1\\$2$3");
      out = out.replace(/^(\s*)(-{2,}|={2,})\s*$/, (_all, space: string, run: string) => `${space}\\${run}`);
      return out;
    })
    .join("\n");
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** A JSON string is a valid YAML double-quoted scalar and a valid JS string. */
function quote(value: string): string {
  return JSON.stringify(value);
}

export function frontmatter(doc: ArticleDoc, draft = true): string {
  const lines = ["---", `title: ${quote(doc.title)}`, `slug: ${quote(doc.slug)}`];
  if (doc.dek.trim()) lines.push(`description: ${quote(oneLine(doc.dek))}`);
  if (doc.kicker.trim()) lines.push(`kicker: ${quote(oneLine(doc.kicker))}`);
  if (doc.byline.trim()) lines.push(`author: ${quote(oneLine(doc.byline))}`);
  lines.push(`updatedDate: ${/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(doc.updatedAt) ? doc.updatedAt : quote(new Date().toISOString())}`);
  lines.push(`draft: ${draft ? "true" : "false"}`);
  lines.push("---");
  return lines.join("\n");
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "image";
}

interface Context {
  flavor: Flavor;
  doc: ArticleDoc;
  media: MediaAsset[];
  images: ExportedImage[];
  used: Set<string>;
}

function resolveImage(ctx: Context, src: string): string {
  if (!src) return "";
  const asset = ctx.media.find((item) => item.path === src || `/${item.path}` === src);
  if (asset) {
    const existing = ctx.images.find((image) => image.dataUrl === asset.dataUrl);
    if (existing) return existing.ref;
    const file = `images/${ctx.doc.slug}-${ctx.images.length + 1}-${sanitizeFileName(asset.name)}`;
    const image: ExportedImage = { ref: `./${file}`, file, dataUrl: asset.dataUrl };
    ctx.images.push(image);
    return image.ref;
  }
  return safeHref(src);
}

function comment(ctx: Context, text: string): string {
  return ctx.flavor === "mdx" ? `{/* ${text.replace(/\*\//g, "* /")} */}` : `<!-- ${text.replace(/-->/g, "-- >")} -->`;
}

function component(ctx: Context, name: string, props: Record<string, string | undefined>, children?: string): string {
  ctx.used.add(name);
  const attrs = Object.entries(props)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "")
    .map(([key, value]) => `${key}={${quote(value)}}`)
    .join(" ");
  const open = attrs ? `<${name} ${attrs}` : `<${name}`;
  return children === undefined ? `${open} />` : `${open}>\n\n${children}\n\n</${name}>`;
}

function renderBlock(ctx: Context, block: Block): string {
  const mdx = ctx.flavor === "mdx";
  switch (block.type) {
    case "heading": {
      const text = oneLine(block.text);
      if (!text) return "";
      return `${block.level === 3 ? "###" : "##"} ${escapeText(text)}`;
    }
    case "paragraph":
      return paragraphs(block.text).map(escapeText).join("\n\n");
    case "key-findings": {
      const findings = block.items.map((item) => item.trim()).filter(Boolean);
      if (findings.length === 0) return "";
      if (mdx) {
        ctx.used.add("KeyFindings");
        const items = findings.map((item) => quote(oneLine(item)));
        const title = block.title.trim() ? ` title={${quote(oneLine(block.title))}}` : "";
        return `<KeyFindings${title} items={[\n  ${items.join(",\n  ")},\n]} />`;
      }
      const list = findings.map((item) => `- ${escapeText(oneLine(item))}`);
      const head = block.title.trim() ? `### ${escapeText(oneLine(block.title))}\n\n` : "";
      return `${head}${list.join("\n")}`;
    }
    case "chart": {
      const src = safeHref(block.dataPath);
      if (mdx) {
        return component(ctx, "Chart", {
          title: oneLine(block.title),
          dataPath: block.dataPath.trim(),
          alt: oneLine(block.alt),
          caption: oneLine(block.caption),
        });
      }
      const parts = [`**Chart: ${escapeText(oneLine(block.title) || "untitled")}.**`];
      if (block.alt.trim()) parts.push(escapeText(oneLine(block.alt)));
      if (block.caption.trim()) parts.push(escapeText(oneLine(block.caption)));
      const lines = [`> ${parts.join(" ")}`];
      if (src) lines.push(">", `> [Open the chart](${encodeDestination(src)})`);
      else if (block.dataPath.trim()) lines.push(">", `> Data: ${escapeText(oneLine(block.dataPath))}`);
      return lines.join("\n");
    }
    case "callout": {
      const body = paragraphs(block.text).map(escapeText).join("\n\n");
      if (mdx) return component(ctx, "Callout", { title: oneLine(block.title) }, body || escapeText(oneLine(block.title)));
      const title = block.title.trim() ? `**${escapeText(oneLine(block.title))}**` : "";
      const text = [title, body].filter(Boolean).join("\n\n");
      return text
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    }
    case "sources": {
      const items = block.items.filter((item) => item.label.trim() || item.href.trim());
      if (items.length === 0) return "";
      const list = items.map((item, index) => {
        const label = escapeText(oneLine(item.label) || item.href.trim());
        const href = safeHref(item.href);
        return `${index + 1}. ${href ? `[${label}](${encodeDestination(href)})` : label}`;
      });
      const title = oneLine(block.title) || "Sources";
      return `## ${escapeText(title)}\n\n${list.join("\n")}`;
    }
    case "image": {
      const ref = resolveImage(ctx, block.src);
      if (!ref) return comment(ctx, `image block ${block.id} has no usable file`);
      const alt = escapeText(oneLine(block.alt));
      const image = `![${alt}](${encodeDestination(ref)})`;
      const caption = oneLine(block.caption);
      return caption ? `${image}\n\n*${escapeText(caption)}*` : image;
    }
    case "embed": {
      const src = safeHref(block.src);
      const caption = oneLine(block.caption || block.title);
      if (!src) return comment(ctx, `${block.kind} block ${block.id} has no usable link`);
      const label = block.kind === "audio" ? "Audio" : "Video";
      if (mdx) {
        const tag = block.kind === "audio" ? "audio" : "video";
        const player = `<${tag} controls src={${quote(src)}} />`;
        return caption ? `${player}\n\n*${escapeText(caption)}*` : player;
      }
      return `[${label}${caption ? `: ${escapeText(caption)}` : ""}](${encodeDestination(src)})`;
    }
    case "download": {
      const href = safeHref(block.href);
      const label = oneLine(block.label) || "Download";
      const description = oneLine(block.description ?? "");
      if (mdx) {
        return component(ctx, "Download", { href, label, description });
      }
      const link = href ? `[${escapeText(label)}](${encodeDestination(href)})` : escapeText(label);
      return `**Download:** ${link}${description ? ` — ${escapeText(description)}` : ""}`;
    }
    case "fast-facts": {
      const facts = block.facts.filter((fact) => fact.value.trim() || fact.label.trim());
      if (facts.length === 0) return "";
      const head = block.title.trim() ? `### ${escapeText(oneLine(block.title))}\n\n` : "";
      return `${head}${facts.map((fact) => `- **${escapeText(oneLine(fact.value))}** ${escapeText(oneLine(fact.label))}`).join("\n")}`;
    }
    case "pull-quote": {
      const quote = oneLine(block.quote);
      if (!quote) return "";
      const who = oneLine(block.attribution);
      return who ? `> ${escapeText(quote)}\n>\n> — ${escapeText(who)}` : `> ${escapeText(quote)}`;
    }
    case "bar-chart": {
      const bars = block.bars.filter((bar) => bar.label.trim());
      if (bars.length === 0) return "";
      const unit = oneLine(block.unit);
      const head = `**${escapeText(oneLine(block.title) || "Chart")}.** ${escapeText(oneLine(block.alt))}`.trim();
      const table = ["| Label | Value |", "| --- | --- |", ...bars.map((bar) => `| ${escapeText(oneLine(bar.label))} | ${escapeText(oneLine(bar.value))}${unit ? ` ${escapeText(unit)}` : ""} |`)];
      const caption = oneLine(block.caption);
      return [head, table.join("\n"), caption ? `*${escapeText(caption)}*` : ""].filter(Boolean).join("\n\n");
    }
    default: {
      const exhaustive: never = block;
      throw new Error(`Unknown block ${String(exhaustive)}`);
    }
  }
}

export function exportArticle(doc: ArticleDoc, options: ExportOptions): ExportedArticle {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) throw new Error("The slug must be lowercase words joined by hyphens before it can be a file name.");
  const ctx: Context = {
    flavor: options.flavor,
    doc,
    media: options.media ?? [],
    images: [],
    used: new Set(),
  };
  const body = doc.blocks.map((block) => renderBlock(ctx, block)).filter((chunk) => chunk.trim() !== "");
  const head = frontmatter(doc, options.draft ?? true);
  const parts = [head];
  if (options.flavor === "mdx" && ctx.used.size > 0) {
    const names = [...ctx.used].sort();
    parts.push(`import { ${names.join(", ")} } from ${quote(options.componentsImport ?? DEFAULT_COMPONENTS_IMPORT)};`);
  }
  parts.push(...body);
  return {
    filename: `${doc.slug}.${options.flavor}`,
    text: `${parts.join("\n\n")}\n`,
    images: ctx.images,
  };
}

export function exportJson(doc: Doc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}
