"use client";
import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import RestaurantView from "@/components/RestaurantView";
import RestaurantIdentityHeader from "@/components/restaurant-view/RestaurantIdentityHeader";
import { filterMenuItems, getRankedChildCategories, RANKED_ALL_FILTER_KEYS, type RankedAllFilterKey } from "@/lib/menuSections/filtering";
import { SORT_OPTION_VALUES, type SortOption } from "@/lib/menuSections/sortOptions";
import {
  applyRestaurantMenuSectionOrder,
  categorySectionId,
  countItemsByCategory,
  getCategoryLabel,
  getItemCategories,
  getOrderedMenuSections,
  sortItems,
} from "@/lib/menuSections/sorting";
import { isStandaloneMenuItem } from "@/lib/menuItemCalculations";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { ResolvedAddonGroups } from "@/types/menu";
import type { RestaurantData } from "@/types/restaurant";
import NativeFullMenu from "./NativeFullMenu";
import NativeCategoryBrowser, { type NativeCategory } from "./NativeCategoryBrowser";
import NativeRestaurantCover from "./NativeRestaurantCover";
import NativeRestaurantTopBar from "./NativeRestaurantTopBar";
import NativeTopPicks, { type TopPick } from "./NativeTopPicks";
import { useCoverScrolled } from "./useCoverScrolled";

const PICKS: { key: string; sort: SortOption; title: string; description: string }[] = [
  { key: "protein-score", sort: SORT_OPTION_VALUES.BEST_RATIO, title: "Protein Score", description: "Most protein per 100 calories" },
  { key: "highest-protein", sort: SORT_OPTION_VALUES.HIGHEST_PROTEIN, title: "Highest Protein", description: "Most grams of protein" },
  { key: "lowest-calories", sort: SORT_OPTION_VALUES.LOWEST_CALORIES, title: "Lowest Calories", description: "Fewest calories first" },
];

function formatUpdated(lastUpdated?: string) {
  if (!lastUpdated) return undefined;
  const date = new Date(lastUpdated);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function MenuMode({ restaurantData, addons, category }: { restaurantData: RestaurantData; addons: ResolvedAddonGroups | undefined; category: string | null }) {
  useEffect(() => {
    if (!category) return;
    const timer = window.setTimeout(() => {
      const section = document.getElementById(categorySectionId(category));
      if (section) window.scrollTo({ top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - 140) });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [category]);
  return (
    <main className="native-nav-page mx-auto w-full max-w-6xl px-3 pb-12">
      <RestaurantIdentityHeader
        restaurantId={restaurantData.id}
        name={restaurantData.name}
        logo={restaurantData.logo}
        description={restaurantData.description}
        itemCount={restaurantData.items.length}
        nutritionSourceUrl={restaurantData.nutritionSourceUrl}
        lastUpdated={restaurantData.lastUpdated}
      />
      <RestaurantView
        restaurantId={restaurantData.id}
        restaurantName={restaurantData.name}
        restaurantLogo={restaurantData.logo}
        hasBuildYourOwn={restaurantData.hasBuildYourOwn}
        items={restaurantData.items}
        ingredients={restaurantData.ingredients}
        addons={addons}
        customizationRules={restaurantData.customizationRules}
        builderConfig={restaurantData.builderConfig}
      />
    </main>
  );
}

export default function NativeRestaurantPage({ restaurantData, addons }: { restaurantData: RestaurantData; addons: ResolvedAddonGroups | undefined }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const scrolled = useCoverScrolled(barRef);
  const { id, items } = restaurantData;

  const standalone = useMemo(() => items.filter(isStandaloneMenuItem), [items]);

  const picks = useMemo<TopPick[]>(() => {
    const options = getRankedChildCategories(standalone);
    const selections = Object.fromEntries(
      RANKED_ALL_FILTER_KEYS.map((key) => [key, new Set<string>(key === "main-entrees" ? options[key] : [])]),
    ) as Record<RankedAllFilterKey, Set<string>>;
    const pool = filterMenuItems({ items: standalone, filters: {}, searchTerms: [], rankedChildSelections: selections, isRankingView: true })
      .filter((item) => typeof getDefaultMenuItemNutrition(item).calories === "number");
    return PICKS.map(({ sort, ...pick }) => ({ ...pick, items: sortItems(pool, sort, "menu").slice(0, 3) })).filter((pick) => pick.items.length > 0);
  }, [standalone]);

  const categories = useMemo<NativeCategory[]>(() => {
    const ordered = applyRestaurantMenuSectionOrder(getOrderedMenuSections(standalone, "menu"), id, "menu");
    const counts = countItemsByCategory(standalone);
    const defaultOrder = sortItems(standalone, SORT_OPTION_VALUES.DEFAULT_ORDER, "menu");
    return ordered.map((section) => ({
      id: section,
      label: getCategoryLabel(section, "menu"),
      count: counts[section] ?? 0,
      items: defaultOrder.filter((item) => getItemCategories(item).includes(section)),
    })).filter((category) => category.items.length > 0);
  }, [id, standalone]);

  const menuHref = (params: Record<string, string>) => {
    const next = new URLSearchParams({ menu: "1", ...params });
    return `${pathname}?${next.toString()}`;
  };

  if (searchParams.get("menu") === "1") {
    // Builder restaurants keep the existing builder view.
    if (restaurantData.hasBuildYourOwn) return <MenuMode restaurantData={restaurantData} addons={addons} category={searchParams.get("category")} />;
    return <NativeFullMenu restaurantData={restaurantData} />;
  }

  const cover = restaurantData.cover?.includes("/brand/cover") ? restaurantData.cover : undefined;

  return (
    <>
      <NativeRestaurantTopBar barRef={barRef} scrolled={scrolled} name={restaurantData.name} logo={restaurantData.logo} />
      <main className="native-top-level-page min-h-[var(--app-viewport-height)] bg-slate-50 pb-[var(--native-nav-clearance)]">
        <NativeRestaurantCover name={restaurantData.name} logo={restaurantData.logo} cover={cover} itemCount={items.length} updatedLabel={formatUpdated(restaurantData.lastUpdated)} />
        <NativeTopPicks
          restaurantId={id}
          picks={picks}
          onSeeAll={(key) => router.push(menuHref({ view: "ranking", pick: key }))}
        />
        <NativeCategoryBrowser
          restaurantId={id}
          categories={categories}
          onSeeAll={(categoryId) => router.push(menuHref({ category: categoryId }))}
        />
      </main>
    </>
  );
}
