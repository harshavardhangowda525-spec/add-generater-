import type { BBox } from "./db/schema";
import { fetchWithRetry, ProviderError } from "./http";
import { osmUserAgent } from "./providers/osm";

export type GeocodeResult = { bbox: BBox; label: string; source: string };

/**
 * Turn "Indiranagar, Bengaluru, Karnataka, India" into a bounding box.
 * Uses whichever geocoder is configured: Geoapify → Google Places → Nominatim.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const chain: [string, (q: string) => Promise<GeocodeResult | null>][] = [];
  if (process.env.GEOAPIFY_API_KEY) chain.push(["Geoapify", geocodeGeoapify]);
  if (process.env.GOOGLE_PLACES_API_KEY) chain.push(["Google", geocodeGoogle]);
  chain.push(["Nominatim", geocodeNominatim]);
  const errors: string[] = [];
  // Fall through to the next geocoder if one is down, over quota or finds nothing.
  for (const [name, fn] of chain) {
    try {
      const hit = await fn(query);
      if (hit) return hit;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `${name} failed`);
    }
  }
  if (errors.length === chain.length) throw new ProviderError(`Geocoding failed: ${errors.join(" | ")}`, "upstream");
  return null;
}

async function geocodeNominatim(query: string): Promise<GeocodeResult | null> {
  const base = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
  const qs = new URLSearchParams({ q: query, format: "jsonv2", limit: "1" });
  const res = await fetchWithRetry(`${base}/search?${qs}`, { headers: { "User-Agent": osmUserAgent() } }, {
    provider: "Nominatim",
    minIntervalMs: 1100, // Nominatim usage policy: max 1 request/second
  });
  const json = (await res.json()) as { boundingbox?: string[]; display_name?: string }[];
  const hit = json[0];
  if (!hit?.boundingbox) return null;
  const [s, n, w, e] = hit.boundingbox.map(Number);
  return { bbox: { south: s, north: n, west: w, east: e }, label: hit.display_name ?? query, source: "Nominatim" };
}

async function geocodeGeoapify(query: string): Promise<GeocodeResult | null> {
  const qs = new URLSearchParams({ text: query, limit: "1", apiKey: process.env.GEOAPIFY_API_KEY ?? "" });
  const res = await fetchWithRetry(`https://api.geoapify.com/v1/geocode/search?${qs}`, {}, { provider: "Geoapify geocoding" });
  const json = (await res.json()) as { features?: { bbox?: number[]; properties?: { formatted?: string; lat: number; lon: number } }[] };
  const f = json.features?.[0];
  if (!f) return null;
  if (f.bbox) {
    const [w, s, e, n] = f.bbox;
    return { bbox: { south: s, west: w, north: n, east: e }, label: f.properties?.formatted ?? query, source: "Geoapify" };
  }
  if (f.properties) return { bbox: around(f.properties.lat, f.properties.lon, 2), label: f.properties.formatted ?? query, source: "Geoapify" };
  return null;
}

async function geocodeGoogle(query: string): Promise<GeocodeResult | null> {
  const res = await fetchWithRetry(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
        "X-Goog-FieldMask": "places.viewport,places.location,places.formattedAddress",
      },
      body: JSON.stringify({ textQuery: query, pageSize: 1 }),
    },
    { provider: "Google geocoding" },
  );
  const json = (await res.json()) as {
    places?: { viewport?: { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } }; location?: { latitude: number; longitude: number }; formattedAddress?: string }[];
  };
  const p = json.places?.[0];
  if (!p) return null;
  if (p.viewport) {
    return {
      bbox: { south: p.viewport.low.latitude, west: p.viewport.low.longitude, north: p.viewport.high.latitude, east: p.viewport.high.longitude },
      label: p.formattedAddress ?? query,
      source: "Google",
    };
  }
  if (p.location) return { bbox: around(p.location.latitude, p.location.longitude, 2), label: p.formattedAddress ?? query, source: "Google" };
  return null;
}

/** Bounding box of ±km around a point. */
function around(lat: number, lon: number, km: number): BBox {
  const dLat = km / 111;
  const dLon = km / (111 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, north: lat + dLat, west: lon - dLon, east: lon + dLon };
}

/** Split a bounding box into an n×n grid so each provider query stays small. */
export function splitBBox(b: BBox, n: number): BBox[] {
  const tiles: BBox[] = [];
  const dLat = (b.north - b.south) / n;
  const dLon = (b.east - b.west) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      tiles.push({
        south: round(b.south + i * dLat),
        north: round(b.south + (i + 1) * dLat),
        west: round(b.west + j * dLon),
        east: round(b.west + (j + 1) * dLon),
      });
    }
  }
  // Search the city centre first — denser, more businesses per request.
  const cLat = (b.north + b.south) / 2;
  const cLon = (b.east + b.west) / 2;
  return tiles.sort((x, y) => dist(x, cLat, cLon) - dist(y, cLat, cLon));
}

function dist(t: BBox, lat: number, lon: number) {
  return ((t.north + t.south) / 2 - lat) ** 2 + ((t.east + t.west) / 2 - lon) ** 2;
}
const round = (x: number) => Math.round(x * 1e6) / 1e6;

/** Area first (if given), then the whole city split into a grid. */
export async function planTiles(params: { country: string; state: string; city: string; area?: string }) {
  const grid = Math.max(1, Math.min(10, Number(process.env.SEARCH_GRID_SIZE) || 4));
  const cityQuery = [params.city, params.state, params.country].filter(Boolean).join(", ");
  const tiles: { label: string; bbox: BBox }[] = [];
  const notes: string[] = [];

  if (params.area?.trim()) {
    const areaQuery = `${params.area.trim()}, ${cityQuery}`;
    const area = await geocode(areaQuery);
    if (area) {
      const areaGrid = areaKm(area.bbox) > 8 ? 2 : 1;
      splitBBox(area.bbox, areaGrid).forEach((bbox, i) =>
        tiles.push({ label: `${params.area}${areaGrid > 1 ? ` (part ${i + 1})` : ""}`, bbox }),
      );
      notes.push(`Locality "${params.area}" located via ${area.source}.`);
    } else {
      notes.push(`Locality "${params.area}" could not be located; searching the whole city instead.`);
    }
  }

  const city = await geocode(cityQuery);
  if (!city) {
    if (tiles.length) return { tiles, notes };
    throw new ProviderError(`Could not locate "${cityQuery}". Check the spelling of the city/state/country.`, "bad_request");
  }
  notes.push(`City "${params.city}" located via ${city.source}; split into ${grid}×${grid} search areas.`);
  splitBBox(city.bbox, grid).forEach((bbox, i) => tiles.push({ label: `${params.city} area ${i + 1}/${grid * grid}`, bbox }));
  return { tiles, notes };
}

function areaKm(b: BBox) {
  return Math.max((b.north - b.south) * 111, (b.east - b.west) * 111 * Math.cos((((b.north + b.south) / 2) * Math.PI) / 180));
}
