"use client";
import { useMemo, useRef, useState } from "react";
import restaurantIndex from "@/data/restaurants/index.json";
import { resolvePanelIngredientTabs } from "@/lib/itemDetails/ingredientResolution";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { IngredientItem, ItemVariant, MenuItem, ResolvedAddonGroups, RestaurantCustomizationRules } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import NativeComboPicker from "./NativeComboPicker";
import NativeCustomizeGroupList, { type CustomizeHandlers } from "./NativeCustomizeGroup";
import NativeItemHero from "./NativeItemHero";
import NativeMealDetails from "./NativeMealDetails";
import NativeMealTypePicker from "./NativeMealTypePicker";
import NativeNutritionFactsSheet from "./NativeNutritionFactsSheet";
import NativeOrderIsland, { MAX_ORDER_QUANTITY } from "./NativeOrderIsland";
import NativeSectionCard from "./NativeSectionCard";
import NativeVariantRail from "./NativeVariantRail";
import {
  buildCustomizeGroups, buildMealAdjustments, changeCount, changeLabel, toMacros,
  type CustomizeState, type MealRow,
} from "./nativeItemModel";

export type NativeItemComboState = {
  eligible: boolean;
  comboType: "just-item" | "combo-meal";
  onComboTypeChange: (next: "just-item" | "combo-meal") => void;
  sides: MenuItem[];
  drinks: MenuItem[];
  bundles: MenuItem[];
  selectedSideId?: string;
  selectedDrinkId?: string;
  selectedBundleId?: string;
  selectedSideVariantId?: string;
  selectedDrinkVariantId?: string;
  selectedSide?: MenuItem;
  selectedDrink?: MenuItem;
  selectedSideVariant?: ItemVariant;
  selectedDrinkVariant?: ItemVariant;
  selectedBundle?: MenuItem;
  onSelectSide: (id: string) => void;
  onSelectDrink: (id: string) => void;
  onSelectBundle: (id: string) => void;
  onSelectSideVariant: (id: string) => void;
  onSelectDrinkVariant: (id: string) => void;
};

export type NativeItemDetailsProps = {
  restaurantId: string;
  restaurantName: string;
  item: MenuItem;
  addons?: ResolvedAddonGroups;
  ingredients?: IngredientItem[];
  menuItems?: MenuItem[];
  customizationRules?: RestaurantCustomizationRules;
  variants?: ItemVariant[];
  selectedVariantId?: string;
  selectedVariant?: ItemVariant;
  onSelectVariant: (id: string) => void;
  image?: string;
  baseNutrition: Nutrition;
  nutrition: Nutrition;
  quantity: number;
  onQuantityChange: (next: number) => void;
  isEditing: boolean;
  combo: NativeItemComboState;
  ingredientCounts: Record<string, number>;
  selectedAddons: Partial<Record<string, MenuItem>>;
  sauceCounts: Record<string, number>;
  customizeHandlers: CustomizeHandlers;
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit: () => void;
  onRemove?: () => void;
  onBack: () => void;
};

