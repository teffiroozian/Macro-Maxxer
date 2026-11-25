import { Ellipsis, Plus } from "lucide-react";
import type { SavedMeal } from "@/lib/native/homeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import SavedMacros from "./SavedMacros";
import SavedPhoto, { leadItem } from "./SavedPhoto";
import SavedPlace from "./SavedPlace";
import { addCircle, card, muted } from "./savedStyles";

export default function SavedMealCard({ meal, restaurants, onOpen, onMenu, onAdd }: {
  meal: SavedMeal;
  restaurants: RestaurantIndexEntry[];
  onOpen: () => void;
  onMenu: () => void;
  onAdd: () => void;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[28px] ${card}`}>
      <button type="button" aria-label={`View ${meal.name}`} onClick={onOpen} className="block w-full cursor-pointer rounded-[28px] text-left active:bg-slate-50 dark:active:bg-surface-hover focus-ring">
        <SavedPhoto item={leadItem(meal.items)} className="h-[190px] w-full" />
        <span className="block px-[18px] pb-[18px] pt-4">
          <span className="block truncate pr-12 font-heading text-lg font-bold leading-6 tracking-[-0.02em]">{meal.name}</span>
          <SavedPlace items={meal.items} restaurants={restaurants} withCount className={`mt-1 pr-12 text-sm ${muted}`} />
          <SavedMacros items={meal.items} size="md" className="mt-4" />
        </span>
      </button>
      <button type="button" aria-label={`More for ${meal.name}`} onClick={onMenu} className="absolute right-2.5 top-2.5 flex size-11 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-900"><Ellipsis size={19} strokeWidth={2.4} aria-hidden="true" /></span>
      </button>
      <button type="button" aria-label={`Add ${meal.name} to order`} onClick={onAdd} className="absolute right-3 top-[206px] flex size-11 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring">
        <span className={`size-10 ${addCircle}`}><Plus size={19} strokeWidth={2.8} aria-hidden="true" /></span>
      </button>
    </article>
  );
}
