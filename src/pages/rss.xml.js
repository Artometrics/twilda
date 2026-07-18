import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("posts");
  const site = context.site ?? "http://localhost:4321";
  return rss({
    title: "Twilda | Journal",
    description: "Journal entries from Twilda",
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/posts/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
