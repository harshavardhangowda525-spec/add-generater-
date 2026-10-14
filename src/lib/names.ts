/** Normalised business name used for duplicate detection. */
export function nameKey(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(the|pvt|private|ltd|limited|llp)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}
