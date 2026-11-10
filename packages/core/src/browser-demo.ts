import { createEditorApi } from "./editor-session";
import { TwildaError } from "./errors";
import { DemoBackend, seedDemoState, type DemoState } from "./demo-backend";
import { createSampleState } from "./sample";
import type { TwildaEditorApi } from "./editor-api";

const DB_NAME = "twilda-demo";
const DB_STORE = "state";
const DB_KEY = "v1";
const LS_KEY = "twilda-demo-v1";

function memoryBackend(state: DemoState, persist?: (state: DemoState) => Promise<void> | void): DemoBackend {
  return new DemoBackend(state, state.baseBranch, persist);
}

async function idbGet(): Promise<DemoState | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DB_STORE, "readonly");
      const get = tx.objectStore(DB_STORE).get(DB_KEY);
      get.onsuccess = () => resolve(get.result as DemoState | undefined);
      get.onerror = () => reject(get.error ?? new Error("IndexedDB read failed"));
    };
  });
}

async function idbSet(state: DemoState): Promise<void> {
  if (typeof indexedDB === "undefined") throw new TwildaError("IndexedDB is not available.", "no-browser-store");
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(state, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
    };
  });
}

function lsGet(): DemoState | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return undefined;
  return JSON.parse(raw) as DemoState;
}

function lsSet(state: DemoState): void {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export async function clearBrowserDemo(): Promise<void> {
  if (typeof localStorage !== "undefined") localStorage.removeItem(LS_KEY);
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
    request.onblocked = () => resolve();
  });
}

/**
 * Phone demo store. IndexedDB holds the branch snapshot. localStorage is the fallback.
 * Reset replaces both with the built-in sample. This is not GitHub and not the production site.
 */
export async function openBrowserDemo(): Promise<{ backend: DemoBackend; api: TwildaEditorApi }> {
  let state: DemoState | undefined;
  try {
    state = await idbGet();
  } catch {
    state = undefined;
  }
  if (!state) {
    try {
      state = lsGet();
    } catch {
      state = undefined;
    }
  }
  if (!state || !state.branches?.main) state = createSampleState();

  const persist = async (next: DemoState) => {
    try {
      await idbSet(next);
    } catch (error) {
      try {
        lsSet(next);
      } catch {
        const message = error instanceof Error ? error.message : "Could not save the demo.";
        throw new TwildaError(`${message} The browser store is full or blocked.`, "persist-failed");
      }
    }
  };

  const backend = memoryBackend(state, persist);
  const api = createEditorApi(backend, {
    reset: async () => {
      const fresh = createSampleState();
      backend.replaceState(fresh);
      await persist(fresh);
    },
  });
  await persist(backend.snapshot());
  return { backend, api };
}

export function openMemoryDemo(state: DemoState = createSampleState()): { backend: DemoBackend; api: TwildaEditorApi } {
  const backend = memoryBackend(structuredClone(state));
  const api = createEditorApi(backend, {
    reset: async () => {
      backend.replaceState(createSampleState());
    },
  });
  return { backend, api };
}

export { seedDemoState };
