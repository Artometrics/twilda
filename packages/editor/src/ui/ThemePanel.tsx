import { DEFAULT_THEME, THEME_FONTS, THEME_FONT_IDS, contrastRatio, type SiteSettings, type Theme } from "@twilda/core";
import { useId } from "react";

const COLOR_LABELS: Array<[keyof Theme["colors"], string]> = [
  ["paper", "Paper (page background)"],
  ["ink", "Ink (text)"],
  ["muted", "Muted text"],
  ["hair", "Rules and borders"],
  ["kicker", "Kicker and accent"],
  ["plate", "Image plate"],
];

function ColorField({ label, value, testId, onChange }: { label: string; value: string; testId: string; onChange: (value: string) => void }) {
  const id = useId();
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="field color-field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <div className="color-row">
        <input
          type="color"
          aria-label={`${label} picker`}
          data-testid={`${testId}-picker`}
          value={valid ? value.toLowerCase() : "#000000"}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          type="text"
          inputMode="text"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          data-testid={testId}
          aria-invalid={!valid}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {valid ? null : <span className="field-error">Use a six-digit hex color such as #1a1714.</span>}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  testId,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  testId: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>
          {label}: <strong data-testid={`${testId}-value`}>{unit === "px" ? `${value}px` : `${value}×`}</strong>
        </span>
      </label>
      <input id={id} type="range" data-testid={testId} min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

/**
 * Theme tokens and the masthead. Every control writes one value from a closed list or a
 * bounded range, and the page beside it repaints as you drag. Nothing typed here reaches a
 * stylesheet as free text. The settings are one file in git, `content/site.json`.
 */
export function ThemePanel({
  site,
  busy,
  canPublish,
  onChange,
  onPublish,
}: {
  site: SiteSettings;
  busy: boolean;
  canPublish: boolean;
  onChange: (site: SiteSettings) => void;
  onPublish: () => void;
}) {
  const theme = site.theme;
  const setTheme = (patch: Partial<Theme>) => onChange({ ...site, theme: { ...theme, ...patch } });
  const setColor = (key: keyof Theme["colors"], value: string) => setTheme({ colors: { ...theme.colors, [key]: value } });
  const contrast = /^#[0-9a-fA-F]{6}$/.test(theme.colors.ink) && /^#[0-9a-fA-F]{6}$/.test(theme.colors.paper) ? contrastRatio(theme.colors.ink, theme.colors.paper) : 0;
  const isDefault = JSON.stringify(theme) === JSON.stringify(DEFAULT_THEME);
  const chrome = site.chrome;
  const setChrome = (patch: Partial<SiteSettings["chrome"]>) => onChange({ ...site, chrome: { ...chrome, ...patch } });
  const invalid = Object.values(theme.colors).some((value) => !/^#[0-9a-fA-F]{6}$/.test(value));

  return (
    <section className="pane pane-theme" aria-label="Theme" data-testid="theme-panel">
      <header className="pane-head">
        <h2>Theme</h2>
        <p>Colors, fonts, type scale, and spacing for every page. The page shows the change as you make it. Publishing opens a pull request that changes one file, content/site.json.</p>
      </header>
      <div className="theme-body">
        <h3>Colors</h3>
        {COLOR_LABELS.map(([key, label]) => (
          <ColorField key={key} label={label} value={theme.colors[key]} testId={`theme-color-${key}`} onChange={(value) => setColor(key, value)} />
        ))}
        <p className={contrast >= 4.5 ? "hint ok" : "hint warn"} data-testid="theme-contrast" role="status">
          {contrast > 0
            ? contrast >= 4.5
              ? `Text on paper: ${contrast.toFixed(1)}:1. Readable.`
              : `Text on paper: ${contrast.toFixed(1)}:1. Hard to read. Aim for 4.5:1 or more.`
            : "Fix the hex colors to check contrast."}
        </p>

        <h3>Fonts</h3>
        <label className="field">
          <span>Headings</span>
          <select data-testid="theme-font-heading" value={theme.fonts.heading} onChange={(event) => setTheme({ fonts: { ...theme.fonts, heading: event.target.value as Theme["fonts"]["heading"] } })}>
            {THEME_FONT_IDS.map((id) => (
              <option key={id} value={id}>
                {THEME_FONTS[id].label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Body text</span>
          <select data-testid="theme-font-body" value={theme.fonts.body} onChange={(event) => setTheme({ fonts: { ...theme.fonts, body: event.target.value as Theme["fonts"]["body"] } })}>
            {THEME_FONT_IDS.map((id) => (
              <option key={id} value={id}>
                {THEME_FONTS[id].label}
              </option>
            ))}
          </select>
        </label>

        <h3>Type scale and spacing</h3>
        <RangeField label="Body size" value={theme.baseSize} min={15} max={21} step={0.5} unit="px" testId="theme-base" onChange={(baseSize) => setTheme({ baseSize })} />
        <RangeField label="Headline size" value={theme.headingScale} min={0.75} max={1.3} step={0.05} unit="x" testId="theme-heading-scale" onChange={(headingScale) => setTheme({ headingScale })} />
        <RangeField label="Spacing" value={theme.spacing} min={0.7} max={1.6} step={0.05} unit="x" testId="theme-spacing" onChange={(spacing) => setTheme({ spacing })} />

        <h3>Masthead</h3>
        <label className="field">
          <span>Site name</span>
          <input data-testid="chrome-name" value={chrome.name} maxLength={60} onChange={(event) => setChrome({ name: event.target.value })} />
        </label>
        <label className="field">
          <span>Issue label</span>
          <input data-testid="chrome-issue" value={chrome.issueLabel} maxLength={60} onChange={(event) => setChrome({ issueLabel: event.target.value })} />
        </label>
        <label className="field">
          <span>Note under the masthead</span>
          <textarea data-testid="chrome-note" rows={3} value={chrome.note} maxLength={240} onChange={(event) => setChrome({ note: event.target.value })} />
        </label>
        <label className="field">
          <span>Colophon (page footer)</span>
          <textarea data-testid="chrome-colophon" rows={3} value={chrome.colophon} maxLength={400} onChange={(event) => setChrome({ colophon: event.target.value })} />
        </label>

        <div className="sheet-actions theme-actions">
          <button type="button" className="btn" data-testid="theme-reset" disabled={isDefault || busy} onClick={() => setTheme(structuredClone(DEFAULT_THEME))}>
            Reset theme
          </button>
          <button type="button" className="btn btn-primary" data-testid="theme-publish" disabled={busy || invalid || !chrome.name.trim()} onClick={onPublish}>
            {canPublish ? "Publish theme" : "Publish theme (needs token)"}
          </button>
        </div>
      </div>
    </section>
  );
}
