import type { JobLogEntry, JobStatus, LeadStatus, SearchParams, WebsiteStatus } from "./db/schema";

/** JSON shapes the browser receives (dates are ISO strings). */
export type LeadDTO = {
  id: string;
  name: string;
  category: string | null;
  niche: string | null;
  phoneRaw: string | null;
  phoneE164: string | null;
  phoneDisplay: string | null;
  phoneType: string | null;
  address: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  websiteUrl: string | null;
  websiteStatus: WebsiteStatus;
  websiteWeak: boolean;
  websiteEvidence: string | null;
  websiteCheckedAt: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  profileUrl: string | null;
  openingHours: string | null;
  rating: number | null;
  ratingCount: number | null;
  qualityScore: number;
  status: LeadStatus;
  notes: string | null;
  followUpAt: string | null;
  contactedAt: string | null;
  source: string;
  attribution: string | null;
  searchJobId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobDTO = {
  id: string;
  params: SearchParams;
  target: number;
  status: JobStatus;
  foundCount: number;
  scannedCount: number;
  duplicateCount: number;
  skippedNoPhone: number;
  skippedWebsite: number;
  skippedOther: number;
  requestCount: number;
  log: JobLogEntry[];
  stopReason: string | null;
  cursor: { tiles: { label: string }[]; providerOrder: string[]; providers: Record<string, { tileIdx: number; done: boolean; limited: boolean }> } | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type StatsDTO = {
  total: number;
  withPhone: number;
  noWebsite: number;
  primary: number;
  withInstagram: number;
  contacted: number;
  converted: number;
  followUpsDue: number;
  activeTarget: number;
  activeFound: number;
  remaining: number;
  runningJobs: number;
};

export type MetaDTO = {
  user: { id: string; email: string; name: string | null };
  providers: { name: string; label: string; attribution: string; configured: boolean }[];
  niches: { key: string; label: string }[];
  values: { niches: string[]; cities: string[] };
};
