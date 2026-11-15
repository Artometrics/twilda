import type { Block, PageSection, TwildaDocument } from "./schema";
import { escapeHtml, safeHref, safeMedia } from "./escape";
import { MAGAZINE_CSS } from "./magazine-css";
import { renderMarks, type MarksLevel } from "./marks";
import { parseVideoUrl } from "./embed";
import { isSafeHref } from "./url";

export { escapeHtml, safeHref, safeMedia } from "./escape";

/** The masthead, navigation, and colophon around a document. */
export interface SiteChrome {
  name: string;
  issueLabel: string;
  note: string;
  nav: Array<{ label: string; href: string }>;
  colophon: string;
}

/** The Field Desk demo chrome. The production site and the editor proof both use it unless told otherwise. */
export const DEFAULT_CHROME: SiteChrome = {
  name: "Field Desk",
  issueLabel: "Demo issue 01",
  note: "A sample magazine built with Twilda CMS. Not a live publication.",
  nav: [
    { label: "Issue", href: "/" },
    { label: "Franchise", href: "/articles/lumen-rail" },
  ],
  colophon:
    "Field Desk is sample content shipped with Twilda CMS so the editor and the static build can be tried without touching a live site.",
};

export interface RenderOptions {
  /**
   * Add `data-twilda-ref` attributes so the editors can find fields.
   * Off by default: production output carries no editing hooks.
   */
  annotate?: boolean;
  /** Masthead and colophon. Defaults to {@link DEFAULT_CHROME}. */
  chrome?: SiteChrome;
  /**
   * CSV text keyed by a chart block's `dataPath`. When present, the chart block
   * also renders its data as a table. Not read by the production site.
   */
  dataFiles?: Record<string, string>;
}

type Ctx = { annotate: boolean; dataFiles: Record<string, string> };

type FieldType = "text" | "multiline";

/**
 * `data-twilda-ref` is a dotted path into the document JSON, e.g. `sections.0.slides.2.title`.
 * `data-twilda-marks` says the field may carry bold, italic, and (when `links`) links.
 */
function text(ctx: Ctx, path: string, type: FieldType = "text", marks?: MarksLevel): string {
  if (!ctx.annotate) return "";
  const rich = marks ? ` data-twilda-marks="${marks}"` : "";
  return ` data-twilda-ref="${escapeHtml(path)}" data-twilda-type="${type}"${rich}`;
}

/** `data-twilda-node` is the path of a whole section or block, so editors can move, add, and remove it. */
function node(ctx: Ctx, path: string, type: string): string {
  return ctx.annotate ? ` data-twilda-node="${escapeHtml(path)}" data-twilda-node-type="${escapeHtml(type)}"` : "";
}

