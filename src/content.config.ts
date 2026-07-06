import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const customers = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/customers" }),
});

const helpcenter = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/helpcenter" }),
});

const integrations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/integrations" }),
});

const changelog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/changelog" }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/content/posts" }),
});

const team = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/team" }),
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
});

export const collections = {
  team,
  customers,
  changelog,
  legal,
  helpcenter,
  posts,
  integrations,
};
