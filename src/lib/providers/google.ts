import { fetchWithRetry } from "../http";
import type { Provider, RawBusiness } from "./types";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.businessStatus",
  "nextPageToken",
].join(",");

type GPlace = {
  id: string;
  displayName?: { text: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  formattedAddress?: string;
  addressComponents?: { longText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text: string };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  businessStatus?: string;
};

export function mapGooglePlace(p: GPlace): RawBusiness | null {
  const name = p.displayName?.text;
  if (!name) return null;
  const comp = (type: string) => p.addressComponents?.find((c) => c.types.includes(type))?.longText ?? null;
  return {
    provider: "google",
    sourceId: p.id,
    name,
    category: p.primaryTypeDisplayName?.text ?? null,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    instagram: null, // Places API does not expose social profiles
    facebook: null,
    address: p.formattedAddress ?? null,
    locality: comp("sublocality_level_1") ?? comp("sublocality") ?? comp("neighborhood"),
    city: comp("locality"),
    lat: p.location?.latitude ?? null,
    lon: p.location?.longitude ?? null,
    profileUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    openingHours: p.regularOpeningHours?.weekdayDescriptions?.join("; ") ?? null,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? null,
    operational: !p.businessStatus || p.businessStatus === "OPERATIONAL",
    raw: { id: p.id, businessStatus: p.businessStatus },
  };
}

export const googleProvider: Provider = {
  name: "google",
  label: "Google Places API",
  attribution: "Data © Google",
  isConfigured: () => !!process.env.GOOGLE_PLACES_API_KEY,
  async searchPage({ niche, tile, params, page }) {
    const where = [params.area, params.city, params.state, params.country].filter(Boolean).join(", ");
    const body: Record<string, unknown> = {
      textQuery: `${niche.google.query} in ${where}`,
      pageSize: 20,
      locationRestriction: {
        rectangle: {
          low: { latitude: tile.bbox.south, longitude: tile.bbox.west },
          high: { latitude: tile.bbox.north, longitude: tile.bbox.east },
        },
      },
    };
    if (niche.google.type) body.includedType = niche.google.type;
    if (page) body.pageToken = page;
    const res = await fetchWithRetry(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY ?? "",
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify(body),
      },
      { provider: "Google Places", minIntervalMs: 200 },
    );
    const json = (await res.json()) as { places?: GPlace[]; nextPageToken?: string };
    return {
      items: (json.places ?? []).map(mapGooglePlace).filter((b): b is RawBusiness => !!b),
      nextPage: json.nextPageToken ?? null,
      requests: 1,
    };
  },
};
