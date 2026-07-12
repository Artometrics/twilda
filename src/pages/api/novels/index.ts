import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { dbErrorMessage } from "@/lib/auth/guards";
import { ensureUserProfile } from "@/lib/auth/profile";
import { assertCanCreateNovel } from "@/lib/billing/limits";
import { createNovel, ensureStarterNovels } from "@/lib/novels/service";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    await ensureUserProfile(supabase, user);
    await ensureStarterNovels(supabase, user.id);
    await assertCanCreateNovel(supabase, user.id);
    const body = await request.json().catch(() => ({}));
    const id = await createNovel(supabase, user.id, body);
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = dbErrorMessage(err);
    const status = message.includes("Free plan allows") ? 402 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status },
    );
  }
};
