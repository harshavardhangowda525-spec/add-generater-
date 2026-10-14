import type { LeadStatus, WebsiteStatus } from "./db/schema";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New Lead",
  ready: "Ready to Contact",
  contacted: "Contacted",
  interested: "Interested — Follow-up",
  demo_scheduled: "Demo Scheduled",
  proposal_sent: "Proposal Sent",
  converted: "Converted",
  rejected: "Rejected",
};

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  no_website: "No Website Listed",
  available: "Website Available",
  unreachable: "Website Unreachable",
  unknown: "Website Status Unknown",
};

export const PROVIDER_LABELS: Record<string, string> = {
  osm: "OpenStreetMap",
  google: "Google Places",
  geoapify: "Geoapify",
  import: "CSV import",
};
