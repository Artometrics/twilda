import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/600.css";
import { seedOnFirstVisit } from "./backend/artometrics";
import { MemoryBackend } from "./backend/memory";
import { PersistentBackend, openBestStore, type KeyValueStore } from "./backend/persistent";
import { seedFieldDesk } from "./backend/seed";
import { buildFaultPath } from "./backend/paths";
import { App } from "./ui/App";
import "./styles.css";

async function start(): Promise<void> {
  // `?sample=field-desk` is the old fictional demo on a throwaway in-memory store.
  const fieldDesk = new URLSearchParams(window.location.search).get("sample") === "field-desk";
  let backend: MemoryBackend;
  let storageKind: KeyValueStore["kind"] = "memory";
  if (fieldDesk) {
    backend = new MemoryBackend();
    await seedFieldDesk(backend);
  } else {
    const store = await openBestStore();
    storageKind = store.kind;
    backend = await PersistentBackend.open(store);
    await seedOnFirstVisit(backend);
    void navigator.storage?.persist?.().catch(() => undefined);
  }

  if (import.meta.env.DEV) {
    window.__TWILDA__ = {
      plantBuildFault(id, message) {
        return backend.write(buildFaultPath(id), message);
      },
      failNextSave(message) {
        backend.failNextWrite((path) => path.endsWith("/draft.json"), message);
      },
      failNextPublish(message) {
        backend.failNextWrite((path) => path.endsWith("/published.json"), message);
      },
    };
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root");

  createRoot(root).render(
    <StrictMode>
      <App backend={backend} storageKind={storageKind} />
    </StrictMode>,
  );

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* The desk still works if the shell cache does not install. */
      });
    });
  }
}

void start();
