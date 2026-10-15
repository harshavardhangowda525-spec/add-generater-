import { describe, expect, it } from "vitest";
import { leadsToCsv, parseImportCsv } from "@/lib/csv";
import type { Lead } from "@/lib/db/schema";
import { ringTiles, splitBBox } from "@/lib/geocode";
import { nameKey } from "@/lib/names";
import { resolveNiche } from "@/lib/niches";
import { normalizePhone } from "@/lib/phone";
import { buildOverpassQuery, mapOsmElement } from "@/lib/providers/osm";
import { mapGooglePlace } from "@/lib/providers/google";
import { scoreLead } from "@/lib/quality";
import { classifyWebsite, normalizeInstagram, checkWebsite } from "@/lib/website";

describe("phone normalisation", () => {
  it("adds +91 to Indian mobile numbers and keeps the original", () => {
    const p = normalizePhone("098450 12345");
    expect(p?.e164).toBe("+919845012345");
    expect(p?.raw).toBe("098450 12345");
    expect(p?.type).toBe("mobile");
  });
  it("normalises Bengaluru landlines", () => {
    expect(normalizePhone("080-2345 6789")?.e164).toBe("+918023456789");
  });
  it("prefers a mobile when several numbers are listed", () => {
    expect(normalizePhone("+91 80 2345 6789; +91 98450 12345")?.e164).toBe("+919845012345");
  });
  it("never invents a number for junk input", () => {
    expect(normalizePhone("call us")?.e164).toBeNull();
    expect(normalizePhone("12345")?.e164 ?? null).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("website classification", () => {
  it("empty field → No Website Listed with evidence", () => {
    const c = classifyWebsite(null, "OpenStreetMap");
    expect(c.status).toBe("no_website");
    expect(c.evidence).toMatch(/No website listed in OpenStreetMap/);
  });
  it("instagram in website field → no website, instagram captured", () => {
    const c = classifyWebsite("https://instagram.com/fitzone_blr", "Google Places");
    expect(c.status).toBe("no_website");
    expect(c.instagramFromWebsite).toBe("https://instagram.com/fitzone_blr");
  });
  it("free builder pages are available but weak", () => {
    const c = classifyWebsite("fitzone.business.site", "Google Places");
    expect(c.status).toBe("available");
    expect(c.weak).toBe(true);
  });
  it("real domain → available", () => {
    expect(classifyWebsite("www.example.in", "x").status).toBe("available");
  });
  it("unreachable site is never reported as no website", async () => {
    const r = await checkWebsite("https://this-domain-does-not-exist-ilf-test.invalid", 2000);
    expect(r.status).toBe("unreachable");
  });
  it("refuses to probe private addresses", async () => {
    const r = await checkWebsite("http://localhost:5432");
    expect(r.status).toBe("unknown");
  });
  it("normalises instagram handles", () => {
    expect(normalizeInstagram("@cafe.blr")).toBe("https://www.instagram.com/cafe.blr/");
  });
});

describe("providers", () => {
  it("builds a bbox-scoped Overpass query that requires a phone tag", () => {
    const q = buildOverpassQuery({
      niche: resolveNiche("gym"),
      tile: { label: "t", bbox: { south: 12.9, west: 77.5, north: 13, east: 77.6 } },
      params: {} as never,
      page: null,
      phoneRequired: true,
    });
    expect(q).toContain('nwr["leisure"="fitness_centre"]["name"]["phone"](12.9,77.5,13,77.6);');
    expect(q).toContain('["contact:phone"]');
    expect(q).toContain("out center tags");
  });
  it("escapes custom niches", () => {
    const n = resolveNiche("custom", 'yoga"]; out; ("');
    expect(n.osm[0]).not.toContain('"]; out');
  });
  it("maps OSM elements without inventing fields", () => {
    const b = mapOsmElement({ type: "node", id: 42, lat: 12.97, lon: 77.6, tags: { name: "Iron Gym", leisure: "fitness_centre", phone: "+91 98450 00001" } });
    expect(b).toMatchObject({ sourceId: "node/42", website: null, instagram: null, phone: "+91 98450 00001", profileUrl: "https://www.openstreetmap.org/node/42" });
  });
  it("skips closed Google places", () => {
    const b = mapGooglePlace({ id: "x", displayName: { text: "A" }, businessStatus: "CLOSED_PERMANENTLY" });
    expect(b?.operational).toBe(false);
  });
  it("search reach: ring tiles lie around the city, not inside it, and stay bounded", () => {
    const city = { south: 12.834, north: 13.144, west: 77.46, east: 77.784 }; // Bengaluru, ~34 km
    expect(ringTiles(city, 4, 0)).toEqual([]);
    for (const km of [10, 25, 50]) {
      const ring = ringTiles(city, 4, km);
      expect(ring.length).toBeGreaterThan(0);
      expect(ring.length).toBeLessThanOrEqual(100);
      for (const t of ring) {
        const cLat = (t.north + t.south) / 2;
        const cLon = (t.east + t.west) / 2;
        const inside = cLat > city.south && cLat < city.north && cLon > city.west && cLon < city.east;
        expect(inside).toBe(false);
      }
      // reaches km beyond the city on every side
      const south = Math.min(...ring.map((t) => t.south));
      expect(city.south - south).toBeCloseTo(km / 111, 3);
    }
  });
    it("splits a city into an n×n grid, centre first", () => {
    const tiles = splitBBox({ south: 0, west: 0, north: 3, east: 3 }, 3);
    expect(tiles).toHaveLength(9);
    expect(tiles[0]).toEqual({ south: 1, north: 2, west: 1, east: 2 });
  });
});

describe("dedup keys and scoring", () => {
  it("normalises names", () => {
    expect(nameKey("The Iron Gym Pvt. Ltd.")).toBe(nameKey("iron gym"));
  });
  it("scores a mobile + no-website + instagram lead as High", () => {
    expect(scoreLead({ phoneE164: "+919845012345", phoneType: "mobile", websiteStatus: "no_website", websiteWeak: false, instagramUrl: "x", address: "a", openingHours: null, rating: null, ratingCount: null })).toBeGreaterThanOrEqual(70);
  });
});

describe("CSV", () => {
  it("neutralises formula injection but keeps +91 numbers", () => {
    const lead = { name: "=HYPERLINK(\"x\")", phoneE164: "+919845012345", websiteStatus: "no_website", websiteWeak: false, qualityScore: 80, status: "new", createdAt: new Date(), source: "osm" } as unknown as Lead;
    const csv = leadsToCsv([lead]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("+919845012345");
  });
  it("parses imports and marks missing phones", () => {
    const { leads, errors } = parseImportCsv("Business Name,Phone,Website\nA Cafe,98450 11111,\nB Salon,,\n,123,\n", { country: "India" });
    expect(leads).toHaveLength(2);
    expect(leads[0].phoneE164).toBe("+919845011111");
    expect(leads[0].websiteStatus).toBe("no_website");
    expect(leads[1].phoneE164).toBeNull();
    expect(errors[0].message).toMatch(/Missing business name/);
  });
  it("treats imports with no website column as unknown", () => {
    expect(parseImportCsv("Name,Phone\nA,9845011111\n", { country: "India" }).leads[0].websiteStatus).toBe("unknown");
  });
});
