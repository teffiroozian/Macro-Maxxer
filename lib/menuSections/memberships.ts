export type MenuMembership = { category?: string; categories?: string[]; tags?: string[] };
export function getPrimaryMenuCategory(item: MenuMembership): string {
  return (item.category ?? item.categories?.[0] ?? "Other").trim().toLowerCase();
}
// Category/tag selections are a union of memberships, not an intersection.
export function matchesMenuMembership(item: MenuMembership, categories?: string[], tags?: string[], exclusions?: string[]): boolean {
  if (exclusions?.some((category) => category.trim().toLowerCase() === getPrimaryMenuCategory(item))) return false;
  if (categories === undefined && tags === undefined) return true;
  return Boolean(categories?.some((category) => category.trim().toLowerCase() === getPrimaryMenuCategory(item)) || tags?.some((tag) => item.tags?.some((value) => value.trim().toLowerCase() === tag.trim().toLowerCase())));
}
