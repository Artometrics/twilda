import type { Block, PageSection, TwildaDocument } from "./schema";
import { escapeHtml, safeHref, safeMedia } from "./escape";
import { MAGAZINE_CSS } from "./magazine-css";
import { renderMarks, type MarksLevel } from "./marks";
import { parseVideoUrl } from "./embed";
import { isMailto, isSafeHref, isSitePath, isWebUrl } from "./url";
import type { PresetId } from "./modes";
import { FORM_FIELD_MAX, formFieldNames, isFormEndpoint, type FormFieldKind, type FormsConfig } from "./forms";

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
  /**
   * The site's mode (`corporate`, `magazine`, `leadgen`). It adds a `mode-<id>` class to the
   * wrapper so the stylesheet can dress the masthead for that mode. `magazine` and no mode
   * print the same markup, so a site that never chose a mode renders exactly as before.
   */
  mode?: PresetId;
  /**
   * The site's form settings (`forms` in `site.json`). A form section is a working form only when this
   * is present, valid, and `annotate` is off. Otherwise the same markup prints inert: fields disabled,
   * no `action`, and no script, so a preview or an unconnected site can never post anywhere.
   */
  forms?: FormsConfig;
}

type Ctx = { annotate: boolean; dataFiles: Record<string, string>; forms: FormsConfig | null };

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

/** `href` text for a button or contact line, or null. Site paths, http(s) addresses, and bare `mailto:` only. */
function actionTarget(raw: string): string | null {
  if (raw === "") return null;
  if (isSitePath(raw) || isWebUrl(raw) || isMailto(raw)) return raw;
  return null;
}

function action(ctx: Ctx, cls: string, raw: string, label: string, labelPath: string): string {
  const target = actionTarget(raw);
  if (target === null || label === "") return "";
  const rel = /^https?:/i.test(target) ? ' rel="noopener noreferrer"' : "";
  return `<a class="${cls}" href="${escapeHtml(target)}"${rel}${text(ctx, labelPath)}>${escapeHtml(label)}</a>`;
}

function sectionHead(ctx: Ctx, base: string, section: { kicker: string; heading: string; intro?: string }): string {
  const intro =
    section.intro === undefined ? "" : `<p class="dek section-intro"${text(ctx, `${base}.intro`, "text", "links")}>${renderMarks(section.intro, "links")}</p>`;
  return `<header class="section-head">
      <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
      <h2${text(ctx, `${base}.heading`)}>${escapeHtml(section.heading)}</h2>
      ${intro}
    </header>`;
}