export default function NativeItemDetails(p: NativeItemDetailsProps) {
  const { item, combo } = p;
  const [factsOpen, setFactsOpen] = useState(false);
  const factsTrigger = useRef<HTMLElement | null>(null);
  // Snapshot of the starting configuration (the saved cart item when editing).
  const [baselineCounts] = useState(() => ({ ...p.ingredientCounts }));
  const [baselineSauceCounts] = useState(() => ({ ...p.sauceCounts }));
  const [baselineAddonNames] = useState(() => Object.fromEntries(Object.entries(p.selectedAddons).map(([k, v]) => [k, v?.name])));
  const [savedMacros] = useState(() => toMacros(p.nutrition));

  const logo = (restaurantIndex as { id: string; logo: string }[]).find((r) => r.id === p.restaurantId)?.logo;

  const tabs = useMemo(
    () => resolvePanelIngredientTabs(item, p.ingredients, p.addons, p.menuItems, p.variants, p.selectedVariantId, p.customizationRules),
    [item, p.addons, p.customizationRules, p.ingredients, p.menuItems, p.selectedVariantId, p.variants],
  );
  const state: CustomizeState = {
    tabs, item, addons: p.addons, ingredientCounts: p.ingredientCounts, baselineCounts,
    selectedAddons: p.selectedAddons, sauceCounts: p.sauceCounts, baselineAddonNames, baselineSauceCounts,
  };
  const groups = buildCustomizeGroups(state);
  const adjustments = buildMealAdjustments(state);

  const showVariants = Boolean(p.variants && p.variants.length >= 2 && (!item.hideVariantSelector || item.variantGroupKind === "component"));
  const isCombo = combo.eligible && combo.comboType === "combo-meal";

  const mealRows: MealRow[] = [];
  if (isCombo) {
    const row = (option: MenuItem | undefined, variant: ItemVariant | undefined): MealRow[] =>
      option ? [{ key: option.id ?? option.name, name: `${variant && (option.variants?.length ?? 0) > 1 ? `${variant.label} ` : ""}${option.name}`, image: variant?.image ?? option.image, macros: toMacros(resolveMenuItemVariantNutrition(option, variant)) }] : [];
    if (combo.selectedBundle) mealRows.push(...row(combo.selectedBundle, undefined));
    mealRows.push(...row(combo.selectedSide, combo.selectedSideVariant), ...row(combo.selectedDrink, combo.selectedDrinkVariant));
  }

  const perItem = toMacros(p.nutrition);
  const baselineMacros = p.isEditing ? savedMacros : toMacros(p.baseNutrition);
  const title = `${item.name}${isCombo ? " Meal" : ""}`;
  const subtitle = [
    p.selectedVariant ? `w/ ${p.selectedVariant.label}` : "",
    isCombo && !combo.selectedBundle
      ? [`${combo.selectedSideVariant && (combo.selectedSide?.variants?.length ?? 0) > 1 ? `${combo.selectedSideVariant.label} ` : ""}${combo.selectedSide?.name ?? ""}`.trim(), combo.selectedDrink?.name].filter(Boolean).join(" · ")
      : "",
  ].filter(Boolean).join(" · ");

  const sections: { key: string; title: string; aside?: string; node: React.ReactNode }[] = [];
  if (showVariants) {
    sections.push({ key: "options", title: "Options", node: <NativeVariantRail item={item} variants={p.variants!} selectedId={p.selectedVariantId} onSelect={p.onSelectVariant} fallbackImage={p.image} /> });
  }
  if (combo.eligible) {
    sections.push({ key: "meal", title: "Make it a Meal?", node: <NativeMealTypePicker comboType={combo.comboType} onChange={combo.onComboTypeChange} itemImage={p.image} sideImage={combo.selectedSideVariant?.image ?? combo.selectedSide?.image} drinkImage={combo.selectedDrinkVariant?.image ?? combo.selectedDrink?.image} /> });
    if (isCombo) {
      sections.push({ key: "sidedrink", title: "Side & Drink", node: (
        <NativeComboPicker
          sides={combo.sides} drinks={combo.drinks} bundles={combo.bundles}
          sideProps={{ selectedId: combo.selectedSideId, selectedVariantId: combo.selectedSideVariantId, onSelect: combo.onSelectSide, onSelectVariant: combo.onSelectSideVariant }}
          drinkProps={{ selectedId: combo.selectedDrinkId, selectedVariantId: combo.selectedDrinkVariantId, onSelect: combo.onSelectDrink, onSelectVariant: combo.onSelectDrinkVariant }}
          selectedBundleId={combo.selectedBundleId} onSelectBundle={combo.onSelectBundle}
        />) });
    }
  }
  if (groups.length > 0) {
    sections.push({ key: "customize", title: "Customize", aside: changeLabel(changeCount(groups)), node: <NativeCustomizeGroupList groups={groups} handlers={p.customizeHandlers} /> });
  }
  sections.push({ key: "details", title: "Meal Details", node: (
    <NativeMealDetails
      nutrition={p.nutrition} baseline={baselineMacros} quantity={p.quantity} isEditing={p.isEditing}
      main={{ key: "main", name: p.selectedVariant ? `${item.name} w/ ${p.selectedVariant.label}` : item.name, image: p.image, macros: toMacros(p.baseNutrition) }}
      mealRows={mealRows} adjustments={adjustments}
      onOpenFacts={() => { factsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFactsOpen(true); }}
      onRemove={p.onRemove}
    />) });

  const closeFacts = () => { setFactsOpen(false); window.setTimeout(() => factsTrigger.current?.focus({ preventScroll: true }), 0); };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#eef2f6]">
      <div className="absolute inset-x-0 top-[calc(var(--safe-area-top)+4px)] z-30 flex items-center justify-between px-4">
        <button type="button" onClick={p.onBack} aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.12)] focus-ring">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="h-full overflow-y-auto overscroll-contain pb-[calc(178px+var(--safe-area-bottom))]">
        <NativeItemHero
          image={p.image} presentation={item.imagePresentation} title={title} subtitle={subtitle}
          restaurantName={p.restaurantName} restaurantLogo={logo} editing={p.isEditing} macros={perItem}
        />
        {sections.map((section, index) => (
          <NativeSectionCard key={section.key} step={index + 1} title={section.title} aside={section.aside}>{section.node}</NativeSectionCard>
        ))}
      </div>
      <NativeOrderIsland
        perItem={perItem} quantity={p.quantity}
        onQuantityChange={(next) => p.onQuantityChange(Math.min(MAX_ORDER_QUANTITY, Math.max(1, next)))}
        label={p.submitLabel} disabled={p.submitDisabled} onSubmit={p.onSubmit}
      />
      <NativeNutritionFactsSheet open={factsOpen} onClose={closeFacts} nutrition={p.nutrition} title={title} subtitle={subtitle} />
    </div>
  );
}
