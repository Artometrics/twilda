# Ella Mae — Art & Style Guide

A reference for keeping the visual style consistent across future projects built on this
site. Everything here is extracted from the live code (`src/styles/global.css`,
`src/components/fundations/*`, and the marketing sections), so it reflects the actual
design system, not an idealized one.

> Source of truth for tokens: `src/styles/global.css` (`@theme`). Reusable primitives:
> `src/components/fundations/` (`Text`, `Button`, `Wrapper`, icons). Keep the misspelled
> `fundations/` folder name as-is.

---

## 1. Design personality

**"Neo-brutalist marketing, warmed up."** The look is bold and structural but friendly:

- **Thick black-ish frames** wrap the whole page (`border-x-8` on every content wrapper,
  `border-y-8` on the nav) using the darkest accent, `accent-900`. This "boxed poster"
  frame is the single most recognizable signature.
- **Fully rounded shapes** — buttons, avatars, blobs, and images are `rounded-full` or
  heavily rounded (`rounded-3xl`), softening the hard frame.
- **Hard offset shadows** (flat, colored, no blur) give a printed/sticker feel rather than
  soft material elevation.
- **Warm, muted palette** — off-white paper, terracotta red, slate-blue ink, warm greige
  neutrals. Nothing is pure white or cold gray.
- **Playful organic SVG "blobs"** float behind hero content for personality.
- **Generous whitespace and oversized display type** anchor a calm, confident tone.

Keep new work bold, boxed, rounded, and warm. Avoid soft glassmorphism, thin hairline
borders, neon gradients, or cold pure-gray neutrals — they fight the established style.

---

## 2. Color system

Colors are defined in OKLCH with full 50–950 ramps. There are three ramps plus two
absolutes. Use Tailwind classes like `bg-accent-900`, `text-secondary-500`,
`border-base-300`.

### `accent` — slate blue (primary "ink")
Cool blue-slate (hue ≈ 253). This is the primary brand/ink color. `accent-900` is used
for frames, borders, headings, and body copy; lighter steps for fills and hovers.

| Step | OKLCH | Typical use |
|------|-------|-------------|
| `accent-50` | `oklch(0.966 0.008 253.85)` | faint tints |
| `accent-200` | `oklch(0.879 0.031 258.95)` | accent button fill |
| `accent-500` | `oklch(0.62 0.074 252.87)` | accent shadow/border |
| `accent-900` | `oklch(0.231 0.027 253.42)` | **frames, borders, text, headings** |
| `accent-950` | `oklch(0.188 0.022 251.91)` | deepest |

### `secondary` — terracotta red (brand pop)
Warm red/terracotta (hue ≈ 29–41). Used for high-visibility surfaces like the nav bar
(`bg-secondary-500`) and accents that need to shout.

| Step | OKLCH | Typical use |
|------|-------|-------------|
| `secondary-200` | `oklch(0.86 0.062 32.09)` | soft red tint |
| `secondary-500` | `oklch(0.642 0.156 40.9)` | **nav bar / primary pop** |
| `secondary-900` | `oklch(0.239 0.058 41.41)` | deep red |

### `base` — warm greige neutral
Near-neutral with a warm cast (hue ≈ 68–78). Use for muted UI: borders (`base-300`),
muted button fills (`base-200`), secondary text.

| Step | OKLCH | Typical use |
|------|-------|-------------|
| `base-100` | `oklch(0.941 0.005 78.25)` | subtle fills |
| `base-200` | `oklch(0.879 0.011 67.7)` | muted hover |
| `base-300` | `oklch(0.823 0.015 74.39)` | muted border/shadow |
| `base-900` | `oklch(0.232 0.005 67.59)` | dark neutral |

### Absolutes
- `white` = `oklch(0.991 0.012 91.5)` — a **warm off-white "paper"**, not `#fff`. Use this
  as the page background and light surfaces.
- `black` = `oklch(0 0 0)` — true black, used sparingly.

**Rule of thumb:** page = warm `white`; ink/frames/text = `accent-900`; the loud brand
surface = `secondary-500`; quiet UI chrome = `base-*`.

---

## 3. Typography

- **Typeface:** `InterVariable` (falls back to `Inter`, then `sans-serif`). Ligatures and
  contextual alternates enabled (`font-feature-settings: 'liga' 1, 'calt' 1`). Loaded via
  `--font-sans` and `:root`.
- **Weights in use:** `font-medium` and `font-semibold` dominate; headings are semibold
  with `tracking-tight` and `text-balance`.
- **Color:** headings and body are almost always `accent-900` (not pure black).

### Scale (from `Text.astro` `variant` prop)
Use the `Text` component with a `variant` rather than raw Tailwind sizes.

Display (responsive, for hero/section titles):

| Variant | Mobile → Desktop |
|---------|------------------|
| `display6XL` | `text-4xl` → `text-[12rem]` |
| `display4XL` | `text-4xl` → `text-9xl` |
| `display2XL` | `text-5xl` → `text-7xl` |
| `displayXL` | `text-4xl` → `text-6xl` (hero H1) |
| `displayLG` | `text-3xl` → `text-5xl` |
| `displayMD` | `text-2xl` → `text-4xl` |
| `displaySM` | `text-lg` → `text-3xl` |

