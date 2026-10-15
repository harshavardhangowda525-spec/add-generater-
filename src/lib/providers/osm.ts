import { fetchWithRetry, ProviderError } from "../http";
import type { Provider, RawBusiness, SearchPageInput } from "./types";

const DEFAULT_OVERPASS = "https://overpass-api.de/api/interpreter";

export function osmUserAgent() {
  const contact = process.env.OSM_CONTACT_EMAIL;
  return `InfinityLeadFinder/1.0${contact ? ` (${contact})` : ""}`;
}

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const CATEGORY_KEYS = ["shop", "amenity", "leisure", "office", "tourism", "healthcare", "craft"];

export function buildOverpassQuery(input: SearchPageInput): string {
  const { south, west, north, east } = input.tile.bbox;
  const bbox = `${south},${west},${north},${east}`;
  // When phone is required we filter server-side to keep responses small.
  const phoneFilters = input.phoneRequired ? ['["phone"]', '["contact:phone"]', '["contact:mobile"]', '["phone:mobile"]'] : [""];
  const parts: string[] = [];
  for (const f of input.niche.osm) {
    for (const pf of phoneFilters) parts.push(`  nwr${f}["name"]${pf}(${bbox});`);
  }
  return `[out:json][timeout:120];\n(\n${parts.join("\n")}\n);\nout center tags;`;
}

export function mapOsmElement(el: OsmElement): RawBusiness | null {
  const t = el.tags ?? {};
  if (!t.name) return null;
  const lat = el.lat ?? el.center?.lat ?? null;
  const lon = el.lon ?? el.center?.lon ?? null;
  const catKey = CATEGORY_KEYS.find((k) => t[k]);
  const catValue = catKey ? t[catKey].replace(/_/g, " ") : null;
  const category = catValue ? catValue.charAt(0).toUpperCase() + catValue.slice(1) : null;
  const addr = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"] ?? t["addr:neighbourhood"], t["addr:city"], t["addr:postcode"]]
    .filter(Boolean)
    .join(", ");
  const closed = t["disused:shop"] || t["disused:amenity"] || t.opening_hours === "closed" || t["abandoned:shop"];
  return {
    provider: "osm",
    sourceId: `${el.type}/${el.id}`,
    name: t.name,
    category,
    phone: t.phone ?? t["contact:phone"] ?? t["contact:mobile"] ?? t["phone:mobile"] ?? null,
    website: t.website ?? t["contact:website"] ?? t.url ?? null,
    instagram: t["contact:instagram"] ?? t.instagram ?? null,
    facebook: t["contact:facebook"] ?? t.facebook ?? null,
    address: addr || null,
    locality: t["addr:suburb"] ?? t["addr:neighbourhood"] ?? t["addr:district"] ?? null,
    city: t["addr:city"] ?? null,
    lat,
    lon,
    profileUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    openingHours: t.opening_hours ?? null,
    rating: null,
    ratingCount: null,
    operational: !closed,
    raw: { type: el.type, id: el.id, tags: t },
  };
}

export const osmProvider: Provider = {
  name: "osm",
  label: "OpenStreetMap (Overpass)",
  attribution: "© OpenStreetMap contributors (ODbL)",
  isConfigured: () => process.env.OSM_ENABLED !== "false",
  async searchPage(input) {
    const url = process.env.OVERPASS_URL || DEFAULT_OVERPASS;
    const res = await fetchWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": osmUserAgent() },
        body: new URLSearchParams({ data: buildOverpassQuery(input) }).toString(),
      },
      // Overpass public instances ask for modest usage: ≥2s between queries.
      { provider: "OpenStreetMap", minIntervalMs: 2000, baseDelayMs: 5000, retries: 3, timeoutMs: 150000 },
    );
    const json = (await res.json()) as { elements?: OsmElement[]; remark?: string };
    if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) {
      throw new ProviderError(`OpenStreetMap: ${json.remark.slice(0, 160)}`, "upstream");
    }
    const items = (json.elements ?? []).map(mapOsmElement).filter((b): b is RawBusiness => !!b);
    // Overpass returns the whole tile in one response — no further pages.
    return { items, nextPage: null, requests: 1 };
  },
};
