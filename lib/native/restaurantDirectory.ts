// Pure helpers behind the native Restaurants directory.
type Named = { name: string };

export function sortRestaurants<T extends Named>(restaurants: readonly T[]): T[] {
  return [...restaurants].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

// Accents and punctuation never matter: "mcdonalds" finds McDonald's.
const words = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);

// Matches from the start of any word, so "pan" finds Panda Express and
// "fil a" finds Chick-fil-A. An empty query matches everything.
export function matchRestaurants<T extends Named>(restaurants: readonly T[], query: string): T[] {
  const wanted = words(query).join("");
  if (!wanted) return query.trim() ? [] : [...restaurants];
  return restaurants.filter(({ name }) => {
    const parts = words(name);
    return parts.some((_, index) => parts.slice(index).join("").startsWith(wanted));
  });
}

export type LetterGroup<T> = { letter: string; restaurants: T[] };

// Expects sorted input. Names that don't start with a letter share "#".
export function groupByLetter<T extends Named>(restaurants: readonly T[]): LetterGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const restaurant of restaurants) {
    const first = (words(restaurant.name)[0]?.[0] ?? "#").toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), restaurant]);
  }
  return [...groups].map(([letter, list]) => ({ letter, restaurants: list }));
}
