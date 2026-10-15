import { business, reviews } from '../config/site';

export const telLink = `tel:${business.phoneE164}`;

export function whatsappLink(message: string = business.whatsappMessage): string {
  return `https://wa.me/${business.whatsappDigits}?text=${encodeURIComponent(message)}`;
}

export const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.mapQuery)}`;

export const mapsSearchLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.mapQuery)}`;

/** Keyless Google Maps embed for the exact address. */
export const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(business.mapQuery)}&output=embed`;

/** Verified reviews URL if supplied, otherwise the business's Maps listing search. */
export const reviewsLink = reviews.googleReviewsUrl ?? mapsSearchLink;
