"use client";
import { useCallback, useMemo, useState } from "react";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";
import {
  getIngredientCategoryMaxSelections, getProteinMultiplier, getSplitExtraMultiplier, normalizeIngredientCategory,
  resolveChipotleTacoShellForIngredientId, resolveIncludedIngredientIds, resolveLockedIncludedIngredientIds,
  type ChipotleBuildConfiguration, type ChipotleBuilderConfig, type ChipotleKidsMealId, type ChipotleTacoCount,
  type ChipotleTacoShell, type ProteinPortionMode, type SplitPortionMode,
} from "@/lib/restaurantBuilders/chipotle";
import { toUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";
import { buildChipotleIngredientMenuItems } from "@/lib/restaurantBuilders/chipotle/ingredientMenuItems";
import type { CartItem } from "@/types/cart";
import type { IngredientItem, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

// The bases a person builds; the rest of the Chipotle menu is ready-made.
export const BUILD_ENTREES = ["bowl", "burrito", "quesadilla", "salad", "tacos", "kids-meal"] as const;
export type BuildEntree = (typeof BUILD_ENTREES)[number];
export const isBuildEntree = (value: string | null): value is BuildEntree => BUILD_ENTREES.includes(value as BuildEntree);

export const READY_MADE_GROUPS = ["high-protein-menu", "chips-sides", "drinks"] as const;
export type ReadyMadeGroup = (typeof READY_MADE_GROUPS)[number];
export const isReadyMadeGroup = (value: string | null): value is ReadyMadeGroup => READY_MADE_GROUPS.includes(value as ReadyMadeGroup);

export type PortionOption = { id: string; label: string };
export type PortionControl = { options: PortionOption[]; selected: string; disabled: boolean };
export type BuildSection = { id: string; title: string; hint?: string; items: MenuItem[]; max?: number };

type BuildState = {
  kidsMeal: ChipotleKidsMealId;
  shell: ChipotleTacoShell;
  count: ChipotleTacoCount;
  proteinMode: ProteinPortionMode;
  portions: Record<string, SplitPortionMode>;
  picks: string[];
  removed: string[];
};

const INITIAL: BuildState = { kidsMeal: "build-your-own", shell: "crispy", count: 3, proteinMode: "normal", portions: {}, picks: [], removed: [] };

const PROTEIN_OPTIONS: PortionOption[] = [{ id: "normal", label: "Normal" }, { id: "double", label: "Double" }];
const SPLIT_OPTIONS: PortionOption[] = [{ id: "light", label: "Light" }, { id: "normal", label: "Normal" }, { id: "extra", label: "Extra" }];
const SECTION_ORDER = ["included ingredients", "proteins", "rice", "beans", "toppings", "side"];
const SECTION_TITLES: Record<string, string> = { proteins: "Protein", rice: "Rice", beans: "Beans", toppings: "Toppings", side: "Side" };
const LABEL_KEYS = ["calories", "totalFat", "satFat", "transFat", "cholesterol", "sodium", "carbs", "fiber", "sugars", "protein"] as const;

export const categoryOf = (item: Pick<MenuItem, "categories">) => normalizeIngredientCategory(resolvePrimaryCategory(item.categories));

const titleCase = (text: string) => text.trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
const splitMultiplier = (mode: SplitPortionMode | undefined) => (mode === "light" ? 0.5 : mode === "extra" ? getSplitExtraMultiplier() : 1);

export function nutritionOf(item: MenuItem): Nutrition {
  const variant = item.defaultVariantId ? item.variants?.find((value) => value.id === item.defaultVariantId) : undefined;
  return variant?.nutrition ?? item.nutrition;
}

// Same selection rules, portions and totals as the web builder
// (ChipotleRestaurantBuilderView), kept as derived state so a base's
// included ingredients never need to be copied in and out of the selection.
export function useChipotleBuild({ restaurantId, entree, ingredients, config }: {
  restaurantId: string;
  entree: BuildEntree;
  ingredients: IngredientItem[];
  config?: ChipotleBuilderConfig;
}) {
  const [state, setState] = useState<BuildState>(INITIAL);
  const { kidsMeal, shell, count, proteinMode, portions } = state;
  const chipotle = config?.chipotle;
  const shellIds = useMemo(() => chipotle?.tacoShellIngredientIds ?? [], [chipotle]);
  const removable = useMemo(() => chipotle?.includedRemovableIngredientIds ?? [], [chipotle]);
  const entreeOption = config?.entreeOptions?.[entree];
  const portionMultiplier = entreeOption?.portionMultiplier ?? 1;
  const shellChoice = entree === "tacos" || (entree === "kids-meal" && kidsMeal === "build-your-own");

  const included = useMemo(
    () => resolveIncludedIngredientIds({ selectedEntree: entree, selectedKidsMeal: kidsMeal, selectedTacoShell: shell, selectedTacoCount: count, builderConfig: config }),
    [entree, kidsMeal, shell, count, config],
  );
  const locked = useMemo(
    () => resolveLockedIncludedIngredientIds({ selectedIncludedIngredientIds: included, includedRemovableIngredientIds: removable, tacoShellIngredientIds: shellIds, context: { selectedEntree: entree, selectedKidsMeal: kidsMeal } }),
    [included, removable, shellIds, entree, kidsMeal],
  );
  const menuOptions = useMemo(() => ({
    restaurantId, ingredients, selectedEntree: entree, selectedTacoCount: count, selectedKidsMeal: kidsMeal,
    selectedIncludedIngredientIds: included, tacoShellIngredientIds: shellIds, builderConfig: config,
  }), [restaurantId, ingredients, entree, count, kidsMeal, included, shellIds, config]);

  // Categories never depend on portions, so one unscaled pass settles them.
  const categories = useMemo(() => new Map(
    buildChipotleIngredientMenuItems({ ...menuOptions, getIngredientPortionMultiplier: () => 1, getSelectedIngredientPortionMultiplier: () => 1 })
      .flatMap((item) => (item.id ? [[item.id, categoryOf(item)] as const] : [])),
  ), [menuOptions]);

  const selectedIds = useMemo(() => {
    const ids = included.filter((id) => categories.has(id) && !state.removed.includes(id));
    for (const id of state.picks) if (categories.has(id) && !ids.includes(id)) ids.push(id);
    return ids;
  }, [included, categories, state.removed, state.picks]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const idsIn = useCallback((category: string) => selectedIds.filter((id) => categories.get(id) === category), [selectedIds, categories]);
  const proteinCount = idsIn("proteins").length;

  const items = useMemo(() => buildChipotleIngredientMenuItems({
    ...menuOptions,
    getIngredientPortionMultiplier: (id?: string) => (!id || entree !== "tacos" ? portionMultiplier : portionMultiplier * (shellIds.includes(id) ? 1 : count / 3)),
    getSelectedIngredientPortionMultiplier: (id: string, category: string) => {
      if (!selected.has(id)) return 1;
      if (category === "proteins") return getProteinMultiplier(proteinMode, proteinCount);
      if ((category === "rice" || category === "beans") && idsIn(category).length >= 2) return 0.5;
      if (category === "rice" || category === "beans" || category === "toppings") return splitMultiplier(portions[id]);
      return 1;
    },
  }), [menuOptions, entree, portionMultiplier, shellIds, count, selected, proteinMode, proteinCount, idsIn, portions]);
  const byId = useMemo(() => new Map(items.flatMap((item) => (item.id ? [[item.id, item] as const] : []))), [items]);

  const sections = useMemo<BuildSection[]>(() => {
    const groups = new Map<string, MenuItem[]>();
    for (const item of items) groups.set(categoryOf(item), [...(groups.get(categoryOf(item)) ?? []), item]);
    const order = [...SECTION_ORDER.filter((id) => groups.has(id)), ...[...groups.keys()].filter((id) => !SECTION_ORDER.includes(id))];
    return order.map((id) => {
      const list = [...(groups.get(id) ?? [])].sort((a, b) => (a.defaultOrder ?? 0) - (b.defaultOrder ?? 0));
      const max = getIngredientCategoryMaxSelections({ category: id, selectedEntree: entree, selectedKidsMeal: kidsMeal, builderConfig: config });
      if (id === "included ingredients") {
        const title = entree === "tacos" ? "Shell" : shellChoice ? "Tortilla" : "Included";
        return { id, title, hint: shellChoice ? "Pick 1" : "Comes with it", items: list };
      }
      return { id, title: SECTION_TITLES[id] ?? titleCase(id), hint: max === 1 ? "Pick 1" : max ? `Up to ${max}` : undefined, items: list, max };
    });
  }, [items, entree, kidsMeal, config, shellChoice]);

  // Each selected ingredient once, at its chosen portion.
  const serving = portionMultiplier;
  const totals = useMemo<Nutrition>(() => {
    const sum = Object.fromEntries(LABEL_KEYS.map((key) => [key, 0])) as Record<(typeof LABEL_KEYS)[number], number>;
    for (const id of selectedIds) {
      const item = byId.get(id);
      if (!item) continue;
      const nutrition = nutritionOf(item);
      for (const key of LABEL_KEYS) sum[key] += (nutrition[key] ?? 0) * serving;
    }
    const rounded = Object.fromEntries(LABEL_KEYS.map((key) => [key, Math.round(sum[key])])) as Nutrition;
    if (entree === "kids-meal" && kidsMeal === "quesadilla") rounded.calories = Math.round(sum.calories / 10) * 10;
    return rounded;
  }, [selectedIds, byId, serving, entree, kidsMeal]);
  const macros = { calories: totals.calories ?? 0, protein: totals.protein ?? 0, carbs: totals.carbs ?? 0, totalFat: totals.totalFat ?? 0 };

  const isLocked = (id: string) => locked.has(id);
  const isShell = (id: string) => shellChoice && shellIds.includes(id);
  const isFull = (id: string) => {
    const category = categories.get(id);
    if (!category || selected.has(id)) return false;
    const max = getIngredientCategoryMaxSelections({ category, selectedEntree: entree, selectedKidsMeal: kidsMeal, builderConfig: config });
    return typeof max === "number" && max > 1 && idsIn(category).length >= max;
  };

  const toggle = (item: MenuItem) => {
    const id = item.id;
    if (!id) return;
    if (isShell(id)) {
      const next = resolveChipotleTacoShellForIngredientId(id, config);
      setState((current) => ({ ...current, shell: next }));
      return;
    }
    if (locked.has(id)) return;
    const category = categories.get(id) ?? categoryOf(item);
    const on = selected.has(id);
    const same = idsIn(category);
    const nextPortions = { ...portions };
    const split = category === "rice" || category === "beans";
    if (on) {
      delete nextPortions[id];
      if (split && same.length === 2) {
        const other = same.find((value) => value !== id);
        if (other) nextPortions[other] = "normal";
      }
    } else if (split || category === "toppings") {
      if (split && same.length === 1) nextPortions[same[0]] = "normal";
      nextPortions[id] = "normal";
    }
    if (included.includes(id)) {
      setState((current) => ({ ...current, portions: nextPortions, removed: on ? [...current.removed, id] : current.removed.filter((value) => value !== id) }));
      return;
    }
    if (on) {
      setState((current) => ({ ...current, portions: nextPortions, picks: current.picks.filter((value) => value !== id) }));
      return;
    }
    const max = getIngredientCategoryMaxSelections({ category, selectedEntree: entree, selectedKidsMeal: kidsMeal, builderConfig: config });
    if (typeof max === "number" && same.length >= max) {
      if (max !== 1) return;
      // A single choice swaps instead of refusing.
      const swapped = same.filter((value) => !included.includes(value));
      setState((current) => ({ ...current, portions: nextPortions, picks: [...current.picks.filter((value) => !swapped.includes(value)), id] }));
      return;
    }
    setState((current) => ({ ...current, portions: nextPortions, picks: [...current.picks, id] }));
  };

  const portionControl = (item: MenuItem): PortionControl | null => {
    const id = item.id;
    if (!id || !selected.has(id)) return null;
    const category = categories.get(id);
    if (category === "proteins") return { options: PROTEIN_OPTIONS, selected: proteinMode, disabled: false };
    if (category === "rice" || category === "beans") {
      const pair = idsIn(category).length >= 2;
      return { options: SPLIT_OPTIONS, selected: pair ? "normal" : portions[id] ?? "normal", disabled: pair };
    }
    if (category === "toppings") return { options: SPLIT_OPTIONS, selected: portions[id] ?? "normal", disabled: false };
    return null;
  };
  const setPortion = (item: MenuItem, value: string) => {
    const id = item.id;
    if (!id) return;
    if (categories.get(id) === "proteins") setState((current) => ({ ...current, proteinMode: value as ProteinPortionMode }));
    else setState((current) => ({ ...current, portions: { ...current.portions, [id]: value as SplitPortionMode } }));
  };
  const portionLabel = (item: MenuItem) => {
    const control = portionControl(item);
    if (!control) return undefined;
    if (control.disabled) return "Half";
    return control.options.find((option) => option.id === control.selected)?.label;
  };

  const setCount = (next: ChipotleTacoCount) => setState((current) => ({ ...current, count: next }));
  const setKidsMeal = (next: ChipotleKidsMealId) => setState((current) => ({ ...current, kidsMeal: next }));
  const clear = () => setState((current) => ({ ...INITIAL, kidsMeal: current.kidsMeal, shell: current.shell, count: current.count }));
  const picked = selectedIds.filter((id) => !locked.has(id)).length;

  const label = entree === "kids-meal" ? (kidsMeal === "quesadilla" ? "Quesadilla" : "Build Your Own") : entreeOption?.label ?? titleCase(entree);
  const proteins = [...new Set(idsIn("proteins").map((id) => titleCase(byId.get(id)?.name ?? "")))].filter(Boolean);
  const proteinName = proteins.length === 0 ? "Veggie" : proteins.length === 1 ? proteins[0] : `${proteins[0]} and ${proteins[1]}`;
  const name = entree === "kids-meal" ? `Kid's ${proteinName} ${label}` : `${proteinName} ${label}`;
  const image = entree === "kids-meal"
    ? chipotle?.kidsMealOptions?.find((option) => option.id === kidsMeal)?.image ?? entreeOption?.image ?? ""
    : entreeOption?.image ?? "";

  const configuration = (): ChipotleBuildConfiguration => ({
    selectedEntree: entree,
    selectedIngredientItems: Object.fromEntries(selectedIds.map((id) => [id, { quantity: 1 }])),
    selectedIngredientVariantIds: Object.fromEntries(selectedIds.flatMap((id) => {
      const variantId = byId.get(id)?.defaultVariantId;
      return variantId ? [[id, variantId]] : [];
    })),
    proteinPortionMode: proteinMode,
    splitPortionModeById: Object.fromEntries(Object.entries(portions).filter(([id]) => selected.has(id))),
    selectedTacoShell: shell,
    selectedTacoCount: count,
    selectedKidsMeal: kidsMeal,
  });
  const cartItem = (quantity: number): CartItem => ({
    id: crypto.randomUUID(),
    restaurantId,
    itemId: `${restaurantId}-build`,
    name,
    image,
    quantity,
    macrosPerItem: macros,
    nutritionPerItem: totals,
    selection: { type: "build-your-own", buildConfiguration: toUniversalChipotleBuildConfiguration(configuration()) },
  });

  return {
    entree, kidsMeal, count, sections, byId, selectedIds, selected, totals, macros, name, image, picked,
    kidsMealOptions: chipotle?.kidsMealOptions ?? [],
    isLocked, isShell, isFull, toggle, portionControl, setPortion, portionLabel, setCount, setKidsMeal, clear, cartItem,
  };
}

export type ChipotleBuild = ReturnType<typeof useChipotleBuild>;
