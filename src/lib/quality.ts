import type { WebsiteStatus } from "./db/schema";

export type QualityInput = {
  phoneE164: string | null;
  phoneType: string | null;
  websiteStatus: WebsiteStatus;
  websiteWeak: boolean;
  instagramUrl: string | null;
  address: string | null;
  openingHours: string | null;
  rating: number | null;
  ratingCount: number | null;
};

/**
 * 0–100 score for how good a prospect this is for a website/app pitch.
 * Transparent and deterministic so it can be explained in the UI.
 */
export function scoreLead(l: QualityInput): number {
  let s = 0;
  if (l.phoneE164) s += 30;
  if (l.phoneType === "mobile") s += 10; // WhatsApp-reachable
  if (l.websiteStatus === "no_website") s += 30;
  else if (l.websiteWeak || l.websiteStatus === "unreachable") s += 20;
  if (l.instagramUrl) s += 10; // invests in online presence but has no site
  if (l.address) s += 5;
  if (l.openingHours) s += 5;
  if ((l.ratingCount ?? 0) >= 20) s += 10;
  else if ((l.ratingCount ?? 0) >= 5) s += 5;
  return Math.min(100, s);
}

export function qualityLabel(score: number): "High" | "Medium" | "Low" {
  return score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
}

export const QUALITY_THRESHOLDS = { High: 70, Medium: 45, Low: 0 } as const;
