import type { NewLead, SearchParams } from "./db/schema";
import { countryToIso } from "./countries";
import { nameKey } from "./names";
import { normalizePhone } from "./phone";
import { scoreLead } from "./quality";
import type { RawBusiness } from "./providers/types";
import { checkWebsite, classifyWebsite, normalizeInstagram } from "./website";

export type Evaluation =
  | { eligible: true; lead: Omit<NewLead, "userId"> }
  | { eligible: false; reason: "no_phone" | "website" | "instagram" | "quality" | "closed" };

/**
 * Turn a provider record into a lead and decide whether it matches the search.
 * Phone is always required for search results. Website checks only run when
 * they could change the outcome, to save time and requests.
 */
export async function evaluateBusiness(b: RawBusiness, params: SearchParams, attribution: string): Promise<Evaluation> {
  if (!b.operational) return { eligible: false, reason: "closed" };

  const phone = normalizePhone(b.phone, countryToIso(params.country));
  if (!phone?.e164) return { eligible: false, reason: "no_phone" };

  const site = classifyWebsite(b.website, providerLabel(b.provider));
  let websiteStatus = site.status;
  let websiteEvidence = site.evidence;
  let websiteCheckedAt: Date | null = null;

  const filter = params.websiteFilter;
  if (filter === "none" && websiteStatus !== "no_website") return { eligible: false, reason: "website" };

  // Without a live check, a listed non-builder site can't be called "weak", so
  // the weak filter excludes it; with checks on, unreachable sites qualify.
  if (params.checkWebsites && site.url) {
    const check = await checkWebsite(site.url);
    websiteStatus = check.status === "available" ? "available" : check.status;
    websiteEvidence = `${site.evidence.replace(/ \(reachability not checked\)$/, "")}. ${check.evidence}`;
    websiteCheckedAt = new Date();
  }
  if (filter === "weak") {
    const weakOrNone = websiteStatus === "no_website" || site.weak || websiteStatus === "unreachable";
    if (!weakOrNone) return { eligible: false, reason: "website" };
  }

  const instagramUrl = normalizeInstagram(b.instagram) ?? site.instagramFromWebsite ?? null;
  if (params.instagramFilter === "has" && !instagramUrl) return { eligible: false, reason: "instagram" };
  if (params.instagramFilter === "none" && instagramUrl) return { eligible: false, reason: "instagram" };

  const qualityScore = scoreLead({
    phoneE164: phone.e164,
    phoneType: phone.type,
    websiteStatus,
    websiteWeak: site.weak,
    instagramUrl,
    address: b.address,
    openingHours: b.openingHours,
    rating: b.rating,
    ratingCount: b.ratingCount,
  });
  if (params.minQuality && qualityScore < params.minQuality) return { eligible: false, reason: "quality" };

  return {
    eligible: true,
    lead: {
      name: b.name.trim(),
      nameKey: nameKey(b.name),
      category: b.category,
      niche: params.niche === "custom" ? params.customNiche ?? "custom" : params.niche,
      phoneRaw: phone.raw,
      phoneE164: phone.e164,
      phoneDisplay: phone.display,
      phoneType: phone.type,
      address: b.address,
      locality: b.locality ?? params.area ?? null,
      city: b.city ?? params.city,
      state: params.state,
      country: params.country,
      lat: b.lat,
      lon: b.lon,
      websiteUrl: site.url,
      websiteStatus,
      websiteWeak: site.weak,
      websiteEvidence,
      websiteCheckedAt,
      instagramUrl,
      facebookUrl: b.facebook ?? site.facebookFromWebsite ?? null,
      profileUrl: b.profileUrl,
      openingHours: b.openingHours,
      rating: b.rating,
      ratingCount: b.ratingCount,
      qualityScore,
      source: b.provider,
      attribution,
    },
  };
}

function providerLabel(p: string) {
  return p === "osm" ? "OpenStreetMap" : p === "google" ? "Google Places" : p === "geoapify" ? "Geoapify" : p;
}
