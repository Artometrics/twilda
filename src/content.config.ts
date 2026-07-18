import { defineCollection } from "astro:content";
import { glob } from "astro:loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/content/posts" }),
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
});

export const collections = {
  posts,
  legal,
};
