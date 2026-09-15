// Shared text-normalization layer for search. Both the user's query and every
// piece of searchable item text (names, categories, restaurant names) are run
// through the same pipeline before comparison, so formatting differences in
// the source data — trademark symbols, hyphens, apostrophes, accents,
// stray punctuation — never cause an otherwise-matching search to miss.
const TRADEMARK_SYMBOLS = /[®™©℠]/g;
const APOSTROPHES = /['‘’`´]/g;
const HYPHENS_AND_DASHES = /[-‐‑‒–—―−]/g;

export function normalizeSearchText(input: string): string {
  return input
    // Strip trademark symbols before Unicode normalization: NFKD gives "™" a
    // compatibility decomposition into the letters "TM", which would
    // otherwise glue onto the preceding word (e.g. "Chick-fil-A™" -> "...atm").
    .replace(TRADEMARK_SYMBOLS, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (é -> e, ñ -> n, ...)
    .toLowerCase()
    .replace(APOSTROPHES, "") // "Cane's" -> "canes", not "cane s"
    .replace(HYPHENS_AND_DASHES, " ") // "Chick-fil-A" -> "chick fil a"
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // any remaining punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

// Removes whitespace from already-normalized text so brand names and other
// multi-word phrases typed as one merged word (or split differently than the
// source data) can still be matched generically — e.g. "chickfila" or
// "chick fila" against a name that normalizes to "chick fil a" — without
// hardcoding every formatting variant per brand.
export function squashSearchText(normalized: string): string {
  return normalized.replace(/\s+/g, "");
}
