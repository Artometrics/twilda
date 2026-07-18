import rss from "@astrojs/rss";
import { listJournalEntries } from "@/lib/journal/service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/ssr";

export const prerender = false;

export async function GET(context) {
  if (!isSupabaseConfigured()) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createSupabaseServerClient(context.cookies, context.request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirect = encodeURIComponent("/rss.xml");
    return context.redirect(`/forms/login/?redirect=${redirect}`);
  }

  let entries = [];
  try {
    entries = await listJournalEntries(supabase, user.id);
  } catch {
    entries = [];
  }

  const site = context.site ?? "http://localhost:4321";
  return rss({
    title: "Twilda | Journal",
    description: "Your private Twilda journal",
    site,
    items: entries.map((entry) => ({
      title: entry.title || "Untitled",
      pubDate: new Date(entry.updated_at),
      description: entry.body.replace(/\s+/g, " ").trim().slice(0, 200),
      link: `/blog/posts/${entry.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
