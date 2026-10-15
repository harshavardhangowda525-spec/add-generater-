/**
 * Niche catalog. Each niche maps to provider-specific search terms:
 *  - osm: Overpass tag filters (each entry is OR-ed)
 *  - google: text-search phrase + optional includedType
 *  - geoapify: category list
 */
export type Niche = {
  key: string;
  label: string;
  osm: string[];
  google: { query: string; type?: string };
  geoapify: string[];
};

export const NICHES: Niche[] = [
  { key: "gym", label: "Gyms & fitness centres", osm: ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]["sport"="fitness"]', '["amenity"="gym"]'], google: { query: "gym fitness centre", type: "gym" }, geoapify: ["sport.fitness"] },
  { key: "restaurant", label: "Restaurants", osm: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'], google: { query: "restaurant", type: "restaurant" }, geoapify: ["catering.restaurant", "catering.fast_food"] },
  { key: "cafe", label: "Cafes & bakeries", osm: ['["amenity"="cafe"]', '["shop"="bakery"]'], google: { query: "cafe", type: "cafe" }, geoapify: ["catering.cafe", "commercial.food_and_drink.bakery"] },
  { key: "salon", label: "Salons & beauty parlours", osm: ['["shop"="hairdresser"]', '["shop"="beauty"]'], google: { query: "beauty salon", type: "beauty_salon" }, geoapify: ["service.beauty"] },
  { key: "spa", label: "Spas & massage", osm: ['["leisure"="spa"]', '["shop"="massage"]', '["amenity"="spa"]'], google: { query: "spa", type: "spa" }, geoapify: ["service.beauty.spa", "service.beauty.massage"] },
  { key: "coaching", label: "Coaching & tuition centres", osm: ['["amenity"="training"]', '["office"="educational_institution"]', '["amenity"="language_school"]', '["amenity"="music_school"]', '["amenity"="driving_school"]'], google: { query: "coaching centre tuition classes" }, geoapify: ["education.school", "education.driving_school", "education.language_school", "education.music_school"] },
  { key: "clinic", label: "Clinics & doctors", osm: ['["amenity"="clinic"]', '["amenity"="doctors"]', '["healthcare"="clinic"]', '["amenity"="dentist"]'], google: { query: "clinic", type: "doctor" }, geoapify: ["healthcare.clinic_or_praxis", "healthcare.dentist"] },
  { key: "physiotherapy", label: "Physiotherapy centres", osm: ['["healthcare"="physiotherapist"]', '["healthcare:speciality"="physiotherapy"]'], google: { query: "physiotherapy centre", type: "physiotherapist" }, geoapify: ["healthcare.clinic_or_praxis"] },
  { key: "clothing", label: "Clothing & boutiques", osm: ['["shop"="clothes"]', '["shop"="boutique"]', '["shop"="tailor"]', '["shop"="fashion"]'], google: { query: "clothing store boutique", type: "clothing_store" }, geoapify: ["commercial.clothing"] },
  { key: "retail", label: "Retail & general stores", osm: ['["shop"="convenience"]', '["shop"="supermarket"]', '["shop"="general"]', '["shop"="variety_store"]', '["shop"="gift"]'], google: { query: "retail store", type: "store" }, geoapify: ["commercial.supermarket", "commercial.convenience", "commercial.gift_and_souvenir"] },
  { key: "hotel", label: "Hotels & guest houses", osm: ['["tourism"="hotel"]', '["tourism"="guest_house"]', '["tourism"="hostel"]'], google: { query: "hotel", type: "lodging" }, geoapify: ["accommodation.hotel", "accommodation.guest_house", "accommodation.hostel"] },
  { key: "real_estate", label: "Real estate agencies", osm: ['["office"="estate_agent"]', '["shop"="estate_agent"]'], google: { query: "real estate agency", type: "real_estate_agency" }, geoapify: ["office.estate_agent"] },
  { key: "mobile_store", label: "Mobile phone stores", osm: ['["shop"="mobile_phone"]', '["shop"="electronics"]'], google: { query: "mobile phone shop", type: "cell_phone_store" }, geoapify: ["commercial.elektronics"] },
  { key: "pharmacy", label: "Pharmacies", osm: ['["amenity"="pharmacy"]', '["shop"="chemist"]'], google: { query: "pharmacy", type: "pharmacy" }, geoapify: ["healthcare.pharmacy"] },
  { key: "jewellery", label: "Jewellery stores", osm: ['["shop"="jewelry"]'], google: { query: "jewellery store", type: "jewelry_store" }, geoapify: ["commercial.jewelry"] },
  { key: "car_service", label: "Car & bike service", osm: ['["shop"="car_repair"]', '["shop"="motorcycle_repair"]', '["shop"="car"]', '["shop"="motorcycle"]'], google: { query: "car service garage", type: "car_repair" }, geoapify: ["service.vehicle.repair", "commercial.vehicle"] },
  { key: "interior", label: "Interior designers & furniture", osm: ['["shop"="furniture"]', '["shop"="interior_decoration"]', '["craft"="interior_decorator"]'], google: { query: "interior designer furniture store", type: "furniture_store" }, geoapify: ["commercial.furniture_and_interior"] },
  { key: "pet", label: "Pet shops & vets", osm: ['["shop"="pet"]', '["amenity"="veterinary"]'], google: { query: "pet shop veterinary", type: "pet_store" }, geoapify: ["commercial.pet", "pet.veterinary"] },
];

export const NICHE_MAP = new Map(NICHES.map((n) => [n.key, n]));

/** Resolve a search's niche into provider terms; custom niches fall back to name matching. */
export function resolveNiche(niche: string, customNiche?: string): Niche & { custom: boolean } {
  const known = NICHE_MAP.get(niche);
  if (known) return { ...known, custom: false };
  const text = (customNiche ?? niche).trim();
  const safe = text.replace(/[^\p{L}\p{N} &-]/gu, "").slice(0, 60) || "business";
  return {
    key: "custom",
    label: safe,
    custom: true,
    osm: [`["name"~"${safe}",i]["shop"]`, `["name"~"${safe}",i]["amenity"]`, `["name"~"${safe}",i]["office"]`, `["name"~"${safe}",i]["craft"]`, `["name"~"${safe}",i]["leisure"]`, `["name"~"${safe}",i]["healthcare"]`],
    google: { query: safe },
    geoapify: ["commercial", "service", "catering", "office", "healthcare", "education", "sport", "accommodation"],
  };
}

export function nicheLabel(niche: string | null | undefined, customNiche?: string | null) {
  if (!niche) return "";
  return NICHE_MAP.get(niche)?.label ?? customNiche ?? niche;
}
