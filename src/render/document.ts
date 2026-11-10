import type {
  CalloutBlock,
  CarouselSection,
  CategoryTilesSection,
  ContentDocument,
  FigureBlock,
  HeadingBlock,
  HeadlineFactsSection,
  ListBlock,
  MagazineFeatureSection,
  ParagraphBlock,
  PullQuoteBlock,
  Section,
  StoryGridSection,
} from "../schema/sections";
import { escapeHtml, safeHref, safeMedia } from "./escape";

function plate(src: string, alt: string): string {
  const media = safeMedia(src);
  const safeAlt = escapeHtml(alt);
  if (!media) {
    return `<div class="plate plate-missing" role="img" aria-label="${safeAlt}"><span>Plate unavailable</span></div>`;
  }
  return `<img class="plate" src="${escapeHtml(media)}" alt="${safeAlt}" />`;
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function renderCarousel(section: CarouselSection): string {
  const slides = section.slides
    .map(
      (slide) => `<a class="slide" href="${escapeHtml(safeHref(slide.href))}">
        ${plate(slide.image, slide.imageAlt)}
        <p class="kicker">${escapeHtml(slide.kicker)}</p>
        <h2>${escapeHtml(slide.title)}</h2>
        <p class="dek">${escapeHtml(slide.dek)}</p>
      </a>`,
    )
    .join("");
  const label = section.label ? `<p class="kicker">${escapeHtml(section.label)}</p>` : "";
  return `<section class="section carousel" id="${escapeHtml(section.id)}" aria-label="${escapeHtml(section.label || "Carousel")}">${label}<div class="carousel-track">${slides}</div></section>`;
}

function renderStoryGrid(section: StoryGridSection): string {
  const lead = section.lead;
  const stories = section.stories
    .map(
      (story) => `<li>
        <a href="${escapeHtml(safeHref(story.href))}">
          <p class="kicker">${escapeHtml(story.kicker)}</p>
          <h3>${escapeHtml(story.title)}</h3>
          <p class="dek">${escapeHtml(story.dek)}</p>
        </a>
      </li>`,
    )
    .join("");
  return `<section class="section story-grid-section" id="${escapeHtml(section.id)}">
    <p class="kicker">${escapeHtml(section.kicker)}</p>
    <div class="story-grid">
      <a class="lead" href="${escapeHtml(safeHref(lead.href))}">
        ${plate(lead.image, lead.imageAlt)}
        <p class="kicker">${escapeHtml(lead.kicker)}</p>
        <h2>${escapeHtml(lead.title)}</h2>
        <p class="dek">${escapeHtml(lead.dek)}</p>
        <p class="byline">${escapeHtml(lead.byline)}</p>
      </a>
      <ol class="shorts">${stories}</ol>
    </div>
  </section>`;
}

function renderFacts(section: HeadlineFactsSection): string {
  const facts = section.facts
    .map(
      (fact) =>
        `<li><span class="fact-label">${escapeHtml(fact.label)}</span><span class="fact-value">${escapeHtml(fact.value)}</span></li>`,
    )
    .join("");
  return `<section class="section facts-section" id="${escapeHtml(section.id)}">
    <div class="fact-layout">
      <div>
        <p class="kicker">${escapeHtml(section.kicker)}</p>
        <h2>${escapeHtml(section.headline)}</h2>
        <p class="dek">${escapeHtml(section.dek)}</p>
      </div>
      <ol class="facts">${facts}</ol>
    </div>
  </section>`;
}

function renderFeature(section: MagazineFeatureSection): string {
  return `<section class="section feature-section" id="${escapeHtml(section.id)}">
    <div class="feature">
      ${plate(section.image, section.imageAlt)}
      <div>
        <p class="kicker">${escapeHtml(section.kicker)}</p>
        <h2>${escapeHtml(section.title)}</h2>
        <p class="dek">${escapeHtml(section.dek)}</p>
        <p class="byline">${escapeHtml(section.byline)}</p>
        <a class="more" href="${escapeHtml(safeHref(section.href))}">Read the feature</a>
      </div>
    </div>
  </section>`;
}

function renderTiles(section: CategoryTilesSection): string {
  const tiles = section.tiles
    .map(
      (tile) => `<li>
        <a href="${escapeHtml(safeHref(tile.href))}">
          ${plate(tile.image, tile.imageAlt)}
          <h3>${escapeHtml(tile.title)}</h3>
          <p class="dek">${escapeHtml(tile.dek)}</p>
        </a>
      </li>`,
    )
    .join("");
  return `<section class="section tiles-section" id="${escapeHtml(section.id)}">
    <h2>${escapeHtml(section.heading)}</h2>
    <ul class="tiles">${tiles}</ul>
  </section>`;
}

function renderHeading(section: HeadingBlock): string {
  const tag = section.level === 3 ? "h3" : "h2";
  return `<${tag} class="article-heading" id="${escapeHtml(section.id)}">${escapeHtml(section.text)}</${tag}>`;
}

function renderParagraph(section: ParagraphBlock): string {
  return `<div class="prose" id="${escapeHtml(section.id)}">${paragraphs(section.text)}</div>`;
}

function renderQuote(section: PullQuoteBlock): string {
  const cite = section.attribution
    ? `<footer>${escapeHtml(section.attribution)}</footer>`
    : "";
  return `<blockquote class="pull-quote" id="${escapeHtml(section.id)}"><p>${escapeHtml(section.quote)}</p>${cite}</blockquote>`;
}

function renderFigure(section: FigureBlock): string {
  const caption = section.caption ? `<figcaption>${escapeHtml(section.caption)}</figcaption>` : "";
  return `<figure class="figure" id="${escapeHtml(section.id)}">${plate(section.image, section.imageAlt)}${caption}</figure>`;
}

function renderList(section: ListBlock): string {
  const tag = section.ordered ? "ol" : "ul";
  const items = section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<${tag} class="body-list" id="${escapeHtml(section.id)}">${items}</${tag}>`;
}

function renderCallout(section: CalloutBlock): string {
  return `<aside class="callout" id="${escapeHtml(section.id)}">
    <p class="kicker">Note</p>
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.text)}</p>
  </aside>`;
}

function renderSection(section: Section): string {
  switch (section.type) {
    case "carousel":
      return renderCarousel(section);
    case "story-grid":
      return renderStoryGrid(section);
    case "headline-facts":
      return renderFacts(section);
    case "magazine-feature":
      return renderFeature(section);
    case "category-tiles":
      return renderTiles(section);
    case "heading":
      return renderHeading(section);
    case "paragraph":
      return renderParagraph(section);
    case "pull-quote":
      return renderQuote(section);
    case "figure":
      return renderFigure(section);
    case "list":
      return renderList(section);
    case "callout":
      return renderCallout(section);
    default: {
      const exhaustive: never = section;
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

function renderPage(doc: ContentDocument): string {
  return `<header class="issue-intro">
    <p class="kicker">${escapeHtml(doc.kicker)}</p>
    <h1>${escapeHtml(doc.title)}</h1>
    <p class="lede">${escapeHtml(doc.dek)}</p>
  </header>
  ${doc.sections.map(renderSection).join("\n")}`;
}

function renderArticle(doc: ContentDocument): string {
  return `<article class="article">
    <header class="article-head">
      <p class="kicker">${escapeHtml(doc.kicker)}</p>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="lede">${escapeHtml(doc.dek)}</p>
      <p class="byline">${escapeHtml(doc.byline)}</p>
    </header>
    <div class="article-body">
      ${doc.sections.map(renderSection).join("\n")}
    </div>
  </article>`;
}

/** Full document HTML shared by the static site and the editor proof. */
export function renderDocument(doc: ContentDocument): string {
  const body = doc.kind === "article" ? renderArticle(doc) : renderPage(doc);
  return `<div class="magazine">${renderMast()}${body}${renderFooter()}</div>`;
}
