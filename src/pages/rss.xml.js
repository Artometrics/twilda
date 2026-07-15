import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const research = await getCollection("research");
  const site = context.site ?? "http://localhost:4321";
  return rss({
    title: "Twilda | Investigations",
    description: "Pre-registered research and writing from Twilda",
    site,
    items: research.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.pubDate,
      description: entry.data.description,
      link: `/research/${entry.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
