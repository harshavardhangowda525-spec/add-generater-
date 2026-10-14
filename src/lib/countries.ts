import type { CountryCode } from "libphonenumber-js";

/** Minimal country-name → ISO mapping for phone normalisation. Extend as needed. */
const COUNTRY_CODES: Record<string, CountryCode> = {
  india: "IN",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  "united arab emirates": "AE",
  uae: "AE",
  canada: "CA",
  australia: "AU",
  singapore: "SG",
  nepal: "NP",
  "sri lanka": "LK",
  bangladesh: "BD",
};

export function countryToIso(country: string | null | undefined): CountryCode {
  if (!country) return "IN";
  const key = country.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase() as CountryCode;
  return COUNTRY_CODES[key] ?? "IN";
}
