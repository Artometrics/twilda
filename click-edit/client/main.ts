import "./edit.css";
import { documentSchema } from "../../packages/core/src/schema";
import { contentDigest } from "../../packages/core/src/serialize";
import { readConfig } from "./config";
import { loadLocalDraft } from "./draft-store";
import { mountEditor } from "./editor";

function readJson(id: string): unknown {
  const el = document.getElementById(id);
  if (!el?.textContent) throw new Error(`Missing #${id}.`);
  return JSON.parse(el.textContent);
}

const root = document.getElementById("twilda-root");
if (!root) throw new Error("Missing #twilda-root.");

const base = documentSchema.parse(readJson("twilda-doc"));
const media = (readJson("twilda-media") as string[]).filter((src) => /^\/media\/[a-z0-9-]+\.svg$/.test(src));
const local = loadLocalDraft(window.localStorage, base.id);
const initial = local && contentDigest(local) !== contentDigest(base) ? local : base;

mountEditor({ root, base, initial, media, storage: window.localStorage, config: readConfig() });
