import type { APIRoute } from "astro";
import { dbErrorMessage } from "@/lib/auth/guards";
import {
  deleteJournalEntry,
  getJournalEntry,
  isJournalSetupError,
  updateJournalEntry,
} from "@/lib/journal/service";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const entry = await getJournalEntry(supabase, user.id, id);
    if (!entry) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ entry }), {
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

export const PATCH: APIRoute = async ({ cookies, request, params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let body: { title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  try {
    const entry = await updateJournalEntry(supabase, user.id, id, {
      title: typeof body.title === "string" ? body.title : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
    });
    return new Response(JSON.stringify({ entry }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = dbErrorMessage(error);
    const status =
      message === "Entry not found" ? 404 : isJournalSetupError(message) ? 503 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ cookies, request, params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }

  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    await deleteJournalEntry(supabase, user.id, id);
    return new Response(JSON.stringify({ ok: true }), {
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
