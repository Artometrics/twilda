# Choose a mode

A mode is how a Twilda site starts out. It is three things bundled under one name: a **section library** (what the desk offers when you add a section to a page or a block to an article), **theme tokens** (colors, fonts, sizes), and a **default masthead and footer**. You pick one when you create a site and you can change it later in the desk. The mode is one word in `content/site.json`:

```json
{ "mode": "corporate" }
```

A site with no `mode` is a magazine, as every Twilda site was before modes existed.

A mode narrows what the desk offers. It never limits what the renderer prints. A page that already contains a section from another mode keeps rendering, and the desk marks it as outside the library instead of hiding it. Switching mode never edits a page.

## Which one

| If your site is... | Choose | It leads with |
| --- | --- | --- |
| A company, studio, or product that needs a calm front door and a way to be contacted | **Corporate** | hero, features, team, pricing, testimonials, contact |
| A publication, newsroom, or blog that publishes articles and data stories | **Magazine** | cover story, article template, fast-fact squares, charts, category grid |
| One offer or campaign that exists to get one action from a visitor | **Lead generation** | hero, benefits, social proof, one call to action |

Still unsure: if the main thing a visitor does is **read**, choose Magazine. If it is **decide**, choose Corporate. If it is **act now**, choose Lead generation.

## What each mode includes

### Corporate

- Sections: `hero`, `feature-grid`, `team`, `pricing`, `testimonials`, `contact`, plus `story-grid` and `menu-shelf` for a news or links area.
- Article blocks (for updates and case notes): heading, paragraph, image, key findings, fast facts, pull quote, callout, bar chart, embed, download.
- Theme: white paper, slate ink, blue accent, Public Sans throughout, calmer headings, a plain top-bar masthead with no issue label.
- Masthead: a company name and links that jump to the page's own sections (`/#features`, `/#team`, `/#pricing`, `/#contact`).

### Magazine

- Sections: `cover-story`, `carousel`, `story-grid`, `fast-facts`, `category-grid`, `menu-shelf`.
- Article blocks: heading, paragraph, key findings, **fast facts** (square tiles), **pull quote**, chart (CSV), **bar chart** (inline, no data file), callout, image, embed, download, sources.
- An article already has the editorial header: kicker, headline, dek, byline.
- Theme: the original Field Desk look, unchanged. A site that was already a magazine does not change when it picks this mode.

### Lead generation

- Sections: `hero`, `feature-grid` (benefits), `social-proof` (numbers and names), `testimonials`, `cta`, `contact`.
- Article blocks (for a short case study): heading, paragraph, image, fast facts, pull quote, callout, download.
- Theme: warm paper, strong accent, humanist headings over system sans, larger body text, roomier spacing. The last masthead link is a button.
- The `cta` section is the one call to action. It is a heading, a sentence, one button, a short list of what the form would ask, and a note.

## Forms

Corporate and lead-generation sites can add a **Form** section (contact, lead, or newsletter). Twilda stores nothing: the form posts to one `https://` address you set in **Theme → Forms** (Formspree, Basin, a Zapier or Make webhook, your own receiver), and the site's policy opens that address and nothing else. With no address set, the form is inert and the policy stays shut. See [forms-and-crm.md](forms-and-crm.md).

The `cta` section still prints the questions as a plain list, and its button goes to the on-page form (`/#join`), to a booking or checkout page you host elsewhere (`https://...`), or to a plain `mailto:` address. A `mailto:` link may carry the address only, with no subject or body.

## Choosing and switching in the desk

1. Open a draft, then **Theme**. The first card is **Mode**.
2. Pick a mode and press **Switch**. The theme tokens change at once and the page redraws.
3. The masthead is replaced only if it is still one Twilda wrote (the demo masthead or a mode's default). If you edited the name, issue label, note, links, or footer, it is kept and the button says so.
4. **Add a section** and **Add a block** now list the new mode's parts. **New draft** lists the new mode's templates, such as *Company home*, *Landing page*, or *Cover front*.
5. Publish as usual. A mode change is a change to `content/site.json` only.

Switching never touches a document. If a Corporate page has a `pricing` section and you switch to Magazine, the page still shows pricing. You can keep it, or remove it.

## Starting a new site in a mode

Each mode has a starter you can run from the repository, or copy into a new project:

```bash
npm run starter:dev -- corporate                        # run it, http://127.0.0.1:4321
npm run create:twilda -- ../my-site --mode leadgen      # make your own
```

See [phase4.md](phase4.md#starters) for what a starter contains.

## Limits that apply in every mode

- Sections are prepared types. You add, remove, and reorder them. There is no freeform canvas, and a mode does not add one.
- Links are site paths, `https://` addresses, or a bare `mailto:`. There is no `tel:` link. Put the phone number in the text.
- Pricing has at most four plans, a testimonial list six quotes, a team twelve people. The schema states each limit, and the desk stops offering "Add" at the limit.
- Everything printed is escaped. A mode cannot add script or inline style to a page. The only script a site can carry is Twilda's own form script, served from the site itself, and only when a form address is set.
