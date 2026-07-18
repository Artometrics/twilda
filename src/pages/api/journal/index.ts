import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  createJournalEntry,
  isJournalSetupError,
  listJournalEntries,
} from "@/lib/journal/service";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const entries = await listJournalEntries(supabase, user.id);
    return new Response(JSON.stringify({ entries }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isJournalSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { title?: string; body?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const entry = await createJournalEntry(supabase, user.id, {
      title: typeof body.title === "string" ? body.title : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
    });
    return new Response(JSON.stringify({ entry }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: isJournalSetupError(message) ? 503 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
