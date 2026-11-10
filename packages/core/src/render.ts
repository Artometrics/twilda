import type { TwildaDocument } from "./schema";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/** Minimal CSV: one header row, no quoted commas. */
export function parseSimpleCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

export interface RenderOptions {
  dataFiles?: Record<string, string>;
}

const PREVIEW_STYLE = `
  :root { color-scheme: light; }
  body { margin: 0; background: #f6f1e7; color: #1a1714; font: 17px/1.5 "Public Sans", "Segoe UI", sans-serif; }
  main { max-width: 40rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  h1, h2, h3 { font-family: Newsreader, Georgia, serif; font-weight: 500; line-height: 1.15; }
  h1 { font-size: 2rem; margin: 0.2rem 0 0.6rem; }
  .kicker { letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.72rem; margin: 0; }
  .dek, .byline, figcaption, .caption { color: #4a453d; }
  figure { margin: 1.25rem 0; }
  img, .banner { width: 100%; height: auto; display: block; background: #e7e0d2; }
  .banner { max-height: 14rem; object-fit: cover; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { text-align: left; padding: 0.35rem 0.4rem; border-bottom: 1px solid #d9d0c1; }
  .callout, .chart, .findings, .downloads { border: 1px solid #d9d0c1; padding: 0.8rem 1rem; margin: 1rem 0; background: #fffdf8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; list-style: none; padding: 0; }
  .grid a { display: block; color: inherit; text-decoration: none; }
  .grid img { aspect-ratio: 1; object-fit: cover; }
  .shelf { list-style: none; padding: 0; }
  .shelf a { display: block; padding: 0.7rem 0; border-top: 1px solid #d9d0c1; color: inherit; text-decoration: none; }
  .slides { display: flex; gap: 0.75rem; overflow-x: auto; list-style: none; padding: 0; }
  .slides li { flex: 0 0 78%; }
  .slides img { aspect-ratio: 16/10; object-fit: cover; width: 100%; }
`.trim();

function renderChart(block: Extract<TwildaDocument, { kind: "article" }>["blocks"][number] & { type: "chart" }, dataFiles: Record<string, string>): string {
  const csv = dataFiles[block.dataPath];
  let table = "";
  if (csv) {
    const rows = parseSimpleCsv(csv);
    const [header, ...body] = rows;
    if (header) {
      table = `<table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
    }
  } else {
    table = `<p class="caption">Data file not in this build: ${escapeHtml(block.dataPath)}</p>`;
  }
  return `<figure class="chart"><figcaption><strong>${escapeHtml(block.title)}</strong></figcaption>${table}<p class="caption">${escapeHtml(block.alt)}</p>${block.caption ? `<p class="caption">${escapeHtml(block.caption)}</p>` : ""}</figure>`;
}

function renderArticle(doc: Extract<TwildaDocument, { kind: "article" }>, dataFiles: Record<string, string>): string {
  const blocks = doc.blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
        case "paragraph":
          return paragraphs(block.text);
        case "key-findings":
          return `<section class="findings"><h2>${escapeHtml(block.title)}</h2><ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
        case "chart":
          return renderChart(block, dataFiles);
        case "callout":
          return `<aside class="callout"><strong>${escapeHtml(block.title)}</strong>${paragraphs(block.text)}</aside>`;
        case "sources":
          return `<section class="sources"><h2>${escapeHtml(block.title)}</h2><ul>${block.items.map((item) => `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`).join("")}</ul></section>`;
        case "image":
          return `<figure><img class="${block.role}" src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" />${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
        case "embed": {
          const media = block.kind === "audio" ? "audio" : "video";
          const file = /\.(mp3|wav|mp4|webm)(\?|$)/i.test(block.src);
          const player = file
            ? `<${media} controls src="${escapeHtml(block.src)}"></${media}>`
            : `<p><a href="${escapeHtml(block.src)}">${escapeHtml(block.title)}</a></p>`;
          return `<figure class="embed">${player}${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
        }
        case "download":
          return `<p class="downloads"><a href="${escapeHtml(block.href)}">${escapeHtml(block.label)}</a>${block.description ? ` — ${escapeHtml(block.description)}` : ""}</p>`;
        default: {
          const exhaustive: never = block;
          return exhaustive;
        }
      }
    })
    .join("");
  return `<article><p class="kicker">${escapeHtml(doc.kicker)}</p><h1>${escapeHtml(doc.title)}</h1><p class="dek">${escapeHtml(doc.dek)}</p><p class="byline">${escapeHtml(doc.byline)}</p>${blocks}</article>`;
}

function renderPage(doc: Extract<TwildaDocument, { kind: "page" }>): string {
  const sections = doc.sections
    .map((section) => {
      switch (section.type) {
        case "carousel":
          return `<section><h2>${escapeHtml(section.label)}</h2><ul class="slides">${section.slides
            .map(
              (slide) =>
                `<li><a href="${escapeHtml(slide.href)}"><img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.imageAlt)}" /><p class="kicker">${escapeHtml(slide.kicker)}</p><h3>${escapeHtml(slide.title)}</h3><p>${escapeHtml(slide.dek)}</p></a></li>`,
            )
            .join("")}</ul></section>`;
        case "story-grid":
          return `<section><p class="kicker">${escapeHtml(section.kicker)}</p><h2>${escapeHtml(section.heading)}</h2><ul class="grid">${section.stories
            .map(
              (story) =>
                `<li><a href="${escapeHtml(story.href)}"><img src="${escapeHtml(story.image)}" alt="${escapeHtml(story.imageAlt)}" /><p class="kicker">${escapeHtml(story.kicker)}</p><h3>${escapeHtml(story.title)}</h3><p>${escapeHtml(story.dek)}</p></a></li>`,
            )
            .join("")}</ul></section>`;
        case "menu-shelf":
          return `<section><h2>${escapeHtml(section.heading)}</h2><ul class="shelf">${section.items
            .map((item) => `<li><a href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.label)}</strong><span class="dek"> ${escapeHtml(item.dek)}</span></a></li>`)
            .join("")}</ul></section>`;
        default: {
          const exhaustive: never = section;
          return exhaustive;
        }
      }
    })
    .join("");
  return `<article><p class="kicker">${escapeHtml(doc.kicker)}</p><h1>${escapeHtml(doc.title)}</h1><p class="dek">${escapeHtml(doc.dek)}</p>${sections}</article>`;
}

export function renderDocument(doc: TwildaDocument, options: RenderOptions = {}): string {
  const body = doc.kind === "article" ? renderArticle(doc, options.dataFiles ?? {}) : renderPage(doc);
  return `<main>${body}</main>`;
}

/** Full HTML document. No script tags. Used for the in-editor preview. */
export function renderPreviewPage(doc: TwildaDocument, options: RenderOptions = {}): string {
  const title = escapeHtml(doc.title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title><style>${PREVIEW_STYLE}</style></head><body>${renderDocument(doc, options)}</body></html>`;
}
