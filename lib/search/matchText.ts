import { getSearchTerms } from "@/lib/menuSections/filtering";
import { normalizeSearchText, squashSearchText } from "@/lib/search/normalizeSearchText";

export { getSearchTerms };

// true when every term is a substring of the normalized text. Falls back to a
// whitespace-squashed comparison per term so merged/split brand-name spellings
// (e.g. "chickfila" vs "chick fil a") still match without needing an
// alias list.
export function matchesText(text: string, terms: string[]): boolean {
  if (!terms.length) {
    return true;
  }

  const normalized = normalizeSearchText(text);
  const squashed = squashSearchText(normalized);
  return terms.every((term) => normalized.includes(term) || squashed.includes(term));
}

// Matches query terms as an ordered subsequence of the normalized text.
// Terms may have arbitrary text between them, but cannot appear out of order.
export function matchesOrderedTerms(text: string, terms: string[]): boolean {
  if (!terms.length) {
    return true;
  }

  const normalized = text.toLowerCase();
  let cursor = 0;

  for (const term of terms) {
    const matchIndex = normalized.indexOf(term, cursor);
    if (matchIndex === -1) {
      return false;
    }
    cursor = matchIndex + term.length;
  }

  return true;
}
