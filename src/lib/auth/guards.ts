import type { User } from "@supabase/supabase-js";

/** Throw if there is no authenticated user. */
export function requireUser(user: User | null | undefined): User {
  if (!user) throw new Error("Unauthorized");
  return user;
}

export function isDbSetupError(message: string): boolean {
  return /does not exist|schema cache|relation|permission denied/i.test(message);
}
