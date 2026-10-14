import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const WEBSITE_STATUSES = ["no_website", "available", "unreachable", "unknown"] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const LEAD_STATUSES = [
  "new",
  "ready",
  "contacted",
  "interested",
  "demo_scheduled",
  "proposal_sent",
  "converted",
  "rejected",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const JOB_STATUSES = [
  "running", // being worked on (by a step call or the worker)
  "paused", // paused by the user, resumable
  "completed", // target reached
  "exhausted", // every planned area/page searched, fewer leads than requested
  "limited", // stopped because a provider quota/rate limit was hit; resumable later
  "failed", // unrecoverable error (e.g. no provider configured, geocoding failed)
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the raw token never touches the database.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type SearchParams = {
  country: string;
  state: string;
  city: string;
  area?: string;
  niche: string; // niche key from the catalog, or "custom"
  customNiche?: string;
  target: number;
  websiteFilter: "none" | "weak" | "all";
  instagramFilter: "any" | "has" | "none";
  minQuality?: number;
  checkWebsites: boolean;
  providers?: string[]; // restrict to these providers; default = all configured
};

export type BBox = { south: number; west: number; north: number; east: number };

export type ProviderCursor = {
  tileIdx: number;
  page: string | null; // provider-specific page token / offset
  done: boolean; // every tile and page searched
  limited: boolean; // stopped by quota / rate limit / auth — resumable
};

export type JobCursor = {
  tiles: { label: string; bbox: BBox }[];
  providers: Record<string, ProviderCursor>;
  providerOrder: string[];
};

export type JobLogEntry = { at: string; level: "info" | "warn" | "error"; message: string };

export const searchJobs = pgTable(
  "search_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    params: jsonb("params").$type<SearchParams>().notNull(),
    target: integer("target").notNull(),
    status: text("status").$type<JobStatus>().notNull().default("running"),
    cursor: jsonb("cursor").$type<JobCursor>(),
    foundCount: integer("found_count").notNull().default(0),
    scannedCount: integer("scanned_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    skippedNoPhone: integer("skipped_no_phone").notNull().default(0),
    skippedWebsite: integer("skipped_website").notNull().default(0),
    skippedOther: integer("skipped_other").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    log: jsonb("log").$type<JobLogEntry[]>().notNull().default(sql`'[]'::jsonb`),
    stopReason: text("stop_reason"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("search_jobs_user_idx").on(t.userId, t.createdAt)],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(), // normalised name for duplicate detection
    category: text("category"),
    niche: text("niche"),
    phoneRaw: text("phone_raw"),
    phoneE164: text("phone_e164"),
    phoneDisplay: text("phone_display"),
    phoneType: text("phone_type"), // mobile | fixed_line | unknown
    address: text("address"),
    locality: text("locality"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    websiteUrl: text("website_url"),
    websiteStatus: text("website_status").$type<WebsiteStatus>().notNull().default("unknown"),
    websiteWeak: boolean("website_weak").notNull().default(false),
    websiteEvidence: text("website_evidence"),
    websiteCheckedAt: timestamp("website_checked_at", { withTimezone: true }),
    instagramUrl: text("instagram_url"),
    facebookUrl: text("facebook_url"),
    profileUrl: text("profile_url"), // Google Maps / OSM / provider profile link
    openingHours: text("opening_hours"),
    rating: doublePrecision("rating"),
    ratingCount: integer("rating_count"),
    qualityScore: integer("quality_score").notNull().default(0),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    notes: text("notes"),
    followUpAt: timestamp("follow_up_at", { withTimezone: true }),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    source: text("source").notNull(), // provider that first found it, or "import"
    attribution: text("attribution"),
    searchJobId: uuid("search_job_id").references(() => searchJobs.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("leads_user_phone_uq")
      .on(t.userId, t.phoneE164)
      .where(sql`${t.phoneE164} is not null`),
    index("leads_user_name_idx").on(t.userId, t.nameKey),
    index("leads_user_created_idx").on(t.userId, t.createdAt),
    index("leads_user_status_idx").on(t.userId, t.status),
  ],
);

/** Every provider identifier a lead has been seen under — used for cross-search dedup. */
export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    sourceId: text("source_id").notNull(),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lead_sources_uq").on(t.userId, t.provider, t.sourceId),
    index("lead_sources_lead_idx").on(t.leadId),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SearchJob = typeof searchJobs.$inferSelect;
export type User = typeof users.$inferSelect;
