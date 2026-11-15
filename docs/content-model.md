# Content model

Article blocks and page sections are `@twilda/core` (`packages/core/src/schema.ts`). The Field Desk store still keeps `content/<id>/draft.json` and `content/<id>/published.json`. See [architecture.md](architecture.md).

Documents are JSON. The Zod schema in `@twilda/core` is the contract the desk, the tests, and the static Field Desk build share. An article's body is `blocks`. A page's body is `sections`. `status` is `draft` or `published`. `id` and `slug` match.

```ts
interface ArticleDocument {
  id: string;            // matches slug; Field Desk folder name under content/
  kind: "article";
  title: string;
  slug: string;          // article URL is /articles/<slug>; the homepage id "home" is a page
  dek: string;
  kicker: string;
  byline: string;
  status: "draft" | "published";
  updatedAt: string;
  blocks: Block[];
}
```

A page has the same fields except `byline`, and `sections` instead of `blocks`.

Every section has `id` and `type`. Ids are stable so the desk can reorder without losing field edits.

## Page sections

| type | Role | Fields |
| --- | --- | --- |
| `carousel` | Sideways row of leads | `label`, `slides[]` of kicker, title, dek, href, image, imageAlt |
| `story-grid` | Story cards | `kicker`, `heading`, `stories[]` with image and imageAlt |
| `menu-shelf` | A heading and a list of links | `heading`, `items[]` of label, href, dek |
| `hero` | Opening headline and up to two buttons | `kicker`, `title`, `dek`, `primaryLabel`, `primaryHref`, `secondaryLabel`, `secondaryHref`, `image`, `imageAlt` |
| `feature-grid` | Benefits or features, 1 to 12 | `kicker`, `heading`, `intro`, `items[]` of label, title, text |
| `team` | People, 1 to 12 | `kicker`, `heading`, `intro`, `members[]` of name, role, bio, image, imageAlt |
| `pricing` | Plans, 1 to 4 | `kicker`, `heading`, `intro`, `tiers[]` of name, price, period, summary, features, ctaLabel, ctaHref, featured |
| `testimonials` | Quotes, 1 to 6 | `kicker`, `heading`, `intro`, `items[]` of quote, name, role |
| `contact` | Ways to reach a person, 1 to 6 | `kicker`, `heading`, `intro`, `address`, `channels[]` of label, value, href |
| `social-proof` | Numbers and names | `kicker`, `heading`, `intro`, `stats[]` of value, label, `brands[]` |
| `cta` | One call to action | `kicker`, `heading`, `text`, `buttonLabel`, `buttonHref`, `note`, `asks[]` |
| `cover-story` | The lead story on a magazine front | `kicker`, `title`, `dek`, `byline`, `href`, `linkLabel`, `image`, `imageAlt` |
| `category-grid` | Browse by topic, 1 to 12 | `kicker`, `heading`, `categories[]` of label, dek, href, count |
| `fast-facts` | Square number tiles, 1 to 8 | `kicker`, `heading`, `facts[]` of value, label |

The new sections (from `hero` down) belong to modes. See [choose-a-mode.md](choose-a-mode.md). Their buttons and links accept a site path, an `https://` address, or a bare `mailto:` address. A page that starts with a `hero` or `cover-story` prints that section's title as its `h1`.

## Article sections

| type | Role | Fields |
| --- | --- | --- |
| `heading` | Section title | `level` 2 or 3, `text` |
| `paragraph` | Body. A blank line starts a new paragraph | `text` |
| `key-findings` | A short list of findings | `title`, `items[]` |
| `chart` | CSV path or chart link, plus alt text | `dataPath`, `alt`, `title`, `caption` |
| `callout` | Desk note | `title`, `text` |
| `sources` | Citations | `title`, `items[]` of label and href |
| `image` | Plate and caption | `src`, `alt`, `caption`, `role` `banner` or `figure` |
| `embed` | Video or audio link | `kind`, `src`, `title`, `caption` |
| `download` | A file the reader can take | `href`, `label`, `description` |
| `fast-facts` | Square number tiles, 1 to 6 | `title`, `facts[]` of value, label |
| `pull-quote` | A quote set apart | `quote`, `attribution` |
| `bar-chart` | Inline bars, 2 to 12, no data file | `title`, `alt`, `unit`, `caption`, `bars[]` of label and value (a plain decimal string) |

A page cannot contain article body blocks. An article cannot contain a page section. The schema rejects the mismatch. The Field Desk sample was migrated from the older names (`pull-quote`, `figure`, `list`, `headline-facts`, `magazine-feature`, `category-tiles`) without dropping the sentences.

## Links and images

The renderer escapes text. A link in any section or block may be a site path such as `/articles/lumen-rail` or an absolute `https://` or `http://` address with a host, no credentials, no spaces or quotes, and no look-alike (punycode) host. An external address prints as written with `rel="noopener noreferrer"`; a site path prints as written. Anything else, including `javascript:`, `data:`, protocol-relative (`//host`) and backslash tricks, renders as `#`. (Before the change recorded in [CHANGELOG.md](CHANGELOG.md), the older sections and blocks printed `#` for every external address; only the newer sections printed it.) Images must be `/media/<name>.svg` files in `public/media`. The demo plates are original geometric drawings.

## Site settings

`content/site.json` holds the masthead, theme tokens, and `mode` (`corporate`, `magazine`, or `leadgen`; absent means magazine). The mode picks the section library the desk offers. It does not change how any document renders beyond the masthead.

## Files

```text
content/<id>/draft.json        working copy
content/<id>/published.json    optional; required to appear on the site
```

The folder name, `id`, and the `id` field inside the JSON must match. Slugs of published documents must be unique.
