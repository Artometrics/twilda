import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { Database } from "./database.types";

const isBrowser = typeof window !== "undefined";

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

function createAppStorage(): StorageAdapter {
  if (!isBrowser) return createMemoryStorage();

  // Lazy-require so Node SSR / static export never touches native modules.
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default as typeof import("@react-native-async-storage/async-storage").default;

  if (Platform.OS === "web") {
    return {
      getItem: (key) => AsyncStorage.getItem(key),
      setItem: (key, value) => AsyncStorage.setItem(key, value),
      removeItem: (key) => AsyncStorage.removeItem(key),
    };
  }

  const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
  return {
    async getItem(key) {
      try {
        return (await SecureStore.getItemAsync(key)) ?? (await AsyncStorage.getItem(key));
      } catch {
        return AsyncStorage.getItem(key);
      }
    },
    async setItem(key, value) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {
        await AsyncStorage.setItem(key, value);
      }
    },
    async removeItem(key) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* ignore */
      }
      await AsyncStorage.removeItem(key);
    },
  };
}

function requireSupabaseEnv(): { url: string; anonKey: string } {
  // Metro only inlines *static* EXPO_PUBLIC_* reads — do not use process.env[name].
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL. Copy .env.example to .env and fill in your Supabase project keys.",
    );
  }
  if (!anonKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project keys.",
    );
  }
  return { url, anonKey };
}

let client: SupabaseClient<Database> | null = null;

/** App-wide Supabase client (anon key + RLS). Safe for mobile and web. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const { url, anonKey } = requireSupabaseEnv();
  client = createClient<Database>(url, anonKey, {
    auth: {
      storage: createAppStorage(),
      autoRefreshToken: isBrowser,
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser && Platform.OS === "web",
    },
  });

  return client;
}

/** @deprecated Use getSupabase() */
export function createBrowserClient(): SupabaseClient<Database> {
  return getSupabase();
}
