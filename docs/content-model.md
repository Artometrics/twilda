# Content model

Documents are JSON. Zod schemas in `src/schema/sections.ts` are the contract the editor, the tests, and the static build share.

```ts
interface ContentDocument {
  id: string;            // folder name under content/
  kind: "page" | "article";
  title: string;
  slug: string;          // article URL is /articles/<slug>; the homepage id "home" is served at /
  dek: string;
  kicker: string;
  byline: string;
  updatedAt: string;     // set by the store on save and publish
  sections: Section[];   // order is the published order
}
```

Every section has `id` and `type`. Ids are stable so the desk can reorder without losing field edits.

## Page sections

| type | Role | Fields |
| --- | --- | --- |
| `carousel` | Sideways row of leads | `label`, `slides[]` of kicker, title, dek, href, image, imageAlt |
| `story-grid` | One lead and a stack of shorts | `kicker`, `lead`, `stories[]` |
| `headline-facts` | Headline beside a fact table | `kicker`, `headline`, `dek`, `facts[]` of label and value |
| `magazine-feature` | One feature with a plate | `kicker`, `title`, `dek`, `byline`, `href`, image, imageAlt |
| `category-tiles` | A row of doors into the issue | `heading`, `tiles[]` |

## Article sections

| type | Role | Fields |
| --- | --- | --- |
| `heading` | Section title | `level` 2 or 3, `text` |
| `paragraph` | Body. A blank line starts a new paragraph | `text` |
| `pull-quote` | A quotation | `quote`, `attribution` |
| `figure` | Plate and caption | `image`, `imageAlt`, `caption` |
| `list` | Ordered or bulleted | `ordered`, `items[]` |
| `callout` | Desk note | `title`, `text` |
| `headline-facts` | Same fact table as a page, for a franchise sheet | as above |

A page cannot contain article body blocks. An article cannot contain a carousel, story grid, magazine feature, or category tiles. The schema rejects the mismatch.

## Links and images

The renderer escapes text. Links must be site-relative paths such as `/articles/lumen-rail`. Other URLs, including `javascript:` and protocol-relative URLs, render as `#`. Images must be `/media/<name>.svg` files in `public/media`. The demo plates are original geometric drawings.

## Files

```text
content/<id>/draft.json        working copy
content/<id>/published.json    optional; required to appear on the site
```

The folder name, `id`, and the `id` field inside the JSON must match. Slugs of published documents must be unique.
