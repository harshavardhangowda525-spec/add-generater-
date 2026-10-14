import dns from "node:dns/promises";
import net from "node:net";
import type { WebsiteStatus } from "./db/schema";

const SOCIAL_HOSTS: Record<string, "instagram" | "facebook" | "other"> = {
  "instagram.com": "instagram",
  "instagr.am": "instagram",
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "fb.me": "facebook",
  "m.facebook.com": "facebook",
  "wa.me": "other",
  "api.whatsapp.com": "other",
  "twitter.com": "other",
  "x.com": "other",
  "youtube.com": "other",
  "linkedin.com": "other",
  "t.me": "other",
};

/** Free page builders / link hubs — a listed URL exists but it's not a real site. */
const WEAK_HOSTS = [
  "business.site",
  "linktr.ee",
  "sites.google.com",
  "wixsite.com",
  "blogspot.com",
  "wordpress.com",
  "justdial.com",
  "sulekha.com",
  "indiamart.com",
  "zomato.com",
  "swiggy.com",
  "practo.com",
  "magicpin.in",
  "dotpe.in",
  "mydukaan.io",
  "bio.link",
  "carrd.co",
];

export function normalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = String(input).trim().split(/[;\s]+/)[0];
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matchesHost(host: string, base: string) {
  return host === base || host.endsWith(`.${base}`);
}

export function socialKind(url: string): "instagram" | "facebook" | "other" | null {
  const host = hostOf(url);
  for (const [base, kind] of Object.entries(SOCIAL_HOSTS)) if (matchesHost(host, base)) return kind;
  return null;
}

export function normalizeInstagram(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (/instagram\.com|instagr\.am/i.test(v)) {
    const url = normalizeUrl(v);
    return url ? url.replace(/[?#].*$/, "") : null;
  }
  const handle = v.replace(/^@/, "");
  if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return `https://www.instagram.com/${handle}/`;
  return null;
}

export type WebsiteClassification = {
  status: WebsiteStatus;
  url: string | null;
  weak: boolean;
  evidence: string;
  instagramFromWebsite?: string | null;
  facebookFromWebsite?: string | null;
};

/**
 * Classify the provider's official-website field. This is evidence-based: we
 * only say "no website" when the provider's website field is empty (or holds
 * just a social-media profile), and we record exactly why.
 */
export function classifyWebsite(rawWebsite: string | null | undefined, provider: string): WebsiteClassification {
  const url = normalizeUrl(rawWebsite);
  if (!url) {
    return {
      status: "no_website",
      url: null,
      weak: false,
      evidence: `No website listed in ${provider} data`,
    };
  }
  const social = socialKind(url);
  if (social) {
    return {
      status: "no_website",
      url: null,
      weak: false,
      evidence: `${provider} website field only contains a ${social === "other" ? "social/messaging" : social} profile (${hostOf(url)})`,
      instagramFromWebsite: social === "instagram" ? normalizeInstagram(url) : null,
      facebookFromWebsite: social === "facebook" ? url : null,
    };
  }
  const host = hostOf(url);
  const weakHost = WEAK_HOSTS.find((b) => matchesHost(host, b));
  if (weakHost) {
    return {
      status: "available",
      url,
      weak: true,
      evidence: `Listed URL is a free builder / directory page (${weakHost}), not a dedicated website`,
    };
  }
  return { status: "available", url, weak: false, evidence: `Website listed in ${provider} data (reachability not checked)` };
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
}

/**
 * Check whether a listed website responds. An unreachable site is reported as
 * "unreachable" — never as "no website". Private/internal addresses are refused
 * so provider data can't be used to probe the server's network.
 */
export async function checkWebsite(url: string, timeoutMs = 8000): Promise<{ status: WebsiteStatus; evidence: string }> {
  let current = url;
  try {
    for (let hop = 0; hop < 5; hop++) {
      const u = new URL(current);
      if (!/^https?:$/.test(u.protocol)) return { status: "unknown", evidence: `Unsupported URL scheme ${u.protocol}` };
      const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => null);
      if (!addrs || addrs.length === 0) return { status: "unreachable", evidence: `Domain ${u.hostname} does not resolve (DNS)` };
      if (addrs.some((a) => isPrivateIp(a.address))) return { status: "unknown", evidence: "Website resolves to a private address; not checked" };

      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "InfinityLeadFinder/1.0 (website availability check)" },
      });
      res.body?.cancel().catch(() => {});
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, current).toString();
        continue;
      }
      // 401/403/405/429 mean a live server that refuses bots — the site exists.
      if (res.status < 500) return { status: "available", evidence: `Website responded HTTP ${res.status}` };
      return { status: "unreachable", evidence: `Website returned server error HTTP ${res.status}` };
    }
    return { status: "unknown", evidence: "Too many redirects" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/timeout|aborted/i.test(msg)) return { status: "unreachable", evidence: `Website timed out after ${timeoutMs / 1000}s` };
    return { status: "unreachable", evidence: `Website connection failed (${msg.slice(0, 80)})` };
  }
}
