/**
 * Wikidata SPARQL surname lookup.
 * Fetches origin country/region for a given family name using Wikidata.
 * Rate-limited: cache results in-session. CC-0 licensed data.
 */

export interface SurnameInfo {
  name: string;
  /** Wikidata item ID (e.g. Q12345) */
  wikidataId?: string;
  /** Language/country of origin (e.g. "Irish", "Scottish Gaelic") */
  origin?: string;
  /** Country of origin label */
  country?: string;
  coords?: { lat: number; lng: number };
  description?: string;
  error?: string;
}

const ENDPOINT = "https://query.wikidata.org/sparql";
const CACHE = new Map<string, SurnameInfo>();

export async function lookupSurname(surname: string): Promise<SurnameInfo> {
  const key = surname.toLowerCase().trim();
  if (CACHE.has(key)) return CACHE.get(key)!;

  const sparql = `
SELECT ?item ?itemLabel ?countryLabel ?countryCoordLat ?countryCoordLng ?description WHERE {
  ?item wdt:P31 wd:Q101352 .        # instance of: family name
  ?item rdfs:label "${surname}"@en .
  OPTIONAL { ?item wdt:P17 ?country .
    OPTIONAL { ?country wdt:P625 ?coord . }
  }
  OPTIONAL { ?item schema:description ?description FILTER(LANG(?description) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1
`.trim();

  try {
    const url = `${ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "Twilda/1.0 (twilda.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`SPARQL HTTP ${res.status}`);
    const json = await res.json();
    const bindings = json?.results?.bindings ?? [];
    if (bindings.length === 0) {
      const info: SurnameInfo = { name: surname, error: "Not found in Wikidata." };
      CACHE.set(key, info);
      return info;
    }
    const b = bindings[0];
    const info: SurnameInfo = {
      name: surname,
      wikidataId: b.item?.value?.split("/").pop(),
      origin: b.itemLabel?.value,
      country: b.countryLabel?.value,
      description: b.description?.value,
    };
    if (b.countryCoordLat?.value && b.countryCoordLng?.value) {
      info.coords = { lat: parseFloat(b.countryCoordLat.value), lng: parseFloat(b.countryCoordLng.value) };
    }
    CACHE.set(key, info);
    return info;
  } catch (err) {
    const info: SurnameInfo = { name: surname, error: String(err) };
    CACHE.set(key, info);
    return info;
  }
}
