import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { leads, leadSources, users } from "@/lib/db/schema";
import { createJob, runJobStep, setJobState } from "@/lib/jobs";
import { allMatchingLeads, leadFilterSchema, queryLeads } from "@/lib/leads-query";
import { leadsToCsv } from "@/lib/csv";
import { mockFetch, resetDb } from "./helpers";

const baseParams = {
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  niche: "gym",
  websiteFilter: "none" as const,
  instagramFilter: "any" as const,
  checkWebsites: false,
};

let userId: string;

beforeAll(async () => {
  process.env.HTTP_DELAY_SCALE = "0";
  process.env.SEARCH_GRID_SIZE = "4";
});

beforeEach(async () => {
  await resetDb();
  process.env.OSM_ENABLED = "true";
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GEOAPIFY_API_KEY;
  const [u] = await db.insert(users).values({ email: "t@example.com", passwordHash: "x" }).returning();
  userId = u.id;
});

afterEach(() => vi.unstubAllGlobals());

async function runToEnd(jobId: string) {
  let job = null;
  for (let i = 0; i < 100; i++) {
    job = await runJobStep(jobId, { budgetMs: 60000 });
    if (job?.status !== "running") break;
  }
  return job!;
}

describe("search job pipeline", () => {
  it("collects exactly the requested number of eligible leads, all with phones and no listed website", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    const job = await createJob(userId, { ...baseParams, target: 100 });
    const done = await runToEnd(job.id);
    expect(done.status).toBe("completed");
    expect(done.foundCount).toBe(100);

    const rows = await db.select().from(leads).where(eq(leads.userId, userId));
    expect(rows).toHaveLength(100);
    for (const l of rows) {
      expect(l.phoneE164).toMatch(/^\+91\d{10}$/); // every lead has a normalised phone
      expect(l.websiteStatus).toBe("no_website"); // default filter excludes listed websites
      expect(l.source).toBe("osm");
      expect(l.websiteEvidence).toMatch(/OpenStreetMap/);
    }
    // social-only "website" became an Instagram link, not a website
    expect(rows.some((l) => l.instagramUrl?.includes("instagram.com"))).toBe(true);
    expect(done.skippedWebsite).toBeGreaterThan(0);
    expect(done.skippedNoPhone).toBeGreaterThan(0);
  });

  it("repeated searches never create duplicates and report honestly when fewer leads exist", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    const first = await runToEnd((await createJob(userId, { ...baseParams, target: 100 })).id);
    expect(first.foundCount).toBe(100);

    vi.stubGlobal("fetch", mockFetch({}).fn);
    const second = await runToEnd((await createJob(userId, { ...baseParams, target: 1000 })).id);
    expect(second.status).toBe("exhausted");
    expect(second.duplicateCount).toBeGreaterThanOrEqual(100);
    expect(second.stopReason).toMatch(new RegExp(`Only ${second.foundCount} of 1000`));

    const total = (await db.select().from(leads)).length;
    expect(total).toBe(first.foundCount + second.foundCount);
    // 16 tiles × 9 eligible = 144 unique businesses in the mock data
    expect(total).toBe(144);
    const phones = (await db.select({ p: leads.phoneE164 }).from(leads)).map((r) => r.p);
    expect(new Set(phones).size).toBe(phones.length);
    // cross-tile duplicate (different OSM id, same phone) was linked, not inserted
    expect((await db.select().from(leadSources)).length).toBeGreaterThan(total);
  });

  it("search reach continues into the area around the city after the city is covered", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    const cityOnly = await runToEnd((await createJob(userId, { ...baseParams, target: 1000 })).id);
    expect(cityOnly.status).toBe("exhausted");
    expect(cityOnly.foundCount).toBe(144); // 16 city areas × 9 eligible

    vi.stubGlobal("fetch", mockFetch({}).fn);
    const wider = await runToEnd((await createJob(userId, { ...baseParams, target: 1000, reachKm: 25 })).id);
    const tiles = wider.cursor!.tiles;
    expect(tiles.filter((t) => !t.ring)).toHaveLength(16);
    expect(tiles.filter((t) => t.ring).length).toBeGreaterThan(0);
    expect(tiles.findIndex((t) => t.ring)).toBe(16); // city first, then the surroundings
    expect(wider.foundCount).toBeGreaterThan(0); // new businesses beyond the city
    expect(wider.log.some((l) => /Search reach extended 25 km/.test(l.message))).toBe(true);
  });

    it("follows Google Places pagination tokens across pages", async () => {
    process.env.OSM_ENABLED = "false";
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
    let n = 0;
    const pages: (string | undefined)[] = [];
    const { fn } = mockFetch({
      google: (_url, init) => {
        const body = JSON.parse(String(init?.body));
        if (body.pageSize === 1) {
          return Response.json({ places: [{ viewport: { low: { latitude: 12.83, longitude: 77.46 }, high: { latitude: 13.14, longitude: 77.78 } } }] });
        }
        pages.push(body.pageToken);
        const token = body.pageToken ? Number(body.pageToken.slice(1)) : 0;
        const places = Array.from({ length: 20 }, () => {
          n++;
          return {
            id: `place${n}`,
            displayName: { text: `Google Gym ${n}` },
            internationalPhoneNumber: `+91 98860 ${String(n).padStart(5, "0")}`,
            businessStatus: "OPERATIONAL",
            googleMapsUri: `https://maps.google.com/?cid=${n}`,
            ...(n % 4 === 0 ? { websiteUri: `https://gym${n}.example.com` } : {}),
          };
        });
        return Response.json({ places, ...(token < 2 ? { nextPageToken: `p${token + 1}` } : {}) });
      },
    });
    vi.stubGlobal("fetch", fn);
    const done = await runToEnd((await createJob(userId, { ...baseParams, target: 40 })).id);
    expect(done.status).toBe("completed");
    expect(done.foundCount).toBe(40);
    expect(pages.slice(0, 3)).toEqual([undefined, "p1", "p2"]); // paginated within the first area
    const rows = await db.select().from(leads);
    expect(rows.every((r) => r.profileUrl?.startsWith("https://maps.google.com"))).toBe(true);
    expect(rows.every((r) => r.attribution === "Data © Google")).toBe(true);
  });

  it("reports provider rate limits honestly and can resume afterwards", async () => {
    vi.stubGlobal("fetch", mockFetch({ overpass: () => new Response("rate_limited", { status: 429 }) }).fn);
    const job = await createJob(userId, { ...baseParams, target: 50 });
    const limited = await runToEnd(job.id);
    expect(limited.status).toBe("limited");
    expect(limited.stopReason).toMatch(/Stopped at 0 of 50: provider limit reached \(OpenStreetMap/);
    expect(limited.log.some((l) => l.level === "error" && /HTTP 429/.test(l.message))).toBe(true);

    vi.stubGlobal("fetch", mockFetch({}).fn);
    await setJobState(job.id, userId, "resume");
    const resumed = await runToEnd(job.id);
    expect(resumed.status).toBe("completed");
    expect(resumed.foundCount).toBe(50);
  });

  it("pause stops progress and resume continues where it left off", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    const job = await createJob(userId, { ...baseParams, target: 120 });
    const partial = await runJobStep(job.id, { budgetMs: 1 }); // one page then yield
    expect(partial!.status).toBe("running");
    const before = partial!.foundCount;
    expect(before).toBeGreaterThan(0);
    await setJobState(job.id, userId, "pause");
    const stillPaused = await runJobStep(job.id);
    expect(stillPaused!.status).toBe("paused");
    expect(stillPaused!.foundCount).toBe(before);
    await setJobState(job.id, userId, "resume");
    const done = await runToEnd(job.id);
    expect(done.foundCount).toBe(120);
  });

  it("fails clearly when no provider is configured", async () => {
    process.env.OSM_ENABLED = "false";
    const done = await runToEnd((await createJob(userId, { ...baseParams, target: 10 })).id);
    expect(done.status).toBe("failed");
    expect(done.stopReason).toMatch(/No data provider is configured/);
  });
});

