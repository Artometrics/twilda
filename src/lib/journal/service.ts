import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
export type JournalEntry = Database["public"]["Tables"]["journal_entries"]["Row"];

export async function listJournalEntries(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getJournalEntry(supabase: Client, userId: string, id: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJournalEntry(
  supabase: Client,
  userId: string,
  input?: { title?: string; body?: string },
) {
  const title = input?.title?.trim() || "Untitled";
  const body = input?.body ?? "";
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, title, body })
    .select("id, title, body, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(
  supabase: Client,
  userId: string,
  id: string,
  input: { title?: string; body?: string },
) {
  const patch: Database["public"]["Tables"]["journal_entries"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title.trim() || "Untitled";
  if (input.body !== undefined) patch.body = input.body;

  const { data, error } = await supabase
    .from("journal_entries")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, title, body, created_at, updated_at")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Entry not found");
  return data;
}

export async function deleteJournalEntry(supabase: Client, userId: string, id: string) {
  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export function formatJournalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function isJournalSetupError(message: string): boolean {
  return /journal_entries|does not exist|schema cache|relation/i.test(message);
}
