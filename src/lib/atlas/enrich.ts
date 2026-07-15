/** Shared fetch helpers for Atlas enrich APIs (Wikidata, Wikipedia, Met). */

import { createServerClient } from "@/lib/supabase/server";

export const TWILDA_UA = "TwildaResearchBot/1.0";

export type EnrichEntity = {
  id: string;
  name: string;
  description: string;
  startYear: number | null;
  endYear: number | null;
  coords: { lat: number; lng: number } | null;
  wikidataId: string;
  portraitUrl?: string;
  sourceUrl: string;
};

export type MetObjectSummary = {
  metObjectId: number;
  title: string;
  artist: string | null;
  date: string | null;
  primaryImageSmall: string | null;
  objectURL: string | null;
  license: "CC0";
};

const WD_API = "https://www.wikidata.org/w/api.php";
const WD_SPARQL = "https://query.wikidata.org/sparql";
const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";
const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";

const ENRICH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Read enrich cache — fail soft if table/env missing. Uses service role. */
export async function getEnrichCache<T = unknown>(cacheKey: string): Promise<T | null> {
  try {
    // Table may be absent until migration 005; Database types omit it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createServerClient({ useServiceRole: true }) as any;
    const { data, error } = await admin
      .from("atlas_enrich_cache")
      .select("payload, fetched_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error?.code === "42P01" || error || !data) return null;
    const fetched = Date.parse(data.fetched_at as string);
    if (!Number.isFinite(fetched) || Date.now() - fetched > ENRICH_CACHE_TTL_MS) return null;
    return data.payload as T;
  } catch {
    return null;
  }
}

/** Upsert enrich cache — fail soft if table/env missing. Requires service role. */
export async function setEnrichCache(cacheKey: string, payload: unknown): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createServerClient({ useServiceRole: true }) as any;
    await admin.from("atlas_enrich_cache").upsert({
      cache_key: cacheKey,
      payload,
      fetched_at: new Date().toISOString(),
    });
  } catch {
    // skip cache
  }
}

export async function twildaFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", TWILDA_UA);
  return fetch(url, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(12_000),
  });
}