function plate(ctx: Ctx, srcPath: string, altPath: string, src: string, alt: string): string {
  const media = safeMedia(src);
  const safeAlt = escapeHtml(alt);
  const ref = ctx.annotate
    ? ` data-twilda-ref="${escapeHtml(srcPath)}" data-twilda-type="image" data-twilda-alt-ref="${escapeHtml(altPath)}"`
    : "";
  if (!media) {
    return `<div class="plate plate-missing" role="img" aria-label="${safeAlt}"${ref}><span>Plate unavailable</span></div>`;
  }
  return `<img class="plate" src="${escapeHtml(media)}" alt="${safeAlt}"${ref} />`;
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${renderMarks(part, "links").replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function renderCarousel(ctx: Ctx, base: string, section: Extract<PageSection, { type: "carousel" }>): string {
  const slides = section.slides
    .map((slide, i) => {
      const at = `${base}.slides.${i}`;
      return `<a class="slide" href="${escapeHtml(safeHref(slide.href))}">
        ${plate(ctx, `${at}.image`, `${at}.imageAlt`, slide.image, slide.imageAlt)}
        <p class="kicker"${text(ctx, `${at}.kicker`)}>${escapeHtml(slide.kicker)}</p>
        <h2${text(ctx, `${at}.title`)}>${escapeHtml(slide.title)}</h2>
        <p class="dek"${text(ctx, `${at}.dek`, "text", "emphasis")}>${renderMarks(slide.dek, "emphasis")}</p>
      </a>`;
    })
    .join("");
  const label = section.label ? `<p class="kicker"${text(ctx, `${base}.label`)}>${escapeHtml(section.label)}</p>` : "";
  return `<section class="section carousel" id="${escapeHtml(section.id)}"${node(ctx, base, "carousel")} aria-label="${escapeHtml(section.label || "Carousel")}">${label}<div class="carousel-track">${slides}</div></section>`;
}

function renderStoryGrid(ctx: Ctx, base: string, section: Extract<PageSection, { type: "story-grid" }>): string {
  const [lead, ...rest] = section.stories;
  if (!lead) return "";
  const stories = rest
    .map((story, i) => {
      const at = `${base}.stories.${i + 1}`;
      return `<li>
        <a href="${escapeHtml(safeHref(story.href))}">
          ${plate(ctx, `${at}.image`, `${at}.imageAlt`, story.image, story.imageAlt)}
          <p class="kicker"${text(ctx, `${at}.kicker`)}>${escapeHtml(story.kicker)}</p>
          <h3${text(ctx, `${at}.title`)}>${escapeHtml(story.title)}</h3>
          <p class="dek"${text(ctx, `${at}.dek`, "text", "emphasis")}>${renderMarks(story.dek, "emphasis")}</p>
        </a>
      </li>`;
    })
    .join("");
  const leadAt = `${base}.stories.0`;
  return `<section class="section story-grid-section" id="${escapeHtml(section.id)}"${node(ctx, base, "story-grid")}>
    <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
    <h2${text(ctx, `${base}.heading`)}>${escapeHtml(section.heading)}</h2>
    <div class="story-grid">
      <a class="lead" href="${escapeHtml(safeHref(lead.href))}">
        ${plate(ctx, `${leadAt}.image`, `${leadAt}.imageAlt`, lead.image, lead.imageAlt)}
        <p class="kicker"${text(ctx, `${leadAt}.kicker`)}>${escapeHtml(lead.kicker)}</p>
        <h2${text(ctx, `${leadAt}.title`)}>${escapeHtml(lead.title)}</h2>
        <p class="dek"${text(ctx, `${leadAt}.dek`, "text", "emphasis")}>${renderMarks(lead.dek, "emphasis")}</p>
      </a>
      <ol class="shorts">${stories}</ol>
    </div>
  </section>`;
}

function renderMenu(ctx: Ctx, base: string, section: Extract<PageSection, { type: "menu-shelf" }>): string {
  const items = section.items
    .map(
      (item, i) => `<li>
        <a href="${escapeHtml(safeHref(item.href))}">
          <span class="fact-label"${text(ctx, `${base}.items.${i}.label`)}>${escapeHtml(item.label)}</span>
          <span class="fact-value"${text(ctx, `${base}.items.${i}.dek`)}>${escapeHtml(item.dek)}</span>
        </a>
      </li>`,
    )
    .join("");
  return `<section class="section shelf-section" id="${escapeHtml(section.id)}"${node(ctx, base, "menu-shelf")}>
    <h2${text(ctx, `${base}.heading`)}>${escapeHtml(section.heading)}</h2>
    <ol class="facts">${items}</ol>
  </section>`;
}

function renderSection(ctx: Ctx, section: PageSection, index: number): string {
  const base = `sections.${index}`;
  switch (section.type) {
    case "carousel":
      return renderCarousel(ctx, base, section);
    case "story-grid":
      return renderStoryGrid(ctx, base, section);
    case "menu-shelf":
      return renderMenu(ctx, base, section);
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

/** Minimal CSV: one header row, no quoted commas. */
export function parseSimpleCsv(source: string): string[][] {
  return source
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function csvTable(csv: string): string {
  const [header, ...body] = parseSimpleCsv(csv);
  if (!header) return "";
  const head = header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
  const rows = body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  return `<table class="chart-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderHeading(ctx: Ctx, base: string, block: Extract<Block, { type: "heading" }>): string {
  const tag = block.level === 3 ? "h3" : "h2";
  return `<${tag} class="article-heading" id="${escapeHtml(block.id)}"${node(ctx, base, "heading")}${text(ctx, `${base}.text`)}>${escapeHtml(block.text)}</${tag}>`;
}

function renderParagraph(ctx: Ctx, base: string, block: Extract<Block, { type: "paragraph" }>): string {
  return `<div class="prose" id="${escapeHtml(block.id)}"${node(ctx, base, "paragraph")}${text(ctx, `${base}.text`, "multiline", "links")}>${paragraphs(block.text)}</div>`;
}

function renderFindings(ctx: Ctx, base: string, block: Extract<Block, { type: "key-findings" }>): string {
  const facts = block.items
    .map((item, i) => {
      const split = item.indexOf(": ");
      const label = split === -1 ? item : item.slice(0, split);
      const value = split === -1 ? "" : item.slice(split + 2);
      return `<li${text(ctx, `${base}.items.${i}`)}><span class="fact-label">${escapeHtml(label)}</span><span class="fact-value">${escapeHtml(value)}</span></li>`;
    })
    .join("");
  return `<section class="section facts-section" id="${escapeHtml(block.id)}"${node(ctx, base, "key-findings")}>
    <div class="fact-layout">
      <h2${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</h2>
      <ol class="facts">${facts}</ol>
    </div>
  </section>`;
}

function renderCallout(ctx: Ctx, base: string, block: Extract<Block, { type: "callout" }>): string {
  return `<aside class="callout" id="${escapeHtml(block.id)}"${node(ctx, base, "callout")}>
    <p class="kicker">Note</p>
    <h2${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</h2>
    <p${text(ctx, `${base}.text`, "text", "links")}>${renderMarks(block.text, "links")}</p>
  </aside>`;
}

function renderImage(ctx: Ctx, base: string, block: Extract<Block, { type: "image" }>): string {
  const caption = block.caption
    ? `<figcaption${text(ctx, `${base}.caption`, "text", "links")}>${renderMarks(block.caption, "links")}</figcaption>`
    : "";
  return `<figure class="figure" id="${escapeHtml(block.id)}"${node(ctx, base, "image")}>${plate(ctx, `${base}.src`, `${base}.alt`, block.src, block.alt)}${caption}</figure>`;
}

function renderChart(ctx: Ctx, base: string, block: Extract<Block, { type: "chart" }>): string {
  const href = block.dataPath.startsWith("http://") || block.dataPath.startsWith("https://") ? safeHref(block.dataPath) : "";
  const link = href ? `<p><a href="${escapeHtml(href)}">Open the chart</a></p>` : `<p class="dek">${escapeHtml(block.dataPath)}</p>`;
  const csv = ctx.dataFiles[block.dataPath];
  const table = csv ? csvTable(csv) : "";
  return `<figure class="figure chart" id="${escapeHtml(block.id)}"${node(ctx, base, "chart")}>
    <figcaption><strong${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</strong></figcaption>
    <p${text(ctx, `${base}.alt`)}>${escapeHtml(block.alt)}</p>
    ${table}${block.caption ? `<p class="dek"${text(ctx, `${base}.caption`)}>${escapeHtml(block.caption)}</p>` : ""}
    ${link}
  </figure>`;
}

function renderSources(ctx: Ctx, base: string, block: Extract<Block, { type: "sources" }>): string {
  const items = block.items
    .map(
      (item, i) =>
        `<li><a href="${escapeHtml(safeHref(item.href))}"${text(ctx, `${base}.items.${i}.label`)}>${escapeHtml(item.label)}</a></li>`,
    )
    .join("");
  return `<section class="sources" id="${escapeHtml(block.id)}"${node(ctx, base, "sources")}><h2${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</h2><ol>${items}</ol></section>`;
}

function renderEmbed(ctx: Ctx, base: string, block: Extract<Block, { type: "embed" }>): string {
  const label = block.kind === "audio" ? "Audio" : "Video";
  const video = block.kind === "video" ? parseVideoUrl(block.src) : null;
  const caption = block.caption ? ` — ${renderMarks(block.caption, "links")}` : "";
  if (video) {
    const refs = ctx.annotate
      ? ` data-twilda-ref="${escapeHtml(`${base}.src`)}" data-twilda-type="video" data-twilda-alt-ref="${escapeHtml(`${base}.title`)}"`
      : "";
    return `<figure class="embed embed-video" id="${escapeHtml(block.id)}"${node(ctx, base, "embed")}>
    <div class="embed-frame"${refs}><iframe src="${escapeHtml(video.embedUrl)}" title="${escapeHtml(block.title)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe></div>
    <figcaption><a href="${escapeHtml(video.watchUrl)}" rel="noopener noreferrer nofollow">${escapeHtml(label)}: ${escapeHtml(block.title)}</a>${caption}</figcaption>
  </figure>`;
  }
  const slot =
    ctx.annotate && block.kind === "video"
      ? ` data-twilda-ref="${escapeHtml(`${base}.src`)}" data-twilda-type="video" data-twilda-alt-ref="${escapeHtml(`${base}.title`)}"`
      : "";
  return `<p class="embed" id="${escapeHtml(block.id)}"${node(ctx, base, "embed")}${slot}><a href="${escapeHtml(safeHref(block.src))}">${escapeHtml(label)}: ${escapeHtml(block.title)}</a>${caption}</p>`;
}

function renderDownload(ctx: Ctx, base: string, block: Extract<Block, { type: "download" }>): string {
  return `<p class="download" id="${escapeHtml(block.id)}"${node(ctx, base, "download")}><a href="${escapeHtml(safeHref(block.href))}"${text(ctx, `${base}.label`)}>${escapeHtml(block.label)}</a>${block.description ? ` — ${escapeHtml(block.description)}` : ""}</p>`;
}

function renderBlock(ctx: Ctx, block: Block, index: number): string {
  const base = `blocks.${index}`;
  switch (block.type) {
    case "heading":
      return renderHeading(ctx, base, block);
    case "paragraph":
      return renderParagraph(ctx, base, block);
    case "key-findings":
      return renderFindings(ctx, base, block);
    case "chart":
      return renderChart(ctx, base, block);
    case "callout":
      return renderCallout(ctx, base, block);
    case "sources":
      return renderSources(ctx, base, block);
    case "image":
      return renderImage(ctx, base, block);
    case "embed":
      return renderEmbed(ctx, base, block);
    case "download":
      return renderDownload(ctx, base, block);
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function renderMast(chrome: SiteChrome): string {
  const nav = chrome.nav.map((item) => `<a href="${escapeHtml(isSafeHref(item.href) ? item.href : "#")}">${escapeHtml(item.label)}</a>`).join("\n      ");
  return `<header class="mast">
    <div class="mast-row">
      <a class="mark" href="/">${escapeHtml(chrome.name)}</a>
      <p class="issue-label">${escapeHtml(chrome.issueLabel)}</p>
    </div>
    <p class="mast-note">${escapeHtml(chrome.note)}</p>
    <nav class="mast-nav" aria-label="Issue">
      ${nav}
    </nav>
  </header>`;
}

function renderFooter(chrome: SiteChrome): string {
  return `<footer class="colophon">
    <p>${escapeHtml(chrome.colophon)}</p>
  </footer>`;
}

function renderPage(ctx: Ctx, doc: Extract<TwildaDocument, { kind: "page" }>): string {
  return `<header class="issue-intro">
    <p class="kicker"${text(ctx, "kicker")}>${escapeHtml(doc.kicker)}</p>
    <h1${text(ctx, "title")}>${escapeHtml(doc.title)}</h1>
    <p class="lede"${text(ctx, "dek", "text", "links")}>${renderMarks(doc.dek, "links")}</p>
  </header>
  ${doc.sections.map((section, index) => renderSection(ctx, section, index)).join("\n")}`;
}

function renderArticle(ctx: Ctx, doc: Extract<TwildaDocument, { kind: "article" }>): string {
  return `<article class="article">
    <header class="article-head">
      <p class="kicker"${text(ctx, "kicker")}>${escapeHtml(doc.kicker)}</p>
      <h1${text(ctx, "title")}>${escapeHtml(doc.title)}</h1>
      <p class="lede"${text(ctx, "dek", "text", "links")}>${renderMarks(doc.dek, "links")}</p>
      <p class="byline"${text(ctx, "byline")}>${escapeHtml(doc.byline)}</p>
    </header>
    <div class="article-body">
      ${doc.blocks.map((block, index) => renderBlock(ctx, block, index)).join("\n")}
    </div>
  </article>`;
}

/**
 * The one renderer. The static site, the editor proof, the click-to-edit page,
 * and the demo preview all call this function. It is a pure function of the
 * document and options, and it does not touch Node, so it bundles for a browser.
 */
export function renderDocument(doc: TwildaDocument, options: RenderOptions = {}): string {
  const ctx: Ctx = { annotate: options.annotate === true, dataFiles: options.dataFiles ?? {} };
  const chrome = options.chrome ?? DEFAULT_CHROME;
  const body = doc.kind === "article" ? renderArticle(ctx, doc) : renderPage(ctx, doc);
  return `<div class="magazine">${renderMast(chrome)}${body}${renderFooter(chrome)}</div>`;
}

const PREVIEW_EXTRA_CSS =
  "html,body{margin:0;background:#f3efe4}.chart-table{width:100%;border-collapse:collapse;font-size:.95rem}.chart-table th,.chart-table td{text-align:left;padding:.35rem .4rem;border-bottom:1px solid #d4cbb8}";

/** A standalone HTML document around {@link renderDocument}, with the template stylesheet inlined. No script tags. */
export function renderPreviewPage(doc: TwildaDocument, options: RenderOptions = {}): string {
  const title = escapeHtml(doc.title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title><style>${MAGAZINE_CSS}\n${PREVIEW_EXTRA_CSS}</style></head><body>${renderDocument(doc, options)}</body></html>`;
}
