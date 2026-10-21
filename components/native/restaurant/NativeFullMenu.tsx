"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORY_ICONS } from "@/data/menuCategoryIcons";
import { filterMenuItems, getRankedChildCategories, RANKED_ALL_FILTER_KEYS, type RankedAllFilterKey } from "@/lib/menuSections/filtering";
import { applyRestaurantMenuSectionOrder, getCategoryLabel, getItemCategories, getOrderedMenuSections } from "@/lib/menuSections/sorting";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import {
  applyNutritionFilters, countNutritionFilters, metricLabel, naturalDirection, parseMetric, rankMenuItems,
  type FullMenuDirection, type FullMenuLayout, type FullMenuMetric,
} from "@/lib/native/fullMenu";
import type { RestaurantData } from "@/types/restaurant";
import { Layers3 } from "lucide-react";
import NativeActiveFilterChips, { type ActiveChip } from "./NativeActiveFilterChips";
import NativeFiltersSheet, { type MenuFilterState, type MenuPreset } from "./NativeFiltersSheet";
import NativeFullMenuHeader from "./NativeFullMenuHeader";
import NativeMenuControlsRow from "./NativeMenuControlsRow";
import NativeMenuItemRow from "./NativeMenuItemRow";
import NativeMenuItemTile from "./NativeMenuItemTile";
import { useNativeQuickAdd } from "./useNativeQuickAdd";

const MAIN = "__main";
const ALL = "__all";
const LAYOUT_KEY = "native-full-menu-layout";