function yearFromWikidataTime(value?: string): number | null {
  if (!value) return null;
  // "+1830-08-18T00:00:00Z" or "-0440-00-00T00:00:00Z"
  const m = value.match(/^([+-]?\d{1,6})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

function commonsFileUrl(filename: string): string {
  const name = filename.replace(/^File:/i, "").replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=400`;
}

/** Search Wikidata entities by label. */
export async function wikidataSearch(q: string, limit = 8): Promise<{ id: string; label: string; description: string }[]> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: q,
    language: "en",
    uselang: "en",
    type: "item",
    limit: String(limit),
    format: "json",
    origin: "*",
  });
  const res = await twildaFetch(`${WD_API}?${params}`);
  if (!res.ok) throw new Error(`Wikidata search HTTP ${res.status}`);
  const json = await res.json();
  return (json.search ?? []).map((s: { id: string; label?: string; description?: string }) => ({
    id: s.id,
    label: s.label ?? s.id,
    description: s.description ?? "",
  }));
}

type WdEntity = {
  id: string;
  labels?: { en?: { value: string } };
  descriptions?: { en?: { value: string } };
  claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
};

function claimValue(entity: WdEntity, prop: string): unknown {
  return entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
}

/** Fetch one Wikidata item and map to EnrichEntity (wbgetentities + optional SPARQL for coords). */
export async function wikidataGetEntity(qid: string): Promise<EnrichEntity | null> {
  const id = qid.toUpperCase().startsWith("Q") ? qid.toUpperCase() : `Q${qid}`;
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: id,
    languages: "en",
    props: "labels|descriptions|claims",
    format: "json",
    origin: "*",
  });
  const res = await twildaFetch(`${WD_API}?${params}`);
  if (!res.ok) throw new Error(`Wikidata getentities HTTP ${res.status}`);
  const json = await res.json();
  const entity = json.entities?.[id] as WdEntity | undefined;
  if (!entity || entity.id === undefined) return null;

  const name = entity.labels?.en?.value ?? id;
  const description = entity.descriptions?.en?.value ?? "";

  const birth = claimValue(entity, "P569") as string | undefined;
  const death = claimValue(entity, "P570") as string | undefined;
  const inception = claimValue(entity, "P571") as string | undefined;
  const dissolved = claimValue(entity, "P576") as string | undefined;
  const startYear = yearFromWikidataTime(birth ?? inception);
  const endYear = yearFromWikidataTime(death ?? dissolved);

  const imageClaim = claimValue(entity, "P18") as string | undefined;
  const portraitUrl = imageClaim ? commonsFileUrl(imageClaim) : undefined;

  let coords: { lat: number; lng: number } | null = null;
  const coordClaim = claimValue(entity, "P625") as { latitude?: number; longitude?: number } | undefined;
  if (coordClaim?.latitude != null && coordClaim?.longitude != null) {
    coords = { lat: coordClaim.latitude, lng: coordClaim.longitude };
  } else {
    const pob = claimValue(entity, "P19") as { id?: string } | undefined;
    if (pob?.id) {
      coords = await sparqlCoords(pob.id);
    }
  }

  return {
    id,
    name,
    description,
    startYear,
    endYear,
    coords,
    wikidataId: id,
    portraitUrl,
    sourceUrl: `https://www.wikidata.org/wiki/${id}`,
  };
}

async function sparqlCoords(qid: string): Promise<{ lat: number; lng: number } | null> {
  const sparql = `
SELECT ?lat ?lng WHERE {
  wd:${qid} wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lng)
}
LIMIT 1`.trim();
  try {
    const url = `${WD_SPARQL}?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await twildaFetch(url, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": TWILDA_UA },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const b = json?.results?.bindings?.[0];
    if (!b?.lat?.value || !b?.lng?.value) return null;
    return { lat: parseFloat(b.lat.value), lng: parseFloat(b.lng.value) };
  } catch {
    return null;
  }
}

/** Resolve enrich: by QID or search-then-get first hit. Cached ~24h when migration 005 is applied. */
export async function enrichFromWikidata(opts: {
  qid?: string | null;
  q?: string | null;
}): Promise<EnrichEntity | EnrichEntity[] | null> {
  const qid = opts.qid?.trim();
  const q = opts.q?.trim();

  if (qid) {
    const id = qid.toUpperCase().startsWith("Q") ? qid.toUpperCase() : `Q${qid}`;
    const key = `wd:entity:${id}`;
    const cached = await getEnrichCache<EnrichEntity>(key);
    if (cached) return cached;
    const ent = await wikidataGetEntity(id);
    if (ent) await setEnrichCache(key, ent);
    return ent;
  }
  if (!q) return null;

  const searchKey = `wd:search:${q.toLowerCase()}`;
  const cachedSearch = await getEnrichCache<EnrichEntity | EnrichEntity[]>(searchKey);
  if (cachedSearch) return cachedSearch;

  const hits = await wikidataSearch(q, 5);
  if (hits.length === 0) {
    await setEnrichCache(searchKey, []);
    return [];
  }
  const entities: EnrichEntity[] = [];
  for (const hit of hits.slice(0, 3)) {
    const entityKey = `wd:entity:${hit.id}`;
    let ent: EnrichEntity | null = await getEnrichCache<EnrichEntity>(entityKey);
    if (!ent) {
      ent = await wikidataGetEntity(hit.id);
      if (ent) await setEnrichCache(entityKey, ent);
    }
    if (ent) entities.push(ent);
  }
  const result = entities.length === 1 ? entities[0] : entities;
  await setEnrichCache(searchKey, result);
  return result;
}

export async function wikipediaSummary(title: string): Promise<{
  title: string;
  extract: string;
  contentUrls: unknown;
  license: "CC BY-SA 4.0";
  attribution: "Wikipedia";
} | null> {
  const normalized = title.trim().replace(/ /g, "_");
  const key = `wiki:summary:${normalized.toLowerCase()}`;
  const cached = await getEnrichCache<{
    title: string;
    extract: string;
    contentUrls: unknown;
    license: "CC BY-SA 4.0";
    attribution: "Wikipedia";
  }>(key);
  if (cached) return cached;

  const encoded = encodeURIComponent(normalized);
  const res = await twildaFetch(`${WIKI_SUMMARY}/${encoded}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wikipedia summary HTTP ${res.status}`);
  const json = await res.json();
  const payload = {
    title: json.title ?? title,
    extract: json.extract ?? "",
    contentUrls: json.content_urls ?? null,
    license: "CC BY-SA 4.0" as const,
    attribution: "Wikipedia" as const,
  };
  await setEnrichCache(key, payload);
  return payload;
}

export async function metSearch(q: string, limit = 12): Promise<MetObjectSummary[]> {
  const params = new URLSearchParams({ q, isPublicDomain: "true" });
  const res = await twildaFetch(`${MET_API}/search?${params}`);
  if (!res.ok) throw new Error(`Met search HTTP ${res.status}`);
  const json = await res.json();
  const ids: number[] = (json.objectIDs ?? []).slice(0, limit);
  const objects: MetObjectSummary[] = [];
  await Promise.all(
    ids.map(async (id) => {
      const obj = await metObject(id);
      if (obj) objects.push(obj);
    }),
  );
  return objects;
}

export async function metObject(id: number | string): Promise<MetObjectSummary | null> {
  const key = `met:object:${id}`;
  const cached = await getEnrichCache<MetObjectSummary>(key);
  if (cached) return cached;

  const res = await twildaFetch(`${MET_API}/objects/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Met object HTTP ${res.status}`);
  const json = await res.json();
  const payload: MetObjectSummary = {
    metObjectId: json.objectID ?? Number(id),
    title: json.title ?? "Untitled",
    artist: json.artistDisplayName || null,
    date: json.objectDate || null,
    primaryImageSmall: json.primaryImageSmall || json.primaryImage || null,
    objectURL: json.objectURL || null,
    license: "CC0",
  };
  await setEnrichCache(key, payload);
  return payload;
}
