import { MemoryBackend } from "./memory";

/** Where a desk keeps its files between visits. One entry per file, so a save writes one key. */
export interface KeyValueStore {
  readonly kind: "indexeddb" | "localstorage" | "memory";
  load(): Promise<Map<string, string>>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryStore implements KeyValueStore {
  readonly kind = "memory" as const;
  readonly data = new Map<string, string>();
  async load() {
    return new Map(this.data);
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}

const LS_PREFIX = "twilda:file:";

export class LocalStorageStore implements KeyValueStore {
  readonly kind = "localstorage" as const;
  constructor(private readonly storage: Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">) {}
  async load() {
    const out = new Map<string, string>();
    for (let i = 0; i < this.storage.length; i += 1) {
      const key = this.storage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const value = this.storage.getItem(key);
        if (value !== null) out.set(key.slice(LS_PREFIX.length), value);
      }
    }
    return out;
  }
  async set(key: string, value: string) {
    this.storage.setItem(LS_PREFIX + key, value);
  }
  async remove(key: string) {
    this.storage.removeItem(LS_PREFIX + key);
  }
}

const DB_NAME = "twilda-desk";
const DB_STORE = "files";

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed."));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed."));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write was aborted. The device may be out of space."));
  });
}

export class IndexedDbStore implements KeyValueStore {
  readonly kind = "indexeddb" as const;
  private constructor(private readonly db: IDBDatabase) {}

  static async open(factory: IDBFactory = indexedDB, name = DB_NAME): Promise<IndexedDbStore> {
    const open = factory.open(name, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(DB_STORE)) open.result.createObjectStore(DB_STORE);
    };
    const db = await request(open);
    return new IndexedDbStore(db);
  }

  async load() {
    const tx = this.db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const keys = await request(store.getAllKeys());
    const values = await request(store.getAll());
    const out = new Map<string, string>();
    keys.forEach((key, index) => {
      const value = values[index];
      if (typeof key === "string" && typeof value === "string") out.set(key, value);
    });
    return out;
  }

  async set(key: string, value: string) {
    const tx = this.db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(value, key);
    await done(tx);
  }

  async remove(key: string) {
    const tx = this.db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    await done(tx);
  }
}

/** IndexedDB first, localStorage if that fails, memory if the browser blocks both. */
export async function openBestStore(): Promise<KeyValueStore> {
  try {
    if (typeof indexedDB !== "undefined") {
      const store = await IndexedDbStore.open();
      await store.load();
      return store;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof localStorage !== "undefined") {
      const probe = "twilda:probe";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return new LocalStorageStore(localStorage);
    }
  } catch {
    /* fall through */
  }
  return new MemoryStore();
}

/** A MemoryBackend whose writes also land in a KeyValueStore. A failed store write is a failed save. */
export class PersistentBackend extends MemoryBackend {
  private constructor(
    readonly store: KeyValueStore,
    now?: () => string,
  ) {
    super(now);
  }

  static async open(store: KeyValueStore, now?: () => string): Promise<PersistentBackend> {
    const backend = new PersistentBackend(store, now);
    const stored = await store.load();
    for (const [path, contents] of stored) {
      backend.files.set(path, { contents, updatedAt: backend.stamp() });
    }
    return backend;
  }

  private stamp(): string {
    return new Date().toISOString();
  }

  override async write(path: string, contents: string): Promise<void> {
    const previous = this.files.get(path);
    await super.write(path, contents);
    try {
      await this.store.set(path, contents);
    } catch (error) {
      if (previous) this.files.set(path, previous);
      else this.files.delete(path);
      const reason = error instanceof Error && error.message ? ` ${error.message}` : "";
      throw new Error(`This device would not keep the file.${reason}`);
    }
  }

  override async delete(path: string): Promise<void> {
    await super.delete(path);
    await this.store.remove(path);
  }
}
