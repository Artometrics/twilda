import type { Block, PageSection, TwildaDocument } from "@twilda/core";
import { escapeHtml, safeHref, safeMedia } from "./escape";

export interface RenderOptions {
  /**
   * Add `data-twilda-ref` attributes so the click-to-edit build can find fields.
   * Off by default: production output carries no editing hooks.
   */
  annotate?: boolean;
}

type Ctx = { annotate: boolean };

/** `data-twilda-ref` is a dotted path into the document JSON, e.g. `sections.0.slides.2.title`. */
function text(ctx: Ctx, path: string): string {
  return ctx.annotate ? ` data-twilda-ref="${escapeHtml(path)}" data-twilda-type="text"` : "";
}

function plate(ctx: Ctx, path: string, src: string, alt: string): string {
  const media = safeMedia(src);
  const safeAlt = escapeHtml(alt);
  const ref = ctx.annotate
    ? ` data-twilda-ref="${escapeHtml(`${path}.image`)}" data-twilda-type="image" data-twilda-alt-ref="${escapeHtml(`${path}.imageAlt`)}"`
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
    .map((part) => `<p>${escapeHtml(part).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function renderCarousel(ctx: Ctx, base: string, section: Extract<PageSection, { type: "carousel" }>): string {
  const slides = section.slides
    .map((slide, i) => {
      const at = `${base}.slides.${i}`;
      return `<a class="slide" href="${escapeHtml(safeHref(slide.href))}">
        ${plate(ctx, at, slide.image, slide.imageAlt)}
        <p class="kicker"${text(ctx, `${at}.kicker`)}>${escapeHtml(slide.kicker)}</p>
        <h2${text(ctx, `${at}.title`)}>${escapeHtml(slide.title)}</h2>
        <p class="dek"${text(ctx, `${at}.dek`)}>${escapeHtml(slide.dek)}</p>
      </a>`;
    })
    .join("");
  const label = section.label ? `<p class="kicker"${text(ctx, `${base}.label`)}>${escapeHtml(section.label)}</p>` : "";
  return `<section class="section carousel" id="${escapeHtml(section.id)}" aria-label="${escapeHtml(section.label || "Carousel")}">${label}<div class="carousel-track">${slides}</div></section>`;
}

function renderStoryGrid(ctx: Ctx, base: string, section: Extract<PageSection, { type: "story-grid" }>): string {
  const [lead, ...rest] = section.stories;
  if (!lead) return "";
  const stories = rest
    .map((story, i) => {
      const at = `${base}.stories.${i + 1}`;
      return `<li>
        <a href="${escapeHtml(safeHref(story.href))}">
          ${plate(ctx, at, story.image, story.imageAlt)}
          <p class="kicker"${text(ctx, `${at}.kicker`)}>${escapeHtml(story.kicker)}</p>
          <h3${text(ctx, `${at}.title`)}>${escapeHtml(story.title)}</h3>
          <p class="dek"${text(ctx, `${at}.dek`)}>${escapeHtml(story.dek)}</p>
        </a>
      </li>`;
    })
    .join("");
  const leadAt = `${base}.stories.0`;
  return `<section class="section story-grid-section" id="${escapeHtml(section.id)}">
    <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
    <h2${text(ctx, `${base}.heading`)}>${escapeHtml(section.heading)}</h2>
    <div class="story-grid">
      <a class="lead" href="${escapeHtml(safeHref(lead.href))}">
        ${plate(ctx, leadAt, lead.image, lead.imageAlt)}
        <p class="kicker"${text(ctx, `${leadAt}.kicker`)}>${escapeHtml(lead.kicker)}</p>
        <h2${text(ctx, `${leadAt}.title`)}>${escapeHtml(lead.title)}</h2>
        <p class="dek"${text(ctx, `${leadAt}.dek`)}>${escapeHtml(lead.dek)}</p>
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
  return `<section class="section shelf-section" id="${escapeHtml(section.id)}">
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

function renderHeading(block: Extract<Block, { type: "heading" }>): string {
  const tag = block.level === 3 ? "h3" : "h2";
  return `<${tag} class="article-heading" id="${escapeHtml(block.id)}">${escapeHtml(block.text)}</${tag}>`;
}

function renderParagraph(block: Extract<Block, { type: "paragraph" }>): string {
  return `<div class="prose" id="${escapeHtml(block.id)}">${paragraphs(block.text)}</div>`;
}

function renderFindings(block: Extract<Block, { type: "key-findings" }>): string {
  const facts = block.items
    .map((item) => {
      const split = item.indexOf(": ");
      const label = split === -1 ? item : item.slice(0, split);
      const value = split === -1 ? "" : item.slice(split + 2);
      return `<li><span class="fact-label">${escapeHtml(label)}</span><span class="fact-value">${escapeHtml(value)}</span></li>`;
    })
    .join("");
  return `<section class="section facts-section" id="${escapeHtml(block.id)}">
    <div class="fact-layout">
      <h2>${escapeHtml(block.title)}</h2>
      <ol class="facts">${facts}</ol>
    </div>
  </section>`;
}

function renderCallout(block: Extract<Block, { type: "callout" }>): string {
  return `<aside class="callout" id="${escapeHtml(block.id)}">
    <p class="kicker">Note</p>
    <h2>${escapeHtml(block.title)}</h2>
    <p>${escapeHtml(block.text)}</p>
  </aside>`;
}

function renderImage(block: Extract<Block, { type: "image" }>): string {
  const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
  return `<figure class="figure" id="${escapeHtml(block.id)}">${plate({ annotate: false }, "", block.src, block.alt)}${caption}</figure>`;
}

function renderChart(block: Extract<Block, { type: "chart" }>): string {
  const href = block.dataPath.startsWith("http://") || block.dataPath.startsWith("https://") ? safeHref(block.dataPath) : "";
  const link = href ? `<p><a href="${escapeHtml(href)}">Open the chart</a></p>` : `<p class="dek">${escapeHtml(block.dataPath)}</p>`;
  return `<figure class="figure chart" id="${escapeHtml(block.id)}">
    <figcaption><strong>${escapeHtml(block.title)}</strong></figcaption>
    <p>${escapeHtml(block.alt)}</p>
    ${block.caption ? `<p class="dek">${escapeHtml(block.caption)}</p>` : ""}
    ${link}
  </figure>`;
}

function renderSources(block: Extract<Block, { type: "sources" }>): string {
  const items = block.items
    .map((item) => `<li><a href="${escapeHtml(safeHref(item.href))}">${escapeHtml(item.label)}</a></li>`)
    .join("");
  return `<section class="sources" id="${escapeHtml(block.id)}"><h2>${escapeHtml(block.title)}</h2><ol>${items}</ol></section>`;
}

function renderEmbed(block: Extract<Block, { type: "embed" }>): string {
  const label = block.kind === "audio" ? "Audio" : "Video";
  return `<p class="embed" id="${escapeHtml(block.id)}"><a href="${escapeHtml(safeHref(block.src))}">${escapeHtml(label)}: ${escapeHtml(block.title)}</a>${block.caption ? ` — ${escapeHtml(block.caption)}` : ""}</p>`;
}

function renderDownload(block: Extract<Block, { type: "download" }>): string {
  return `<p class="download" id="${escapeHtml(block.id)}"><a href="${escapeHtml(safeHref(block.href))}">${escapeHtml(block.label)}</a>${block.description ? ` — ${escapeHtml(block.description)}` : ""}</p>`;
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case "heading":
      return renderHeading(block);
    case "paragraph":
      return renderParagraph(block);
    case "key-findings":
      return renderFindings(block);
    case "chart":
      return renderChart(block);
    case "callout":
      return renderCallout(block);
    case "sources":
      return renderSources(block);
    case "image":
      return renderImage(block);
    case "embed":
      return renderEmbed(block);
    case "download":
      return renderDownload(block);
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function renderMast(): string {
  return `<header class="mast">
    <div class="mast-row">
      <a class="mark" href="/">Field Desk</a>
      <p class="issue-label">Demo issue 01</p>
    </div>
    <p class="mast-note">A sample magazine built with Twilda CMS. Not a live publication.</p>
    <nav class="mast-nav" aria-label="Issue">
      <a href="/">Issue</a>
      <a href="/articles/lumen-rail">Franchise</a>
    </nav>
  </header>`;
}

function renderFooter(): string {
  return `<footer class="colophon">
    <p>Field Desk is sample content shipped with Twilda CMS so the editor and the static build can be tried without touching a live site.</p>
  </footer>`;
}

function renderPage(ctx: Ctx, doc: Extract<TwildaDocument, { kind: "page" }>): string {
  return `<header class="issue-intro">
    <p class="kicker"${text(ctx, "kicker")}>${escapeHtml(doc.kicker)}</p>
    <h1${text(ctx, "title")}>${escapeHtml(doc.title)}</h1>
    <p class="lede"${text(ctx, "dek")}>${escapeHtml(doc.dek)}</p>
  </header>
  ${doc.sections.map((section, index) => renderSection(ctx, section, index)).join("\n")}`;
}

function renderArticle(doc: Extract<TwildaDocument, { kind: "article" }>): string {
  return `<article class="article">
    <header class="article-head">
      <p class="kicker">${escapeHtml(doc.kicker)}</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="lede">${escapeHtml(doc.dek)}</p>
      <p class="byline">${escapeHtml(doc.byline)}</p>
    </header>
    <div class="article-body">
      ${doc.blocks.map(renderBlock).join("\n")}
    </div>
  </article>`;
}

/** Full document HTML shared by the static site and the editor proof. */
export function renderDocument(doc: TwildaDocument, options: RenderOptions = {}): string {
  const ctx: Ctx = { annotate: options.annotate === true };
  const body = doc.kind === "article" ? renderArticle(doc) : renderPage(ctx, doc);
  return `<div class="magazine">${renderMast()}${body}${renderFooter()}</div>`;
}
