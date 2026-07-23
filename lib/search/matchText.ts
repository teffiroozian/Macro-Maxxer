import { getSearchTerms } from "@/lib/menuSections/filtering";

export { getSearchTerms };

// true when every term is a substring of text (case-insensitive)
export function matchesText(text: string, terms: string[]): boolean {
  if (!terms.length) {
    return true;
  }

  const normalized = text.toLowerCase();
  return terms.every((term) => normalized.includes(term));
}
