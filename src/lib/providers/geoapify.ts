import { fetchWithRetry } from "../http";
import type { Provider, RawBusiness } from "./types";

const PAGE_SIZE = 100;

type GFeature = {
  properties: {
    place_id: string;
    name?: string;
    categories?: string[];
    formatted?: string;
    address_line2?: string;
    suburb?: string;
    district?: string;
    city?: string;
    lat?: number;
    lon?: number;
    website?: string;
    opening_hours?: string;
    contact?: { phone?: string; mobile?: string };
    datasource?: { raw?: Record<string, string | number> };
  };
};

export function mapGeoapifyFeature(f: GFeature): RawBusiness | null {
  const p = f.properties;
  if (!p?.name) return null;
  const raw = (p.datasource?.raw ?? {}) as Record<string, string>;
  const osmType = raw.osm_type ? ({ n: "node", w: "way", r: "relation" } as Record<string, string>)[raw.osm_type] : null;
  return {
    provider: "geoapify",
    sourceId: p.place_id,
    name: p.name,
    category: p.categories?.find((c) => c.split(".").length > 1)?.replace(/[._]/g, " ") ?? null,
    phone: p.contact?.phone ?? p.contact?.mobile ?? raw.phone ?? raw["contact:phone"] ?? null,
    website: p.website ?? raw.website ?? raw["contact:website"] ?? null,
    instagram: raw["contact:instagram"] ?? raw.instagram ?? null,
    facebook: raw["contact:facebook"] ?? null,
    address: p.formatted ?? p.address_line2 ?? null,
    locality: p.suburb ?? p.district ?? null,
    city: p.city ?? null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    profileUrl: osmType && raw.osm_id ? `https://www.openstreetmap.org/${osmType}/${raw.osm_id}` : null,
    openingHours: p.opening_hours ?? null,
    rating: null,
    ratingCount: null,
    operational: true,
    raw: { place_id: p.place_id, osm_id: raw.osm_id ?? null },
  };
}

export const geoapifyProvider: Provider = {
  name: "geoapify",
  label: "Geoapify Places",
  attribution: "Powered by Geoapify · © OpenStreetMap contributors (ODbL)",
  isConfigured: () => !!process.env.GEOAPIFY_API_KEY,
  async searchPage({ niche, tile, page }) {
    const offset = Number(page ?? 0);
    const { south, west, north, east } = tile.bbox;
    const qs = new URLSearchParams({
      categories: niche.geoapify.join(","),
      filter: `rect:${west},${north},${east},${south}`,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      apiKey: process.env.GEOAPIFY_API_KEY ?? "",
    });
    if (niche.custom) qs.set("name", niche.label);
    const res = await fetchWithRetry(`https://api.geoapify.com/v2/places?${qs}`, { method: "GET" }, {
      provider: "Geoapify",
      minIntervalMs: 250, // free plan: 5 requests/second
    });
    const json = (await res.json()) as { features?: GFeature[] };
    const features = json.features ?? [];
    return {
      items: features.map(mapGeoapifyFeature).filter((b): b is RawBusiness => !!b),
      nextPage: features.length === PAGE_SIZE ? String(offset + PAGE_SIZE) : null,
      requests: 1,
    };
  },
};
