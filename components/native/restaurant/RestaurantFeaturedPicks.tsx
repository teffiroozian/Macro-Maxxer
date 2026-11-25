import { Drumstick, Flame, Leaf, Sunrise, Wheat, Zap, type LucideIcon } from "lucide-react";
import { card, pressable } from "@/components/native/saved/savedStyles";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { rowKey, rowTitle, type FeaturedPick, type PickReason } from "@/lib/native/restaurantMenu";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import MenuMacros from "./menu/MenuMacros";

const ICONS: Record<PickReason, { Icon: LucideIcon; color: string }> = {
  score: { Icon: Zap, color: "text-accent-strong" },
  protein: { Icon: Drumstick, color: "text-[#c2410c] dark:text-[#f96306]" },
  breakfast: { Icon: Sunrise, color: "text-slate-900 dark:text-slate-50" },
  fiber: { Icon: Leaf, color: "text-[#047857] dark:text-accent-strong" },
  carbs: { Icon: Wheat, color: "text-[#ca8a04] dark:text-[#f9c406]" },
  calories: { Icon: Flame, color: "text-slate-900 dark:text-slate-50" },
};

export default function RestaurantFeaturedPicks({ picks, onOpen }: { picks: FeaturedPick[]; onOpen: (item: MenuItem) => void }) {
  if (!picks.length) return null;
  return (
    <section aria-labelledby="restaurant-picks" className="pt-[18px]">
      <h2 id="restaurant-picks" className="flex h-11 items-center px-5 text-xl font-bold">Featured picks</h2>
      <ul className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[18px] pb-5 pt-3.5 [scroll-padding:0_18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map(({ item, reason, label }) => {
          const { Icon, color } = ICONS[reason];
          const title = rowTitle(item, false);
          const nutrition = getDefaultMenuItemNutrition(item);
          return (
            <li key={rowKey(item)} className="w-[318px] max-w-[86vw] flex-none snap-start">
              <button type="button" onClick={() => onOpen(item)} aria-label={`${label}: ${title}, ${Math.round(nutrition.calories ?? 0)} calories, ${Math.round(nutrition.protein ?? 0)} grams protein`} className={`relative flex w-full cursor-pointer items-center gap-3 rounded-3xl pb-2 pl-2.5 pr-3.5 pt-3.5 text-left focus-ring ${card} ${pressable}`}>
                <span className="absolute -top-[11px] left-4 flex h-6 items-center gap-1 rounded-full bg-surface-card pl-2 pr-2.5 text-xs font-bold text-slate-900 shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_2px_6px_rgb(15_23_42/0.1)] dark:bg-control dark:text-slate-50 dark:shadow-none">
                  <Icon size={12} strokeWidth={2.6} className={`shrink-0 ${color}`} aria-hidden="true" />{label}
                </span>
                <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[18px] dark:bg-image-placeholder" fallback={<CutleryIcon className="size-7 text-slate-400" />} />
                <span className="block min-w-0 flex-1">
                  <span className="block truncate text-base font-bold leading-5 text-slate-900 dark:text-slate-50">{title}</span>
                  <MenuMacros nutrition={nutrition} className="mt-1.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
