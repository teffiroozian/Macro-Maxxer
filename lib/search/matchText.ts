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
