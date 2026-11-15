import "@twilda/core/edit.css";
import "./click-edit.css";
import { contentDigest, defaultSite, documentSchema, parseSite } from "@twilda/core";
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
const media = (readJson("twilda-media") as string[]).filter((src) => /^\/media\/[a-z0-9-]+\.(svg|jpg|png|webp|gif)$/.test(src));
const local = loadLocalDraft(window.localStorage, base.id);
const initial = local && contentDigest(local) !== contentDigest(base) ? local : base;

const siteEl = document.getElementById("twilda-site")?.textContent;
const site = siteEl ? parseSite(siteEl) : defaultSite();

mountEditor({ root, base, initial, media, site, storage: window.localStorage, config: readConfig() });
