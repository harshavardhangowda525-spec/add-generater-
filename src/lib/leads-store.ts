import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { leads, leadSources, type Lead, type NewLead } from "./db/schema";

export { nameKey } from "./names";

function distanceM(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type SaveSource = { provider: string; sourceId: string; raw?: unknown } | null;
export type SaveResult = { outcome: "inserted"; lead: Lead } | { outcome: "duplicate"; leadId: string; matchedBy: string };

/**
 * Find an existing lead for this user that is the same business.
 * Order of evidence: provider id → normalised phone → same name nearby / same locality.
 */
export async function findDuplicate(
  userId: string,
  candidate: Pick<NewLead, "phoneE164" | "nameKey" | "lat" | "lon" | "locality" | "city">,
  source: SaveSource,
): Promise<{ id: string; matchedBy: string } | null> {
  if (source) {
    const [s] = await db
      .select({ leadId: leadSources.leadId })
      .from(leadSources)
      .where(and(eq(leadSources.userId, userId), eq(leadSources.provider, source.provider), eq(leadSources.sourceId, source.sourceId)))
      .limit(1);
    if (s) return { id: s.leadId, matchedBy: "provider id" };
  }
  if (candidate.phoneE164) {
    const [p] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.userId, userId), eq(leads.phoneE164, candidate.phoneE164)))
      .limit(1);
    if (p) return { id: p.id, matchedBy: "phone number" };
  }
  if (candidate.nameKey) {
    const same = await db
      .select({ id: leads.id, lat: leads.lat, lon: leads.lon, locality: leads.locality, city: leads.city })
      .from(leads)
      .where(and(eq(leads.userId, userId), eq(leads.nameKey, candidate.nameKey)))
      .limit(50);
    for (const l of same) {
      if (candidate.lat != null && candidate.lon != null && l.lat != null && l.lon != null) {
        if (distanceM(candidate.lat, candidate.lon, l.lat, l.lon) < 150) return { id: l.id, matchedBy: "name + location" };
        continue;
      }
      const loc = (x?: string | null) => (x ?? "").trim().toLowerCase();
      if (loc(candidate.locality) && loc(candidate.locality) === loc(l.locality)) return { id: l.id, matchedBy: "name + locality" };
      if (!candidate.locality && !l.locality && loc(candidate.city) && loc(candidate.city) === loc(l.city))
        return { id: l.id, matchedBy: "name + city" };
    }
  }
  return null;
}

/** Fill gaps on an existing lead with newly found evidence (never overwrites user CRM fields). */
async function enrich(leadId: string, data: NewLead) {
  await db
    .update(leads)
    .set({
      instagramUrl: sql`coalesce(${leads.instagramUrl}, ${data.instagramUrl ?? null})`,
      facebookUrl: sql`coalesce(${leads.facebookUrl}, ${data.facebookUrl ?? null})`,
      profileUrl: sql`coalesce(${leads.profileUrl}, ${data.profileUrl ?? null})`,
      address: sql`coalesce(${leads.address}, ${data.address ?? null})`,
      locality: sql`coalesce(${leads.locality}, ${data.locality ?? null})`,
      openingHours: sql`coalesce(${leads.openingHours}, ${data.openingHours ?? null})`,
      rating: sql`coalesce(${leads.rating}, ${data.rating ?? null})`,
      ratingCount: sql`coalesce(${leads.ratingCount}, ${data.ratingCount ?? null})`,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

async function linkSource(userId: string, leadId: string, source: SaveSource) {
  if (!source) return;
  await db
    .insert(leadSources)
    .values({ userId, leadId, provider: source.provider, sourceId: source.sourceId, raw: source.raw ?? null })
    .onConflictDoNothing();
}

export async function saveLead(data: NewLead, source: SaveSource): Promise<SaveResult> {
  const dup = await findDuplicate(data.userId, data, source);
  if (dup) {
    await linkSource(data.userId, dup.id, source);
    await enrich(dup.id, data);
    return { outcome: "duplicate", leadId: dup.id, matchedBy: dup.matchedBy };
  }
  // ON CONFLICT on the (user, phone) partial unique index guards concurrent jobs.
  const inserted = await db
    .insert(leads)
    .values(data)
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) {
    const again = await findDuplicate(data.userId, data, null);
    if (again) {
      await linkSource(data.userId, again.id, source);
      return { outcome: "duplicate", leadId: again.id, matchedBy: again.matchedBy };
    }
    throw new Error("Lead insert conflicted but no duplicate found");
  }
  await linkSource(data.userId, inserted[0].id, source);
  return { outcome: "inserted", lead: inserted[0] };
}
