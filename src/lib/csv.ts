import Papa from "papaparse";
import type { Lead, LeadStatus, NewLead } from "./db/schema";
import { LEAD_STATUSES } from "./db/schema";
import { LEAD_STATUS_LABELS, PROVIDER_LABELS, WEBSITE_STATUS_LABELS } from "./labels";
import { countryToIso } from "./countries";
import { nameKey } from "./names";
import { normalizePhone } from "./phone";
import { qualityLabel, scoreLead } from "./quality";
import { classifyWebsite, normalizeInstagram } from "./website";

export const CSV_COLUMNS = [
  "Business Name",
  "Business Category",
  "Niche",
  "Phone Number",
  "Phone (original)",
  "Locality",
  "City",
  "State",
  "Country",
  "Address",
  "Official Website Status",
  "Website URL",
  "Website Evidence",
  "Instagram URL",
  "Business Profile URL",
  "Lead Quality",
  "Quality Score",
  "Lead Status",
  "Notes",
  "Follow-up Date",
  "Date Found",
  "Source",
  "Attribution",
] as const;

/** Neutralise spreadsheet formula injection (=, +, -, @ at cell start). */
function safe(v: unknown): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /^[=+\-@\t\r]/.test(s) && !/^\+\d/.test(s) ? `'${s}` : s;
}

export function leadsToCsv(rows: Lead[]): string {
  const data = rows.map((l) => [
    l.name,
    l.category,
    l.niche,
    l.phoneE164 ?? "Phone Unavailable",
    l.phoneRaw,
    l.locality,
    l.city,
    l.state,
    l.country,
    l.address,
    WEBSITE_STATUS_LABELS[l.websiteStatus] + (l.websiteWeak ? " (weak)" : ""),
    l.websiteUrl,
    l.websiteEvidence,
    l.instagramUrl,
    l.profileUrl,
    qualityLabel(l.qualityScore),
    l.qualityScore,
    LEAD_STATUS_LABELS[l.status],
    l.notes,
    l.followUpAt ? l.followUpAt.toISOString().slice(0, 10) : "",
    l.createdAt.toISOString().slice(0, 10),
    PROVIDER_LABELS[l.source] ?? l.source,
    l.attribution,
  ].map(safe));
  return "﻿" + Papa.unparse({ fields: [...CSV_COLUMNS], data });
}

const ALIASES: Record<string, string[]> = {
  name: ["business name", "name", "business", "company", "title"],
  category: ["business category", "category", "type"],
  niche: ["niche"],
  phone: ["phone number", "phone", "mobile", "contact", "phone (original)", "contact number", "phone_number"],
  locality: ["locality", "area", "neighbourhood", "neighborhood"],
  city: ["city", "town"],
  state: ["state", "region"],
  country: ["country"],
  address: ["address", "full address"],
  website: ["website url", "website", "url", "site"],
  instagram: ["instagram url", "instagram", "insta"],
  profile: ["business profile url", "google maps url", "maps url", "profile url"],
  status: ["lead status", "status"],
  notes: ["notes", "note", "comments"],
  followUp: ["follow-up date", "follow up", "followup", "follow-up"],
};

function pick(row: Record<string, string>, key: keyof typeof ALIASES): string | null {
  for (const [col, val] of Object.entries(row)) {
    if (ALIASES[key].includes(col.trim().toLowerCase()) && val?.trim()) return val.trim();
  }
  return null;
}

function parseStatus(v: string | null): LeadStatus {
  if (!v) return "new";
  const s = v.trim().toLowerCase();
  const byLabel = (Object.entries(LEAD_STATUS_LABELS) as [LeadStatus, string][]).find(([, l]) => l.toLowerCase() === s);
  if (byLabel) return byLabel[0];
  return (LEAD_STATUSES as readonly string[]).includes(s) ? (s as LeadStatus) : "new";
}

export type ParsedImport = { leads: Omit<NewLead, "userId">[]; errors: { row: number; message: string }[] };

export function parseImportCsv(text: string, defaults: { country: string; city?: string }): ParsedImport {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy" });
  const out: ParsedImport = { leads: [], errors: parsed.errors.slice(0, 20).map((e) => ({ row: (e.row ?? 0) + 2, message: e.message })) };
  parsed.data.forEach((row, i) => {
    const name = pick(row, "name");
    if (!name) {
      out.errors.push({ row: i + 2, message: "Missing business name" });
      return;
    }
    const country = pick(row, "country") ?? defaults.country;
    const rawPhone = pick(row, "phone");
    const phone = rawPhone && rawPhone !== "Phone Unavailable" ? normalizePhone(rawPhone, countryToIso(country)) : null;
    const websiteRaw = pick(row, "website");
    // An import without a website column gives no evidence either way.
    const hasWebsiteColumn = Object.keys(row).some((c) => ALIASES.website.includes(c.trim().toLowerCase()));
    const site = hasWebsiteColumn ? classifyWebsite(websiteRaw, "imported CSV") : null;
    const instagramUrl = normalizeInstagram(pick(row, "instagram")) ?? site?.instagramFromWebsite ?? null;
    const websiteStatus = site?.status ?? "unknown";
    const followRaw = pick(row, "followUp");
    const followUpAt = followRaw && !Number.isNaN(Date.parse(followRaw)) ? new Date(followRaw) : null;
    const address = pick(row, "address");
    out.leads.push({
      name,
      nameKey: nameKey(name),
      category: pick(row, "category"),
      niche: pick(row, "niche"),
      phoneRaw: rawPhone,
      phoneE164: phone?.e164 ?? null,
      phoneDisplay: phone?.display ?? null,
      phoneType: phone?.type ?? null,
      address,
      locality: pick(row, "locality"),
      city: pick(row, "city") ?? defaults.city ?? null,
      state: pick(row, "state"),
      country,
      websiteUrl: site?.url ?? null,
      websiteStatus,
      websiteWeak: site?.weak ?? false,
      websiteEvidence: site?.evidence ?? "Imported without a website column — status unknown",
      instagramUrl,
      profileUrl: pick(row, "profile"),
      status: parseStatus(pick(row, "status")),
      notes: pick(row, "notes"),
      followUpAt,
      qualityScore: scoreLead({ phoneE164: phone?.e164 ?? null, phoneType: phone?.type ?? null, websiteStatus, websiteWeak: site?.weak ?? false, instagramUrl, address, openingHours: null, rating: null, ratingCount: null }),
      source: "import",
      attribution: null,
    });
  });
  return out;
}
