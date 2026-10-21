import type { IngredientItem } from "@/types/menu";
import type { CoreMacros } from "@/types/nutrition";
import { resolveIncludedIngredientIds, type ChipotleBuilderConfig, type ChipotleEntreeId, type ChipotleKidsMealId, type ChipotleTacoShell } from "@/lib/restaurantBuilders/chipotle";
import { buildChipotleIngredientMenuItems } from "@/lib/restaurantBuilders/chipotle/ingredientMenuItems";

// Presentation only: resolve the same contextual ingredients/default portions
// used by the builder, without changing its selection or calculation state.
export function getEntreeBaseSummary(
  entree: ChipotleEntreeId,
  ingredients: IngredientItem[],
  builderConfig?: ChipotleBuilderConfig,
): { nutrition: CoreMacros | null; description: string } {
  const unavailable = { nutrition: null, description: "Base varies by selection" };
  if (!builderConfig?.entreeOptions?.[entree]) return unavailable;
  if (!["bowl", "burrito", "salad", "tacos", "quesadilla", "kids-meal"].includes(entree)) return unavailable;

  const configurations: { kidsMeal: ChipotleKidsMealId; shell: ChipotleTacoShell }[] =
    entree === "kids-meal"
      ? (builderConfig.chipotle?.kidsMealOptions ?? []).flatMap<{ kidsMeal: ChipotleKidsMealId; shell: ChipotleTacoShell }>(({ id }) =>
          id === "build-your-own"
            ? [{ kidsMeal: id, shell: "crispy" as const }, { kidsMeal: id, shell: "soft" as const }]
            : [{ kidsMeal: id, shell: "soft" as const }],
        )
      : (entree === "tacos" ? ["crispy", "soft"] as const : ["crispy"] as const)
          .map((shell) => ({ kidsMeal: "build-your-own", shell }));
  if (!configurations.length) return unavailable;

  const candidates = configurations.map(({ kidsMeal, shell }) => {
    const ids = resolveIncludedIngredientIds({
      selectedEntree: entree, selectedKidsMeal: kidsMeal,
      selectedTacoShell: shell, selectedTacoCount: 3, builderConfig,
    }).filter((id) => !builderConfig.chipotle?.includedRemovableIngredientIds?.includes(id));
    if (!ids.length && entree !== "bowl") return null;
    const items = buildChipotleIngredientMenuItems({
      restaurantId: "chipotle", ingredients, selectedEntree: entree,
      selectedTacoCount: 3, selectedKidsMeal: kidsMeal,
      selectedIncludedIngredientIds: ids,
      tacoShellIngredientIds: builderConfig.chipotle?.tacoShellIngredientIds ?? [],
      getIngredientPortionMultiplier: () => 1,
      getSelectedIngredientPortionMultiplier: () => 1,
      builderConfig,
    });
    const totals: CoreMacros = { calories: 0, protein: 0, carbs: 0, totalFat: 0 };
    const names: string[] = [];
    for (const id of ids) {
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return null;
      const variant = item.defaultVariantId ? item.variants?.find((value) => value.id === item.defaultVariantId) : undefined;
      if (item.defaultVariantId && !variant) return null;
      const nutrition = variant?.nutrition ?? item.nutrition;
      for (const key of Object.keys(totals) as (keyof CoreMacros)[]) {
        if (!Number.isFinite(nutrition[key])) return null;
        totals[key] += nutrition[key];
      }
      names.push(entree === "tacos" ? `3 ${item.name.toLowerCase()}s` : item.name);
    }
    return { nutrition: totals, description: names.length ? `${entree === "kids-meal" ? `${builderConfig.chipotle?.kidsMealOptions?.find(({ id }) => id === kidsMeal)?.label}: ` : ""}${names.join(" + ")}` : "No required ingredients" };
  });
  // A missing alternative means the minimum cannot be established reliably.
  if (candidates.some((candidate) => !candidate)) return unavailable;
  return candidates.reduce((lowest, candidate) => candidate!.nutrition.calories < lowest!.nutrition.calories ? candidate : lowest)!;
}