function multiline(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function renderHero(ctx: Ctx, base: string, section: Extract<PageSection, { type: "hero" }>, leads: boolean): string {
  const tag = leads ? "h1" : "h2";
  const buttons = [
    action(ctx, "btn btn-primary", section.primaryHref, section.primaryLabel, `${base}.primaryLabel`),
    action(ctx, "btn btn-secondary", section.secondaryHref, section.secondaryLabel, `${base}.secondaryLabel`),
  ].join("");
  return `<section class="section hero-section" id="${escapeHtml(section.id)}"${node(ctx, base, "hero")}>
    <div class="hero">
      <div class="hero-copy">
        <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
        <${tag}${text(ctx, `${base}.title`)}>${escapeHtml(section.title)}</${tag}>
        <p class="lede"${text(ctx, `${base}.dek`, "text", "links")}>${renderMarks(section.dek, "links")}</p>
        ${buttons ? `<p class="actions">${buttons}</p>` : ""}
      </div>
      <div class="hero-plate">${plate(ctx, `${base}.image`, `${base}.imageAlt`, section.image, section.imageAlt)}</div>
    </div>
  </section>`;
}

function renderFeatureGrid(ctx: Ctx, base: string, section: Extract<PageSection, { type: "feature-grid" }>): string {
  const items = section.items
    .map((item, i) => {
      const at = `${base}.items.${i}`;
      return `<li class="feature-card">
        <p class="feature-label"${text(ctx, `${at}.label`)}>${escapeHtml(item.label)}</p>
        <h3${text(ctx, `${at}.title`)}>${escapeHtml(item.title)}</h3>
        <p${text(ctx, `${at}.text`, "text", "links")}>${renderMarks(item.text, "links")}</p>
      </li>`;
    })
    .join("");
  return `<section class="section feature-section" id="${escapeHtml(section.id)}"${node(ctx, base, "feature-grid")}>
    ${sectionHead(ctx, base, section)}
    <ul class="feature-grid">${items}</ul>
  </section>`;
}

function renderTeam(ctx: Ctx, base: string, section: Extract<PageSection, { type: "team" }>): string {
  const members = section.members
    .map((member, i) => {
      const at = `${base}.members.${i}`;
      return `<li class="member">
        <div class="member-photo">${plate(ctx, `${at}.image`, `${at}.imageAlt`, member.image, member.imageAlt)}</div>
        <h3${text(ctx, `${at}.name`)}>${escapeHtml(member.name)}</h3>
        <p class="member-role"${text(ctx, `${at}.role`)}>${escapeHtml(member.role)}</p>
        <p class="member-bio"${text(ctx, `${at}.bio`, "multiline")}>${escapeHtml(member.bio)}</p>
      </li>`;
    })
    .join("");
  return `<section class="section team-section" id="${escapeHtml(section.id)}"${node(ctx, base, "team")}>
    ${sectionHead(ctx, base, section)}
    <ul class="team-grid">${members}</ul>
  </section>`;
}

function renderPricing(ctx: Ctx, base: string, section: Extract<PageSection, { type: "pricing" }>): string {
  const tiers = section.tiers
    .map((tier, i) => {
      const at = `${base}.tiers.${i}`;
      const features = tier.features
        .map((feature, f) => `<li${text(ctx, `${at}.features.${f}`)}>${escapeHtml(feature)}</li>`)
        .join("");
      const button = action(ctx, tier.featured ? "btn btn-primary" : "btn btn-secondary", tier.ctaHref, tier.ctaLabel, `${at}.ctaLabel`);
      return `<li class="tier${tier.featured ? " tier-featured" : ""}">
        ${tier.featured ? `<p class="tier-flag">Recommended</p>` : ""}
        <h3${text(ctx, `${at}.name`)}>${escapeHtml(tier.name)}</h3>
        <p class="price"><span class="amount"${text(ctx, `${at}.price`)}>${escapeHtml(tier.price)}</span> <span class="period"${text(ctx, `${at}.period`)}>${escapeHtml(tier.period)}</span></p>
        <p class="tier-summary"${text(ctx, `${at}.summary`, "multiline")}>${escapeHtml(tier.summary)}</p>
        <ul class="tier-features">${features}</ul>
        ${button ? `<p class="actions">${button}</p>` : ""}
      </li>`;
    })
    .join("");
  return `<section class="section pricing-section" id="${escapeHtml(section.id)}"${node(ctx, base, "pricing")}>
    ${sectionHead(ctx, base, section)}
    <ol class="tiers">${tiers}</ol>
  </section>`;
}

function renderTestimonials(ctx: Ctx, base: string, section: Extract<PageSection, { type: "testimonials" }>): string {
  const items = section.items
    .map((item, i) => {
      const at = `${base}.items.${i}`;
      return `<li><figure class="quote">
        <p class="quote-text"${text(ctx, `${at}.quote`, "multiline")}>${escapeHtml(item.quote)}</p>
        <figcaption><strong${text(ctx, `${at}.name`)}>${escapeHtml(item.name)}</strong> <span class="quote-role"${text(ctx, `${at}.role`)}>${escapeHtml(item.role)}</span></figcaption>
      </figure></li>`;
    })
    .join("");
  return `<section class="section testimonials-section" id="${escapeHtml(section.id)}"${node(ctx, base, "testimonials")}>
    ${sectionHead(ctx, base, section)}
    <ul class="quotes">${items}</ul>
  </section>`;
}

function renderContact(ctx: Ctx, base: string, section: Extract<PageSection, { type: "contact" }>): string {
  const channels = section.channels
    .map((channel, i) => {
      const at = `${base}.channels.${i}`;
      const target = actionTarget(channel.href);
      const rel = target !== null && /^https?:/i.test(target) ? ' rel="noopener noreferrer"' : "";
      const value = target
        ? `<a class="channel-value" href="${escapeHtml(target)}"${rel}${text(ctx, `${at}.value`)}>${escapeHtml(channel.value)}</a>`
        : `<span class="channel-value"${text(ctx, `${at}.value`)}>${escapeHtml(channel.value)}</span>`;
      return `<li><span class="fact-label"${text(ctx, `${at}.label`)}>${escapeHtml(channel.label)}</span>${value}</li>`;
    })
    .join("");
  return `<section class="section contact-section" id="${escapeHtml(section.id)}"${node(ctx, base, "contact")}>
    ${sectionHead(ctx, base, section)}
    <div class="contact-layout">
      <ul class="channels">${channels}</ul>
      <p class="address"${text(ctx, `${base}.address`, "multiline")}>${multiline(section.address)}</p>
    </div>
  </section>`;
}

function renderSocialProof(ctx: Ctx, base: string, section: Extract<PageSection, { type: "social-proof" }>): string {
  const stats = section.stats
    .map((stat, i) => {
      const at = `${base}.stats.${i}`;
      return `<li><strong class="stat-value"${text(ctx, `${at}.value`)}>${escapeHtml(stat.value)}</strong><span class="stat-label"${text(ctx, `${at}.label`)}>${escapeHtml(stat.label)}</span></li>`;
    })
    .join("");
  const brands = section.brands.map((brand, i) => `<li${text(ctx, `${base}.brands.${i}`)}>${escapeHtml(brand)}</li>`).join("");
  return `<section class="section proof-section" id="${escapeHtml(section.id)}"${node(ctx, base, "social-proof")}>
    ${sectionHead(ctx, base, section)}
    ${stats ? `<ul class="stats">${stats}</ul>` : ""}
    ${brands ? `<ul class="brands">${brands}</ul>` : ""}
  </section>`;
}

function renderCta(ctx: Ctx, base: string, section: Extract<PageSection, { type: "cta" }>): string {
  const asks = section.asks.map((ask, i) => `<li${text(ctx, `${base}.asks.${i}`)}>${escapeHtml(ask)}</li>`).join("");
  const button = action(ctx, "btn btn-primary", section.buttonHref, section.buttonLabel, `${base}.buttonLabel`);
  return `<section class="section cta-section" id="${escapeHtml(section.id)}"${node(ctx, base, "cta")}>
    <div class="cta">
      <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
      <h2${text(ctx, `${base}.heading`)}>${escapeHtml(section.heading)}</h2>
      <p class="dek cta-text"${text(ctx, `${base}.text`, "text", "links")}>${renderMarks(section.text, "links")}</p>
      ${asks ? `<ul class="cta-asks">${asks}</ul>` : ""}
      ${button ? `<p class="actions">${button}</p>` : ""}
      <p class="cta-note"${text(ctx, `${base}.note`)}>${escapeHtml(section.note)}</p>
    </div>
  </section>`;
}

const INPUT_TYPE: Record<FormFieldKind, { type: string; autocomplete: string; inputmode?: string }> = {
  name: { type: "text", autocomplete: "name" },
  email: { type: "email", autocomplete: "email", inputmode: "email" },
  phone: { type: "tel", autocomplete: "tel", inputmode: "tel" },
  company: { type: "text", autocomplete: "organization" },
  message: { type: "text", autocomplete: "off" },
  text: { type: "text", autocomplete: "off" },
  consent: { type: "checkbox", autocomplete: "off" },
};

/** The script a connected form loads. One external file served by the site itself, never inline. */
export const FORMS_SCRIPT_PATH = "/twilda-forms.js";

function renderFormField(ctx: Ctx, base: string, section: Extract<PageSection, { type: "form" }>, index: number, name: string): string {
  const field = section.fields[index];
  if (!field) return "";
  const at = `${base}.fields.${index}`;
  const fieldId = `${section.id}-${field.id}`;
  const hintId = `${fieldId}-hint`;
  const errId = `${fieldId}-err`;
  const showHint = field.hint !== "" || ctx.annotate;
  const describedBy = `${showHint ? `${hintId} ` : ""}${errId}`;
  const req = field.required ? ' required aria-required="true"' : "";
  const mark = field.required ? '<span class="form-req" aria-hidden="true"> *</span>' : "";
  const label = `<label class="form-label" for="${escapeHtml(fieldId)}"><span${text(ctx, `${at}.label`)}>${escapeHtml(field.label)}</span>${mark}</label>`;
  const hint = showHint ? `<p class="form-hint" id="${escapeHtml(hintId)}"${text(ctx, `${at}.hint`)}>${escapeHtml(field.hint)}</p>` : "";
  const error = `<p class="form-error" id="${escapeHtml(errId)}" hidden></p>`;
  const max = FORM_FIELD_MAX[field.kind];
  const common = `id="${escapeHtml(fieldId)}" name="${name}" data-tf-kind="${field.kind}" maxlength="${max}" aria-describedby="${escapeHtml(describedBy)}"`;
  if (field.kind === "consent") {
    return `<div class="form-row form-row-consent">
        <input class="form-check" type="checkbox" id="${escapeHtml(fieldId)}" name="${name}" value="yes" data-tf-kind="consent" aria-describedby="${escapeHtml(describedBy)}"${req} />
        ${label}
        ${hint}${error}
      </div>`;
  }
  const control =
    field.kind === "message"
      ? `<textarea class="form-input form-textarea" ${common} rows="5" autocomplete="off"${req}></textarea>`
      : `<input class="form-input" type="${INPUT_TYPE[field.kind].type}" ${common} autocomplete="${INPUT_TYPE[field.kind].autocomplete}"${INPUT_TYPE[field.kind].inputmode ? ` inputmode="${INPUT_TYPE[field.kind].inputmode}"` : ""}${req} />`;
  return `<div class="form-row form-row-${field.kind}">
        ${label}
        ${hint}
        ${control}
        ${error}
      </div>`;
}

/**
 * A form. Integrate-only: when the site has a valid `forms.endpoint` the form posts there and nowhere
 * else, and Twilda keeps nothing. Without one (or while editing) it prints inert, so it cannot post.
 * Every string is escaped, every name and id is derived from validated data, and there is no inline
 * script, handler, or style. The honeypot (`_hp`) and the time trap (`_elapsed_ms`, added by the page's
 * script) are the spam checks; the receiver should repeat both.
 */
function renderForm(ctx: Ctx, base: string, section: Extract<PageSection, { type: "form" }>): string {
  const live = ctx.forms !== null && !ctx.annotate;
  const names = formFieldNames(section.fields);
  const fields = section.fields.map((_, index) => renderFormField(ctx, base, section, index, names[index] as string)).join("\n      ");
  const hiddenFields = live
    ? Object.entries((ctx.forms as FormsConfig).hidden)
        .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`)
        .join("")
    : "";
  const trap = `<div class="form-trap" aria-hidden="true"><label>Leave this field empty<input type="text" name="_hp" tabindex="-1" autocomplete="off" value="" /></label></div>`;
  const attrs = live
    ? ` method="post" action="${escapeHtml((ctx.forms as FormsConfig).endpoint)}" accept-charset="utf-8" data-tf data-tf-mode="${(ctx.forms as FormsConfig).mode}" data-tf-format="${(ctx.forms as FormsConfig).format}"`
    : "";
  const notice =
    live || ctx.annotate ? "" : '<p class="form-note" role="note">This form is not connected yet. Add your form address to content/site.json.</p>';
  const privacy = section.privacy
    ? `<p class="form-privacy"${text(ctx, `${base}.privacy`, "text", "links")}>${renderMarks(section.privacy, "links")}</p>`
    : ctx.annotate
      ? `<p class="form-privacy"${text(ctx, `${base}.privacy`, "text", "links")}></p>`
      : "";
  const script = live ? `<script src="${FORMS_SCRIPT_PATH}" defer></script>` : "";
  const hiddenAttr = ctx.annotate ? "" : " hidden";
  return `<section class="section form-section form-${section.variant}" id="${escapeHtml(section.id)}"${node(ctx, base, "form")}>
    ${sectionHead(ctx, base, section)}
    <div class="form-card">
      ${notice}
      <form class="lead-form"${attrs}>
        <fieldset class="form-fields"${live ? "" : " disabled"}>
          <legend class="form-legend">${escapeHtml(section.heading)}</legend>
          ${fields}
          <input type="hidden" name="_form" value="${escapeHtml(section.id)}" />
          ${hiddenFields}
          ${trap}
          <button class="btn btn-primary form-submit" type="submit"${text(ctx, `${base}.submitLabel`)}>${escapeHtml(section.submitLabel)}</button>
        </fieldset>
      </form>
      <p class="form-error form-summary" role="alert" hidden></p>
      ${privacy}
      <div class="form-status form-success" role="status" tabindex="-1"${hiddenAttr}>
        <h3${text(ctx, `${base}.successTitle`)}>${escapeHtml(section.successTitle)}</h3>
        <p${text(ctx, `${base}.successText`)}>${escapeHtml(section.successText)}</p>
      </div>
      <div class="form-status form-failure" role="alert" tabindex="-1"${hiddenAttr}>
        <p${text(ctx, `${base}.errorText`)}>${escapeHtml(section.errorText)}</p>
      </div>
      ${script}
    </div>
  </section>`;
}

function renderCoverStory(ctx: Ctx, base: string, section: Extract<PageSection, { type: "cover-story" }>, leads: boolean): string {
  const tag = leads ? "h1" : "h2";
  const target = actionTarget(section.href);
  const rel = target !== null && /^https?:/i.test(target) ? ' rel="noopener noreferrer"' : "";
  const more =
    target && section.linkLabel
      ? `<a class="more" href="${escapeHtml(target)}"${rel}${text(ctx, `${base}.linkLabel`)}>${escapeHtml(section.linkLabel)}</a>`
      : "";
  return `<section class="section cover-section" id="${escapeHtml(section.id)}"${node(ctx, base, "cover-story")}>
    <div class="cover">
      <div class="cover-plate">${plate(ctx, `${base}.image`, `${base}.imageAlt`, section.image, section.imageAlt)}</div>
      <div class="cover-copy">
        <p class="kicker"${text(ctx, `${base}.kicker`)}>${escapeHtml(section.kicker)}</p>
        <${tag}${text(ctx, `${base}.title`)}>${escapeHtml(section.title)}</${tag}>
        <p class="lede"${text(ctx, `${base}.dek`, "text", "links")}>${renderMarks(section.dek, "links")}</p>
        <p class="byline"${text(ctx, `${base}.byline`)}>${escapeHtml(section.byline)}</p>
        ${more}
      </div>
    </div>
  </section>`;
}

function renderCategoryGrid(ctx: Ctx, base: string, section: Extract<PageSection, { type: "category-grid" }>): string {
  const items = section.categories
    .map((category, i) => {
      const at = `${base}.categories.${i}`;
      const target = actionTarget(category.href);
      const rel = target !== null && /^https?:/i.test(target) ? ' rel="noopener noreferrer"' : "";
      return `<li><a class="category" href="${escapeHtml(target ?? "#")}"${rel}>
        <span class="category-count"${text(ctx, `${at}.count`)}>${escapeHtml(category.count)}</span>
        <h3${text(ctx, `${at}.label`)}>${escapeHtml(category.label)}</h3>
        <p class="dek"${text(ctx, `${at}.dek`)}>${escapeHtml(category.dek)}</p>
      </a></li>`;
    })
    .join("");
  return `<section class="section category-section" id="${escapeHtml(section.id)}"${node(ctx, base, "category-grid")}>
    ${sectionHead(ctx, base, section)}
    <ul class="categories">${items}</ul>
  </section>`;
}

function factSquares(ctx: Ctx, base: string, facts: Array<{ value: string; label: string }>): string {
  const squares = facts
    .map(
      (fact, i) =>
        `<li><strong class="square-value"${text(ctx, `${base}.facts.${i}.value`)}>${escapeHtml(fact.value)}</strong><span class="square-label"${text(ctx, `${base}.facts.${i}.label`)}>${escapeHtml(fact.label)}</span></li>`,
    )
    .join("");
  return `<ol class="fact-squares">${squares}</ol>`;
}

function renderFastFactsSection(ctx: Ctx, base: string, section: Extract<PageSection, { type: "fast-facts" }>): string {
  return `<section class="section squares-section" id="${escapeHtml(section.id)}"${node(ctx, base, "fast-facts")}>
    ${sectionHead(ctx, base, section)}
    ${factSquares(ctx, base, section.facts)}
  </section>`;
}

function renderFastFactsBlock(ctx: Ctx, base: string, block: Extract<Block, { type: "fast-facts" }>): string {
  return `<section class="section squares-section" id="${escapeHtml(block.id)}"${node(ctx, base, "fast-facts")}>
    <h2${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</h2>
    ${factSquares(ctx, base, block.facts)}
  </section>`;
}

function renderPullQuote(ctx: Ctx, base: string, block: Extract<Block, { type: "pull-quote" }>): string {
  return `<figure class="pull-quote" id="${escapeHtml(block.id)}"${node(ctx, base, "pull-quote")}>
    <p${text(ctx, `${base}.quote`, "multiline")}>${escapeHtml(block.quote)}</p>
    <figcaption${text(ctx, `${base}.attribution`)}>${escapeHtml(block.attribution)}</figcaption>
  </figure>`;
}

/** Bar width as a whole percent of the largest bar. The stylesheet has one class per percent, so no inline style is needed. */
function barPercent(value: string, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isFinite(max) || max <= 0 || n <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((n / max) * 100)));
}

function renderBarChart(ctx: Ctx, base: string, block: Extract<Block, { type: "bar-chart" }>): string {
  const max = Math.max(0, ...block.bars.map((bar) => Number(bar.value)).filter(Number.isFinite));
  const rows = block.bars
    .map((bar, i) => {
      const at = `${base}.bars.${i}`;
      return `<li class="bar-row"><span class="bar-label"${text(ctx, `${at}.label`)}>${escapeHtml(bar.label)}</span><span class="bar-track"><span class="bar bar-w-${barPercent(bar.value, max)}"></span></span><span class="bar-value"><span${text(ctx, `${at}.value`)}>${escapeHtml(bar.value)}</span> <span class="bar-unit">${escapeHtml(block.unit)}</span></span></li>`;
    })
    .join("");
  return `<figure class="figure bar-chart" id="${escapeHtml(block.id)}"${node(ctx, base, "bar-chart")}>
    <figcaption><strong${text(ctx, `${base}.title`)}>${escapeHtml(block.title)}</strong></figcaption>
    <p class="dek"${text(ctx, `${base}.alt`)}>${escapeHtml(block.alt)}</p>
    <ol class="bars">${rows}</ol>
    ${block.caption ? `<p class="dek"${text(ctx, `${base}.caption`)}>${escapeHtml(block.caption)}</p>` : ""}
  </figure>`;
}

/** A page that opens with a hero or a cover story lets that section carry the `h1`, so the page title is not printed twice. */
function leadsPage(doc: Extract<TwildaDocument, { kind: "page" }>): boolean {
  const first = doc.sections[0]?.type;
  return first === "hero" || first === "cover-story";
}

function renderSection(ctx: Ctx, section: PageSection, index: number, leads = false): string {
  const base = `sections.${index}`;
  switch (section.type) {
    case "carousel":
      return renderCarousel(ctx, base, section);
    case "story-grid":
      return renderStoryGrid(ctx, base, section);
    case "menu-shelf":
      return renderMenu(ctx, base, section);
    case "hero":
      return renderHero(ctx, base, section, leads && index === 0);
    case "feature-grid":
      return renderFeatureGrid(ctx, base, section);
    case "team":
      return renderTeam(ctx, base, section);
    case "pricing":
      return renderPricing(ctx, base, section);
    case "testimonials":
      return renderTestimonials(ctx, base, section);
    case "contact":
      return renderContact(ctx, base, section);
    case "social-proof":
      return renderSocialProof(ctx, base, section);
    case "cta":
      return renderCta(ctx, base, section);
    case "cover-story":
      return renderCoverStory(ctx, base, section, leads && index === 0);
    case "category-grid":
      return renderCategoryGrid(ctx, base, section);
    case "fast-facts":
      return renderFastFactsSection(ctx, base, section);
    case "form":
      return renderForm(ctx, base, section);
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
    case "fast-facts":
      return renderFastFactsBlock(ctx, base, block);
    case "pull-quote":
      return renderPullQuote(ctx, base, block);
    case "bar-chart":
      return renderBarChart(ctx, base, block);
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
  const leads = leadsPage(doc);
  const sections = doc.sections.map((section, index) => renderSection(ctx, section, index, leads)).join("\n");
  if (leads) return sections;
  return `<header class="issue-intro">
    <p class="kicker"${text(ctx, "kicker")}>${escapeHtml(doc.kicker)}</p>
    <h1${text(ctx, "title")}>${escapeHtml(doc.title)}</h1>
    <p class="lede"${text(ctx, "dek", "text", "links")}>${renderMarks(doc.dek, "links")}</p>
  </header>
  ${sections}`;
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
  const forms = options.forms && isFormEndpoint(options.forms.endpoint) ? options.forms : null;
  const ctx: Ctx = { annotate: options.annotate === true, dataFiles: options.dataFiles ?? {}, forms };
  const chrome = options.chrome ?? DEFAULT_CHROME;
  const body = doc.kind === "article" ? renderArticle(ctx, doc) : renderPage(ctx, doc);
  const mode = options.mode && options.mode !== "magazine" && /^[a-z]+$/.test(options.mode) ? ` mode-${options.mode}` : "";
  return `<div class="magazine${mode}">${renderMast(chrome)}${body}${renderFooter(chrome)}</div>`;
}

const PREVIEW_EXTRA_CSS =
  "html,body{margin:0;background:#f3efe4}.chart-table{width:100%;border-collapse:collapse;font-size:.95rem}.chart-table th,.chart-table td{text-align:left;padding:.35rem .4rem;border-bottom:1px solid #d4cbb8}";

/** A standalone HTML document around {@link renderDocument}, with the template stylesheet inlined. No script tags. */
export function renderPreviewPage(doc: TwildaDocument, options: RenderOptions = {}): string {
  const title = escapeHtml(doc.title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title><style>${MAGAZINE_CSS}\n${PREVIEW_EXTRA_CSS}</style></head><body>${renderDocument(doc, options)}</body></html>`;
}
