import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";

const site = process.env.PUBLIC_SITE_URL || "http://localhost:4321";

const BLOCKED_SITEMAP = [
  "/account",
  "/novels",
  "/blog",
  "/forms",
  "/api",
  "/auth",
];

// https://astro.build/config
export default defineConfig({
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["zod"],
    },
  },
  markdown: {
    drafts: true,
    shikiConfig: {
      theme: "night-owl"
    }
  },
  shikiConfig: {
    wrap: true,
    skipInline: false,
    drafts: true
  },
  site,
  integrations: [
    sitemap({
      filter: (page) => {
        try {
          const path = new URL(page).pathname;
          return !BLOCKED_SITEMAP.some(
            (prefix) => path === prefix || path.startsWith(`${prefix}/`),
          );
        } catch {
          return true;
        }
      },
    }),
    mdx(),
  ],
});
