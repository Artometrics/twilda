import { z } from "./zod";
import { TwildaError } from "./errors";
import { formsConfigSchema, type FormsConfig } from "./forms";
import { assertJsonBounds } from "./json-guard";
import { PRESET_IDS, type PresetId } from "./modes";
import { hrefSchema } from "./schema";
import type { SiteChrome } from "./render";
import { DEFAULT_CHROME } from "./render";

/**
 * Site settings: the masthead and colophon around every page, and a small set of
 * theme tokens. One JSON file, `content/site.json`, stored in git like a document.
 * Both the static site and the editors read it, so the page you edit is dressed the
 * way the page that ships will be.
 *
 * Theme tokens are a closed list on purpose. Colors are six-digit hex, fonts come from
 * a curated list of stacks, and the type scale and spacing are bounded numbers. Nothing
 * a person types reaches a stylesheet as free text.
 */

export const SITE_VERSION = 1;

const text = (max: number) => z.string().trim().max(max);

export const siteChromeSchema = z.object({
  name: text(60).min(1),
  issueLabel: text(60),
  note: text(240),
  nav: z.array(z.object({ label: text(40).min(1), href: hrefSchema })).max(8),
  colophon: text(400),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color such as #1a1714.");

/** Curated stacks. Only `newsreader` and `public-sans` ship with the site; the rest are system fonts, so no font is fetched from a third party. */
export const THEME_FONTS = {
  newsreader: { label: "Newsreader (serif, bundled)", stack: '"Newsreader", Georgia, serif', kind: "serif" },
  "public-sans": { label: "Public Sans (sans, bundled)", stack: '"Public Sans", "Segoe UI", sans-serif', kind: "sans" },
  georgia: { label: "Georgia (serif, system)", stack: 'Georgia, "Times New Roman", serif', kind: "serif" },
  charter: { label: "Charter (serif, system)", stack: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', kind: "serif" },
  "system-sans": { label: "System sans", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', kind: "sans" },
  humanist: { label: "Humanist sans (system)", stack: 'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", sans-serif', kind: "sans" },
} as const;

export type ThemeFontId = keyof typeof THEME_FONTS;
export const THEME_FONT_IDS = Object.keys(THEME_FONTS) as [ThemeFontId, ...ThemeFontId[]];

export const themeSchema = z.object({
  colors: z.object({
    paper: hex,
    ink: hex,
    muted: hex,
    hair: hex,
    kicker: hex,
    plate: hex,
  }),
  fonts: z.object({
    heading: z.enum(THEME_FONT_IDS),
    body: z.enum(THEME_FONT_IDS),
  }),
  /** Body text size in px. */
  baseSize: z.number().min(15).max(21).multipleOf(0.5),
  /** Multiplier on every headline size. */
  headingScale: z.number().min(0.75).max(1.3).multipleOf(0.05),
  /** Multiplier on vertical rhythm: section padding and the gaps between blocks. */
  spacing: z.number().min(0.7).max(1.6).multipleOf(0.05),
});

export type Theme = z.infer<typeof themeSchema>;

/** The Field Desk look. Every default equals the template stylesheet's own fallback, so an empty theme changes nothing. */
export const DEFAULT_THEME: Theme = {
  colors: {
    paper: "#f3efe4",
    ink: "#1a1714",
    muted: "#5c564c",
    hair: "#d4cbb8",
    kicker: "#9d2b1f",
    plate: "#243126",
  },
  fonts: { heading: "newsreader", body: "public-sans" },
  baseSize: 17,
  headingScale: 1,
  spacing: 1,
};

/** Fields the masthead may override for one kind of document, or for one document. */
const chromeOverrideSchema = siteChromeSchema.partial();

export const siteSchema = z.object({
  version: z.literal(SITE_VERSION),
  /**
   * Which mode (preset) the site is in. Optional: a site with no `mode` is a magazine, as every
   * site was before modes existed. The mode picks the section library the desk offers and the
   * masthead styling. It never restricts what the renderer prints.
   */
  mode: z.enum(PRESET_IDS).optional(),
  chrome: siteChromeSchema,
  /**
   * Where a form on the site sends what a visitor typed. Optional: a site with no `forms` has no form
   * endpoint, and its Content-Security-Policy keeps `form-action`, `connect-src`, and `script-src` shut
   * (see `siteCsp`). Twilda stores nothing a visitor submits.
   */
  forms: formsConfigSchema.optional(),
  /** Per-template overrides: `article` pages and `page` pages can say a different issue label, note, or nav. */
  templates: z.object({ article: chromeOverrideSchema.optional(), page: chromeOverrideSchema.optional() }).default({}),
  /** Per-document overrides keyed by document id. Applied after the template override. */
  documents: z.record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), chromeOverrideSchema).default({}),
  theme: themeSchema,
});

export type SiteSettings = z.infer<typeof siteSchema>;
export type { FormsConfig };
export type ChromeOverride = z.infer<typeof chromeOverrideSchema>;

export function defaultSite(): SiteSettings {
  return {
    version: SITE_VERSION,
    chrome: structuredClone(DEFAULT_CHROME),
    templates: {},
    documents: {},
    theme: structuredClone(DEFAULT_THEME),
  };
}

/** Largest `content/site.json` Twilda will parse. The real file is about 1 KB. */
export const MAX_SITE_CHARS = 200_000;

export function parseSite(textValue: string): SiteSettings {
  if (textValue.length > MAX_SITE_CHARS) {
    throw new TwildaError("content/site.json is too large to read.", "invalid-site");
  }
  let value: unknown;
  try {
    value = JSON.parse(textValue) as unknown;
  } catch {
    throw new TwildaError("content/site.json is not valid JSON.", "invalid-json");
  }
  assertJsonBounds(value);
  const parsed = siteSchema.safeParse(value);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "site"}: ${issue.message}`).join("; ");
    throw new TwildaError(detail, "invalid-site");
  }
  return parsed.data;
}

export function serializeSite(site: SiteSettings): string {
  const parsed = siteSchema.parse(site);
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

/** The masthead for one document: the site chrome, then its template's override, then its own. */
export function resolveChrome(site: SiteSettings, doc: { id: string; kind: "article" | "page" }): SiteChrome {
  const template = site.templates[doc.kind] ?? {};
  const own = site.documents[doc.id] ?? {};
  const merged = { ...site.chrome, ...template, ...own };
  return { ...merged, nav: merged.nav.map((item) => ({ ...item })) };
}

/** Render options that depend on the site: the masthead for this document and the site's mode. */
export function renderOptionsFor(
  site: SiteSettings,
  doc: { id: string; kind: "article" | "page" },
): { chrome: SiteChrome; mode?: PresetId; forms?: FormsConfig } {
  const chrome = resolveChrome(site, doc);
  const options: { chrome: SiteChrome; mode?: PresetId; forms?: FormsConfig } = { chrome };
  if (site.mode) options.mode = site.mode;
  if (site.forms) options.forms = site.forms;
  return options;
}

/**
 * Render options for showing a document inside an editor (the desk's page pane, the click-to-edit build).
 * The same as {@link renderOptionsFor} with `preview` on, so a form prints inert: it cannot post, and it
 * loads no script, whatever `forms` says. Anything that serves the page to visitors uses `renderOptionsFor`.
 */
export function previewOptionsFor(
  site: SiteSettings,
  doc: { id: string; kind: "article" | "page" },
): { chrome: SiteChrome; mode?: PresetId; forms?: FormsConfig; preview: true } {
  return { ...renderOptionsFor(site, doc), preview: true };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** A theme that always passes the schema: invalid colors fall back to the default, and an invalid theme to the default. */
function safeTheme(input: Theme): Theme {
  const direct = themeSchema.safeParse(input);
  if (direct.success) return direct.data;
  const colors = { ...DEFAULT_THEME.colors };
  const given = (input as { colors?: Record<string, unknown> } | null)?.colors;
  for (const key of Object.keys(colors) as Array<keyof Theme["colors"]>) {
    const value = given?.[key];
    if (typeof value === "string" && HEX.test(value)) colors[key] = value;
  }
  const retry = themeSchema.safeParse({ ...(input as object), colors });
  return retry.success ? retry.data : DEFAULT_THEME;
}

/** CSS custom properties for a theme, keyed by name. Values come only from the validated closed list. */
export function themeVars(input: Theme): Record<string, string> {
  const theme = safeTheme(input);
  const rem = (px: number) => `${Number((px / 16).toFixed(4))}rem`;
  return {
    "--site-paper": theme.colors.paper.toLowerCase(),
    "--site-ink": theme.colors.ink.toLowerCase(),
    "--site-muted": theme.colors.muted.toLowerCase(),
    "--site-hair": theme.colors.hair.toLowerCase(),
    "--site-kicker": theme.colors.kicker.toLowerCase(),
    "--site-plate": theme.colors.plate.toLowerCase(),
    "--site-font-heading": THEME_FONTS[theme.fonts.heading].stack,
    "--site-font-body": THEME_FONTS[theme.fonts.body].stack,
    "--site-base": rem(theme.baseSize),
    "--site-heading-scale": String(theme.headingScale),
    "--site-space": String(theme.spacing),
  };
}

/** A stylesheet for the site. Empty when the theme is the default, so the default site carries no override. */
export function themeCss(theme: Theme): string {
  const parsed = themeSchema.parse(theme);
  if (JSON.stringify(parsed) === JSON.stringify(DEFAULT_THEME)) return "";
  const body = Object.entries(themeVars(parsed))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return `:root{${body}}\nhtml,body{background:${parsed.colors.paper.toLowerCase()}}\n`;
}

/** WCAG contrast ratio of two hex colors, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hexColor: string) => {
    const n = Number.parseInt(hexColor.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