export default function NativeFullMenu({ restaurantData }: { restaurantData: RestaurantData }) {
  const { id, name, logo, items } = restaurantData;
  const params = useSearchParams();
  const { open, add } = useNativeQuickAdd(id);
  const standalone = useMemo(() => items.filter(isStandaloneMenuItem), [items]);

  const presets = useMemo<MenuPreset[]>(() => {
    const options = getRankedChildCategories(standalone);
    const selections = Object.fromEntries(RANKED_ALL_FILTER_KEYS.map((key) => [key, new Set<string>(key === "main-entrees" ? options[key] : [])])) as Record<RankedAllFilterKey, Set<string>>;
    const main = filterMenuItems({ items: standalone, filters: {}, searchTerms: [], rankedChildSelections: selections, isRankingView: true });
    const sections = applyRestaurantMenuSectionOrder(getOrderedMenuSections(standalone, "menu"), id, "menu").map((section) => ({
      id: section,
      label: getCategoryLabel(section, "menu"),
      icon: CATEGORY_ICONS[section] ?? Layers3,
      items: standalone.filter((item) => getItemCategories(item).includes(section)),
    })).filter((p) => p.items.length > 0);
    return [
      ...(main.length ? [{ id: MAIN, label: "Main menu", icon: Layers3, items: main }] : []),
      ...sections,
      { id: ALL, label: "All items", icon: Layers3, items: standalone },
    ];
  }, [id, standalone]);

  const defaultPresetId = presets[0]?.id ?? ALL;
  const requestedCategory = params.get("category");
  const [filters, setFilters] = useState<MenuFilterState>(() => ({
    presetId: presets.some((p) => p.id === requestedCategory) ? (requestedCategory as string) : defaultPresetId,
    nutrition: {},
  }));
  const [metric, setMetric] = useState<FullMenuMetric>(() => parseMetric(params.get("pick")));
  const [direction, setDirection] = useState<FullMenuDirection>(() => naturalDirection(parseMetric(params.get("pick"))));
  const [layout, setLayout] = useState<FullMenuLayout>("rows");
  const [sheetOpen, setSheetOpen] = useState(false);
  const filtersButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try { if (localStorage.getItem(LAYOUT_KEY) === "grid") setLayout("grid"); } catch { /* storage unavailable */ }
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  const changeLayout = (next: FullMenuLayout) => {
    setLayout(next);
    try { localStorage.setItem(LAYOUT_KEY, next); } catch { /* storage unavailable */ }
  };

  const preset = presets.find((p) => p.id === filters.presetId) ?? presets[0];
  const ranked = useMemo(() => rankMenuItems(applyNutritionFilters(preset?.items ?? [], filters.nutrition), metric, direction), [preset, filters.nutrition, metric, direction]);
  const hasFiber = useMemo(() => standalone.some((item) => typeof getDefaultMenuItemNutrition(item).fiber === "number"), [standalone]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [metric, direction, filters]);

  const dirLabel = direction === "high" ? "Highest first" : "Lowest first";
  const filterCount = countNutritionFilters(filters.nutrition) + (filters.presetId !== defaultPresetId ? 1 : 0);
  const n = filters.nutrition;
  const setNutrition = (patch: Partial<typeof n>) => setFilters((f) => ({ ...f, nutrition: { ...f.nutrition, ...patch } }));
  const chips: ActiveChip[] = [
    ...(filters.presetId !== defaultPresetId && preset ? [{ key: "preset", label: preset.label, onRemove: () => setFilters((f) => ({ ...f, presetId: defaultPresetId })) }] : []),
    ...(n.caloriesMax !== undefined ? [{ key: "cal", label: `Under ${n.caloriesMax} cal`, onRemove: () => setNutrition({ caloriesMax: undefined }) }] : []),
    ...(n.proteinMin !== undefined ? [{ key: "protein", label: `Protein ${n.proteinMin}g+`, onRemove: () => setNutrition({ proteinMin: undefined }) }] : []),
    ...(n.scoreMin !== undefined ? [{ key: "score", label: `Protein Score ${n.scoreMin}+`, onRemove: () => setNutrition({ scoreMin: undefined }) }] : []),
  ];
  const reset = () => setFilters({ presetId: defaultPresetId, nutrition: {} });

  return (
    <div className="min-h-[var(--app-viewport-height)] bg-slate-50 pt-[calc(var(--safe-area-top)+52px)]">
      <NativeFullMenuHeader restaurantId={id} name={name} logo={logo} />
      <NativeMenuControlsRow
        metric={metric}
        direction={direction}
        layout={layout}
        filterCount={filterCount}
        hasFiber={hasFiber}
        filtersButtonRef={filtersButton}
        onMetric={(next) => { setMetric(next); setDirection(naturalDirection(next)); }}
        onToggleDirection={() => setDirection((d) => (d === "high" ? "low" : "high"))}
        onLayout={changeLayout}
        onOpenFilters={() => setSheetOpen(true)}
      />
      <div className="mx-5 mb-[10px] mt-[14px] flex min-h-7 items-center gap-[10px]">
        <p className="shrink-0 text-[13px] text-slate-600"><b className="font-bold text-slate-950">{ranked.length}</b> of {preset?.items.length ?? 0} · {dirLabel}</p>
        <NativeActiveFilterChips chips={chips} onClearAll={reset} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{ranked.length} items, ranked by {metricLabel(metric)}, {dirLabel.toLowerCase()}</p>
      <main className="pb-[var(--native-nav-clearance)]">
        {ranked.length === 0 ? (
          <div className="mx-5 my-10 flex flex-col items-center gap-2 text-center">
            <p className="text-base font-bold text-slate-900">No items match these filters</p>
            <button type="button" onClick={reset} className="min-h-11 text-sm font-semibold text-accent-strong focus-ring">Reset filters</button>
          </div>
        ) : (
          <ul role="list" className={layout === "rows" ? "flex flex-col gap-[10px] px-[18px]" : "grid grid-cols-2 gap-[10px] px-[18px] [grid-template-columns:repeat(2,minmax(0,1fr))]"}>
            {ranked.map((item, index) => {
              const Card = layout === "rows" ? NativeMenuItemRow : NativeMenuItemTile;
              return <Card key={item.id ?? item.name} item={item} rank={index + 1} onOpen={() => open(item)} onAdd={() => add(item)} />;
            })}
          </ul>
        )}
      </main>
      {sheetOpen ? (
        <NativeFiltersSheet
          presets={presets}
          defaultPresetId={defaultPresetId}
          applied={filters}
          onApply={setFilters}
          onClose={() => { setSheetOpen(false); requestAnimationFrame(() => filtersButton.current?.focus()); }}
        />
      ) : null}
    </div>
  );
}
