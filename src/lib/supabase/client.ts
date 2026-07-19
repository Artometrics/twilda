import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "./database.types";

const ExpoSecureStore =
  Platform.OS === "web"
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("expo-secure-store") as typeof import("expo-secure-store"));

/**
 * Storage adapter: SecureStore on native, AsyncStorage on web.
 * Large session payloads fall back to AsyncStorage when SecureStore size limits apply.
 */
const ExpoStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    try {
      return (await ExpoSecureStore!.getItemAsync(key)) ?? (await AsyncStorage.getItem(key));
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await ExpoSecureStore!.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await ExpoSecureStore!.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
    await AsyncStorage.removeItem(key);
  },
};

function requireEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill in your Supabase project keys.`,
    );
  }
  return value;
}

let client: SupabaseClient<Database> | null = null;

/** App-wide Supabase client (anon key + RLS). Safe for mobile and web. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  client = createClient<Database>(requireEnv("EXPO_PUBLIC_SUPABASE_URL"), requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: {
      storage: ExpoStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  });

  return client;
}

/** @deprecated Use getSupabase() */
export function createBrowserClient(): SupabaseClient<Database> {
  return getSupabase();
}