describe("filters and export", () => {
  it("CSV export contains exactly the filtered rows", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    await runToEnd((await createJob(userId, { ...baseParams, target: 30, websiteFilter: "all" })).id);
    const all = await db.select().from(leads);
    expect(all.some((l) => l.websiteStatus === "available")).toBe(true);

    const f = leadFilterSchema.parse({ phone: "has", website: "no_website" });
    const filtered = await allMatchingLeads(userId, f);
    const csv = leadsToCsv(filtered);
    const lines = csv.trim().split("\n");
    expect(lines.length - 1).toBe(filtered.length);
    expect(filtered.length).toBeLessThan(all.length);
    expect(csv).not.toContain("Website Available");
    for (const l of filtered) expect(csv).toContain(l.phoneE164!);

    const page = await queryLeads(userId, f, { sort: "name", dir: "asc", pageSize: 5 });
    expect(page.total).toBe(filtered.length);
    expect(page.rows.map((r) => r.name)).toEqual([...page.rows.map((r) => r.name)].sort((a, b) => a.localeCompare(b)));
  });

  it("isolates leads between users", async () => {
    vi.stubGlobal("fetch", mockFetch({}).fn);
    await runToEnd((await createJob(userId, { ...baseParams, target: 10 })).id);
    const [other] = await db.insert(users).values({ email: "o@example.com", passwordHash: "x" }).returning();
    expect((await queryLeads(other.id, leadFilterSchema.parse({}))).total).toBe(0);
  });
});
