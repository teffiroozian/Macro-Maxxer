// Conservative, restaurant-agnostic name normalization shared by every
// importer/review/validate script that needs to compare official product
// names across sources without over-fuzzing the match (no stemming, no
// synonym rewriting — just case/punctuation/whitespace/marker normalization).
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/<\/?sup\b[^>]*>/gi, "")
    .replace(/[®™℠]/g, "")
    .replace(/[’‘‛`´]/g, "'")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
