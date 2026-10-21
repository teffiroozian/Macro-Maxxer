import { getNutritionDataQuality } from "@/lib/nutrition";
import { toItemSlug } from "@/lib/restaurants";
import type { HistoryEntry } from "@/lib/history/browsingHistory";
import type { SearchIndexEntry } from "@/lib/search/searchIndex";
export function resolveHistoryEntry(entry: HistoryEntry, index: SearchIndexEntry[]) {
    const source = index.find(s => s.restaurant.id === entry.restaurantId && !s.restaurant.isComingSoon);
    if (!source)
        return null;
    if (entry.kind === "menu-item") {
        const item = source.items.find(i => i.id === entry.refId);
        return item ? { name: item.name, image: item.image, imagePresentation: item.imagePresentation, item, restaurant: source.restaurant, href: `/restaurant/${source.restaurant.id}/${toItemSlug(item)}` } : null;
    }
    const entree = source.entreeBuilders.find(e => e.entreeId === entry.refId);
    return entree ? { name: entree.option.label, image: entree.option.image, imagePresentation: undefined, item: null, restaurant: source.restaurant, href: `/restaurant/${source.restaurant.id}?${new URLSearchParams({ entree: entree.entreeId, view: "ingredients" })}` } : null;
}
// Check source fields before the UI normalizer turns missing values into zero.
export function hasCompleteDefaultNutrition(item: import("@/types/menu").MenuItem) {
    const variants = item.variants ?? [];
    const variant = variants.find(v => v.id === item.defaultVariantId) ?? variants[0];
    const base = variants.find(v => v.id !== variant?.id);
    const source = variant && Number.isFinite(variant.nutritionMultiplier)
        ? { ...(base?.nutrition ?? item.nutrition), ...variant.nutrition }
        : variant?.nutrition ?? item.nutrition;
    return !getNutritionDataQuality(source).isPartial;
}
