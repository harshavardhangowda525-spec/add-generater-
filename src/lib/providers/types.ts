import type { BBox, SearchParams } from "../db/schema";
import type { Niche } from "../niches";

/** A business exactly as a provider reported it — no invented fields. */
export type RawBusiness = {
  provider: string;
  sourceId: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  address: string | null;
  locality: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  profileUrl: string | null;
  openingHours: string | null;
  rating: number | null;
  ratingCount: number | null;
  operational: boolean; // false if the provider marks it closed
  raw: unknown;
};

export type SearchPageInput = {
  niche: Niche & { custom: boolean };
  tile: { label: string; bbox: BBox };
  params: SearchParams;
  page: string | null;
  phoneRequired: boolean;
};

export type SearchPageResult = {
  items: RawBusiness[];
  nextPage: string | null;
  requests: number;
};

export interface Provider {
  name: string;
  label: string;
  attribution: string;
  isConfigured(): boolean;
  searchPage(input: SearchPageInput): Promise<SearchPageResult>;
}
