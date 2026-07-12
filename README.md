# Ella Mae

## Template Integrations

- Tailwind CSS v4 Beta
- Astro SEO - Powered by [@lexingtonthemes/seo](https://www.npmjs.com/package/@lexingtonthemes/seo)
- Astro Sitemap - https://docs.astro.build/en/guides/integrations-guide/sitemap/

## Template Structure

The template follows a typical Astro project structure. You'll find the following key directories and files:

```
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

- `src/pages/`: Contains `.astro` and `.md` files. Each file becomes a route in your project based on its name.
- `src/components/`: Ideal for placing your Astro/React/Vue/Svelte/Preact components.
- `public/`: For static assets such as images that you want to serve directly.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:4321`      |
| `npm run netlify:dev`  | Dev with Netlify env / functions                 |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |

**Deploy / secrets:** see [`docs/SETUP.md`](docs/SETUP.md) (Twilda on Netlify, Supabase, Cursor).

**Product:** Twilda · **Company:** Artometrics · **Domain:** [twilda.com](https://twilda.com)

Learn more - Explore more through Astro's official [documentation](https://docs.astro.build).

---
Updated on 27th Dec 2025
- New color palette
---
Updated on 19th Aug 2025

### Optional CMS with pagesCMS

This theme includes a ready-to-use [PagesCMS](https://pagescms.org) config file (`.pages.yml`).

- Optional — delete the file if you don’t want CMS. But you could keep in case you want to in the future, it won't affect the theme.
- Zero dependencies — it does not add anything to your code, build or installs.
- Instant setup — if you want simple content editing, the config is already there.

### Getting Started

1. Push your project to GitHub, GitLab, or Bitbucket.
2. Go to [PagesCMS](https://pagescms.org/) and connect your repository.
3. Your content (Markdown, images, etc.) will be editable through the CMS.

Learn more:

- [PagesCMS homepage](https://pagescms.org/)
- [Configuration docs](https://pagescms.org/docs/configuration/)


---
Updated on 03th June 2025


- Reusable components
- Text Component
- Icons Component

- **HTML Tags:** Easily change the HTML element (like `p`, `h1`, `span`, `a`) using the `tag` prop, with `p` being the default.
- **Variants:** Pick from preset text styles (such as `displayXL` or `textBase`) for a consistent look.
- **Custom Classes:** Add or adjust styles with the `class` prop.
- **Accessibility:** Customize with additional props like `id`, `href`, `title`, and `style`.
- **Content Slot:** Add any content inside the component, including optional left and right icons.
  Example usage:

```astro
<Text tag="h1" variant="displayXL" class="text-center">
  Welcome to the new version!
</Text>
```

- Button Component  
  A customizable button component with options to fit your design needs:

- **Variants:** Choose from predefined styles like `primary` (dark background) and `secondary` (lighter background), with support for dark mode.
- **Sizes:** Select `small` or `medium` for different button heights and padding.
- **Gaps:** Control the spacing between content with the `gapSize` prop (either `small` or `medium`).
- **Custom Classes:** Apply additional styles using the `class` prop.
- **Slots:** Include icons or extra content with optional `left-icon` and `right-icon` slots.  
  Example usage:

```astro
<!-- Default button -->
<Button size="small" variant="primary">Primary small</Button>
<!-- Button with icon -->
<Button iconOnly size="small" variant="primary">·</Button>
<!-- Button as link -->
<Button isLink={true} href="#_" size="small" variant="primary">Primary small</Button>
```

- Wrapper Component  
  A flexible layout component that helps with consistent spacing and alignment.

- **Variants:** The default `standard` variant includes responsive widths, centered content, and padding.
- **Custom Classes:** Add or change styles with the `class` prop.
- **Content Slot:** Easily add any child components or content inside.

```astro
<Wrapper variant="standard">
Your content goes here
</Wrapper>
```

### [Support](https://lexingtonthemes.com/legal/support/)

### [Documentation](https://lexingtonthemes.com/documentation/quick-start/)

### [Get your bundle](https://lexingtonthemes.com)
