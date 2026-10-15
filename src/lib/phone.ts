import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export type NormalizedPhone = {
  raw: string;
  e164: string | null;
  display: string | null;
  type: "mobile" | "fixed_line" | "unknown";
  valid: boolean;
};

/**
 * Normalise a publicly listed phone number. Provider fields often hold several
 * numbers ("+91 80 1234 5678; 98450 12345") — we keep the raw string and pick the
 * first number that parses as valid, preferring mobiles (WhatsApp-reachable).
 * Nothing is ever invented: if no candidate parses, e164 is null.
 */
export function normalizePhone(raw: string | null | undefined, country: CountryCode = "IN"): NormalizedPhone | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const candidates = trimmed
    .split(/[;,/|]|\s{2,}|\bor\b/i)
    .map((s) => s.trim())
    .filter((s) => /\d{5,}/.test(s.replace(/\D/g, "")));

  const parsed = candidates
    .map((c) => parsePhoneNumberFromString(c, country))
    .filter((p): p is NonNullable<typeof p> => !!p && p.isValid());

  if (parsed.length === 0) {
    return { raw: trimmed, e164: null, display: null, type: "unknown", valid: false };
  }
  const best = parsed.find((p) => p.getType() === "MOBILE") ?? parsed[0];
  const t = best.getType();
  return {
    raw: trimmed,
    e164: best.number,
    display: best.formatInternational(),
    type: t === "MOBILE" ? "mobile" : t === "FIXED_LINE" ? "fixed_line" : "unknown",
    valid: true,
  };
}
