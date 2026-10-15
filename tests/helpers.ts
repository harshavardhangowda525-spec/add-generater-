import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { BBox } from "@/lib/db/schema";

export async function resetDb() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client`truncate users, sessions, search_jobs, leads, lead_sources cascade`;
  await client.end();
}

export const BENGALURU: BBox = { south: 12.834, north: 13.144, west: 77.46, east: 77.784 };

/**
 * TEST-ONLY mock of provider HTTP responses, shaped exactly like Overpass /
 * Nominatim / Google Places replies. The application never uses this data.
 */
export function osmTileElements(tile: number, perTile = 12) {
  const els = [];
  for (let i = 0; i < perTile; i++) {
    const id = tile * 1000 + i;
    const tags: Record<string, string> = { name: `Test Fitness ${tile}-${i}`, leisure: "fitness_centre", "addr:suburb": `Suburb ${tile}` };
    const mobile = `+91 9845${String(tile).padStart(2, "0")}${String(i).padStart(4, "0")}`;
    if (i < 8) tags.phone = mobile; // eligible
    else if (i < 10) {
      tags.phone = mobile;
      tags.website = `https://gym${id}.example.in`; // has a website → excluded
    } else if (i === 10) {
      tags["contact:phone"] = mobile;
      tags.website = `https://instagram.com/gym${id}`; // social only → no website + instagram
    } else tags.phone = "not a number"; // unusable phone → excluded
    els.push({ type: "node", id, lat: 12.9 + tile * 0.001, lon: 77.6 + i * 0.002, tags });
  }
  // The same real business seen from a neighbouring tile under another OSM id.
  if (tile > 0) els.push({ type: "way", id: 900000 + tile, center: { lat: 12.9, lon: 77.6 }, tags: { name: `Test Fitness ${tile - 1}-0`, leisure: "fitness_centre", phone: `+91 9845${String(tile - 1).padStart(2, "0")}0000` } });
  return els;
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export function mockFetch(opts: { overpass?: Handler; google?: Handler }) {
  const tileIds = new Map<string, number>();
  const calls: string[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.includes("nominatim")) {
      return Response.json([{ boundingbox: [BENGALURU.south, BENGALURU.north, BENGALURU.west, BENGALURU.east].map(String), display_name: "Bengaluru, Karnataka, India" }]);
    }
    if (url.includes("overpass")) {
      if (opts.overpass) return opts.overpass(url, init);
      const body = decodeURIComponent(String(init?.body ?? ""));
      const bbox = body.match(/\(([\d.,-]+)\);/)?.[1] ?? "";
      if (!tileIds.has(bbox)) tileIds.set(bbox, tileIds.size);
      return Response.json({ elements: osmTileElements(tileIds.get(bbox)!) });
    }
    if (url.includes("places.googleapis.com")) {
      if (opts.google) return opts.google(url, init);
    }
    return new Response("unexpected url in test: " + url, { status: 599 });
  };
  return { fn, calls };
}
