# astro-kit

Reference Astro components for the MDX that the desk exports. Copy this folder
into an Astro project as `src/components/twilda/`, with `@astrojs/mdx` installed:

```sh
npx astro add mdx
cp -r packages/editor/astro-kit src/components/twilda
```

An exported article in `src/content/blog/<slug>.mdx` imports from
`../../components/twilda/index.ts`. The desk's Markdown export needs none of this.

The Twilda Astro site in this repo does not import this folder.
