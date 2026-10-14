import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { LEAD_STATUSES, leads, searchJobs } from "./db/schema";

const tri = z.enum(["any", "has", "none"]).default("any");

export const leadFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  niche: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  phone: tri,
  instagram: tri,
  website: z.enum(["any", "no_website", "available", "unreachable", "unknown", "weak"]).default("any"),
  status: z.enum(["any", ...LEAD_STATUSES]).default("any"),
  minQuality: z.coerce.number().int().min(0).max(100).optional(),
  jobId: z.string().uuid().optional(),
  followUp: z.enum(["any", "due", "scheduled"]).default("any"),
  ids: z.array(z.string().uuid()).max(10000).optional(),
});
export type LeadFilters = z.infer<typeof leadFilterSchema>;

export const SORTABLE = {
  name: leads.name,
  category: leads.category,
  phone: leads.phoneE164,
  city: leads.city,
  website: leads.websiteStatus,
  quality: leads.qualityScore,
  status: leads.status,
  createdAt: leads.createdAt,
  followUpAt: leads.followUpAt,
} as const;

/** Parse filters from URL search params (used by list + export endpoints). */
export function filtersFromSearchParams(sp: URLSearchParams): LeadFilters {
  const obj: Record<string, unknown> = {};
  for (const k of ["q", "niche", "city", "phone", "instagram", "website", "status", "minQuality", "jobId", "followUp"]) {
    const v = sp.get(k);
    if (v) obj[k] = v;
  }
  const ids = sp.get("ids");
  if (ids) obj.ids = ids.split(",").filter(Boolean);
  return leadFilterSchema.parse(obj);
}

export function buildWhere(userId: string, f: LeadFilters): SQL {
  const c: (SQL | undefined)[] = [eq(leads.userId, userId)];
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const digits = f.q.replace(/\D/g, "");
    c.push(
      or(
        ilike(leads.name, like),
        ilike(leads.locality, like),
        ilike(leads.address, like),
        ilike(leads.category, like),
        ilike(leads.notes, like),
        digits.length >= 3 ? ilike(leads.phoneE164, `%${digits}%`) : undefined,
      ),
    );
  }
  if (f.niche) c.push(eq(leads.niche, f.niche));
  if (f.city) c.push(ilike(leads.city, f.city));
  if (f.phone === "has") c.push(isNotNull(leads.phoneE164));
  if (f.phone === "none") c.push(isNull(leads.phoneE164));
  if (f.instagram === "has") c.push(isNotNull(leads.instagramUrl));
  if (f.instagram === "none") c.push(isNull(leads.instagramUrl));
  if (f.website === "weak") c.push(or(eq(leads.websiteWeak, true), eq(leads.websiteStatus, "unreachable"), eq(leads.websiteStatus, "no_website")));
  else if (f.website !== "any") c.push(eq(leads.websiteStatus, f.website));
  if (f.status !== "any") c.push(eq(leads.status, f.status));
  if (f.minQuality != null) c.push(gte(leads.qualityScore, f.minQuality));
  if (f.jobId) c.push(eq(leads.searchJobId, f.jobId));
  if (f.followUp === "due") c.push(lte(leads.followUpAt, new Date()));
  if (f.followUp === "scheduled") c.push(isNotNull(leads.followUpAt));
  if (f.ids?.length) c.push(inArray(leads.id, f.ids));
  return and(...c)!;
}

export async function queryLeads(
  userId: string,
  f: LeadFilters,
  opts: { sort?: string; dir?: "asc" | "desc"; page?: number; pageSize?: number } = {},
) {
  const where = buildWhere(userId, f);
  const col = SORTABLE[(opts.sort as keyof typeof SORTABLE) ?? "createdAt"] ?? leads.createdAt;
  const order = opts.dir === "asc" ? asc(col) : desc(col);
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 1), 500);
  const page = Math.max(opts.page ?? 1, 1);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(leads).where(where).orderBy(order, desc(leads.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(leads).where(where),
  ]);
  return { rows, total: count, page, pageSize };
}

export async function allMatchingLeads(userId: string, f: LeadFilters) {
  return db.select().from(leads).where(buildWhere(userId, f)).orderBy(desc(leads.createdAt));
}

export async function leadStats(userId: string) {
  const [s] = await db
    .select({
      total: sql<number>`count(*)::int`,
      withPhone: sql<number>`count(*) filter (where ${leads.phoneE164} is not null)::int`,
      noWebsite: sql<number>`count(*) filter (where ${leads.websiteStatus} = 'no_website')::int`,
      primary: sql<number>`count(*) filter (where ${leads.websiteStatus} = 'no_website' and ${leads.phoneE164} is not null)::int`,
      withInstagram: sql<number>`count(*) filter (where ${leads.instagramUrl} is not null)::int`,
      contacted: sql<number>`count(*) filter (where ${leads.status} not in ('new','ready'))::int`,
      converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')::int`,
      followUpsDue: sql<number>`count(*) filter (where ${leads.followUpAt} <= now() and ${leads.status} not in ('converted','rejected'))::int`,
    })
    .from(leads)
    .where(eq(leads.userId, userId));
  const [active] = await db
    .select({
      target: sql<number>`coalesce(sum(${searchJobs.target}), 0)::int`,
      found: sql<number>`coalesce(sum(${searchJobs.foundCount}), 0)::int`,
      running: sql<number>`count(*) filter (where ${searchJobs.status} = 'running')::int`,
    })
    .from(searchJobs)
    .where(and(eq(searchJobs.userId, userId), inArray(searchJobs.status, ["running", "paused", "limited"])));
  return { ...s, activeTarget: active.target, activeFound: active.found, remaining: Math.max(0, active.target - active.found), runningJobs: active.running };
}

export async function distinctValues(userId: string) {
  const [niches, cities] = await Promise.all([
    db.selectDistinct({ v: leads.niche }).from(leads).where(and(eq(leads.userId, userId), isNotNull(leads.niche))).orderBy(leads.niche),
    db.selectDistinct({ v: leads.city }).from(leads).where(and(eq(leads.userId, userId), isNotNull(leads.city))).orderBy(leads.city),
  ]);
  return { niches: niches.map((n) => n.v!), cities: cities.map((c) => c.v!) };
}