Body / UI text:

| Variant | Size |
|---------|------|
| `textXL` | `text-lg` → `text-2xl` |
| `textLG` | `text-base` → `text-xl` |
| `textBase` | `text-base` (default) |
| `textSM` | `text-sm` |
| `textXS` | `text-xs` |

Example:
```astro
<Text tag="h1" variant="displayXL" class="font-semibold tracking-tight text-accent-900 text-balance">
  Run every ops request from one calm workspace
</Text>
```

### Long-form / prose
`Wrapper variant="prose"` styles article bodies: `accent-900` text, medium headings,
links in `accent-800`, images `rounded-3xl` with a 2px `accent-900` border and shadow,
and blockquotes as **yellow (`bg-yellow-500`) rounded cards** with a 2px `accent-900`
border and shadow — a distinctive editorial flourish worth reusing.

---

## 4. Layout & structure

- **The frame:** `Wrapper` (`src/components/fundations/containers/Wrapper.astro`) centers
  content at `max-w-7xl` (2xl) and draws the signature `border-x-8 border-accent-900`
  vertical rails with `px-8`. Nearly every section sits inside a `Wrapper`.
  - `standard` — bordered rails + padding (default).
  - `standardPaddingless` — bordered rails, no padding.
  - `prose` — long-form typography container (see above).
- **Nav:** fixed top, full width, `bg-secondary-500` with `border-y-8 border-accent-900`;
  logo is uppercase white; mobile menu is a full-screen `bg-accent-900` overlay.
- **Section rhythm:** heavy vertical padding (hero uses `py-32 lg:py-64`); centered,
  `max-w-2xl` text columns for hero/CTA copy.
- **Homepage composition** (`src/pages/index.astro`): Hero → LogoCloud → Feature1–6 →
  Testimonial → Pricing → CTA → FAQ. Reuse this section-stack pattern for new pages.

---

## 5. Signature components & motifs

### Buttons (`Button.astro`)
- Shape: `rounded-full`, `border-2`, `font-semibold`, centered flex.
- **Press interaction:** `transition-all duration-500` + `focus:translate-y-1` +
  `focus:shadow-none` — the button visually "presses down" into its shadow. Preserve this.
- Variants:
  - `default` — white fill, `accent-900` text/border, hovers to `accent-800` + white text.
  - `accent` — `accent-200` fill, `accent-500` shadow/border, `accent-900` text.
  - `muted` — white fill, `base-300` border/shadow, `base-200` hover.
- Sizes `xxs`→`xl` (height `h-8`→`h-14`); `iconOnly` uses square `size-*` and pairs with
  the icon set. Shadow token scales with size (`shadow-xs`→`shadow`).

### Shadows (hard offset, `@theme`)
`--shadow-xs: 0px 1.5px`, `--shadow-sm: 0px 3px`, `--shadow: 0px 5px`,
`--shadow-lg: 0px 10px`. These are **flat offset shadows with no blur**, always paired
with an explicit color (e.g. `shadow-accent-900`, `shadow-base-300`) for the printed/
sticker look.

### Blobs
Organic SVGs in `src/images/blobs/` (`blob1–4.svg`) positioned absolutely behind hero
content, `rounded-full` with `shadow-accent-900`, hidden on small screens (`lg:block`).
Use them for playful background depth — sparingly, never over text.

### Icons
Minimal line icons in `src/components/fundations/icons/` (`ArrowRight`, `ChevronRight`,
`Check`, `Plus`, `Minus`, `Search`, `Menu`, `X`, `GitHub`, `XBrand`). Consistent stroke
style; size via a `size` prop. Prefer these over introducing a new icon library.

### Motion
Marquee keyframes in `@theme`: `--animate-marquee` (12s), `--animate-slowMarquee` /
`--animate-rightMarquee` (300s) for logo clouds / testimonial strips. `KeenSlider`
(`fundations/scripts/`) powers carousels; `Fuse` powers client-side fuzzy search
(used on the blog). Keep motion slow and ambient.

### Imagery
- Warm off-white backgrounds; illustrated/flat brand graphics and colorful SVGs over
  photography.
- Content images render via `astro:assets` `<Image>` from `src/images/` (there is **no**
  `public/` dir). In prose, images get `rounded-3xl` + 2px `accent-900` border + shadow.

---

## 6. Quick-start checklist for a new page/section

1. Wrap content in `<Wrapper variant="standard">` to inherit the bordered frame.
2. Background = warm `white`; text/headings = `accent-900`.
3. Titles via `<Text variant="displayXL|displayLG" tag="h*" class="font-semibold tracking-tight text-balance">`.
4. Body via `<Text variant="textLG|textBase">`.
5. CTAs via `<Button variant="accent|default" size="xl" rounded-full>` — keep the
   `focus:translate-y-1` press effect.
6. Use hard offset colored shadows (`shadow-* shadow-accent-900`), `rounded-full` /
   `rounded-3xl` corners, and `border-2 border-accent-900` outlines.
7. Reach for `secondary-500` only for a deliberate loud surface (like the nav).
8. Reuse existing icons, blobs, and marquee animations instead of adding new libraries.

---

*Tokens live in `src/styles/global.css`; primitives in `src/components/fundations/`. When
in doubt, copy an existing section component and swap the content.*
