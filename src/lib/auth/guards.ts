import type { AstroCookies } from "astro";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AuthContext = {
  locals: App.Locals;
  url: URL;
  redirect: (path: string) => Response;
};

export function requireAuth(
  context: AuthContext,
): { user: User; supabase: SupabaseClient<Database> } | Response {
  const { user, supabase } = context.locals;
  if (!user || !supabase) {
    const redirect = encodeURIComponent(context.url.pathname + context.url.search);
    return context.redirect(`/forms/login/?redirect=${redirect}`);
  }
  return { user, supabase };
}

export function isDbSetupError(message: string): boolean {
  return /relation|does not exist|schema cache|PGRST/i.test(message);
}

function messageFromUnknown(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return null;
}

export function dbErrorMessage(error: unknown): string {
  return messageFromUnknown(error) ?? "Database unavailable";
}
