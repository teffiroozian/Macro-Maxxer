import { Plus } from "lucide-react";
import SavedMacros from "@/components/native/saved/SavedMacros";
import SavedPhoto, { leadItem } from "@/components/native/saved/SavedPhoto";
import SavedPlace from "@/components/native/saved/SavedPlace";
import { addCircle, card, muted, pressable, soft } from "@/components/native/saved/savedStyles";
import type { SavedMeal } from "@/lib/native/homeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import OrderSheet from "./OrderSheet";

export default function OrderMealPicker({ meals, restaurants, onAdd, onClose }: { meals: SavedMeal[]; restaurants: RestaurantIndexEntry[]; onAdd: (meal: SavedMeal) => void; onClose: () => void }) {
  return (
    <OrderSheet title="Choose a saved meal" closeLabel="Cancel" onClose={onClose}>
      {meals.length ? (
        <ul className="flex flex-col gap-2.5">
          {meals.map((meal) => (
            <li key={meal.id}>
              <button type="button" aria-label={`Add ${meal.name} to your order`} onClick={() => onAdd(meal)} className={`flex w-full cursor-pointer items-center gap-3 rounded-3xl p-3 text-left focus-ring ${card} ${pressable}`}>
                <SavedPhoto item={leadItem(meal.items)} className="size-[76px] shrink-0 rounded-[18px]" />
                <span className="block min-w-0 flex-1">
                  <span className="block truncate text-base font-bold leading-5">{meal.name}</span>
                  <SavedPlace items={meal.items} restaurants={restaurants} withCount className={`mt-px text-sm leading-[18px] ${muted}`} />
                  <SavedMacros items={meal.items} size="sm" className="mt-[7px]" />
                </span>
                <span className={`size-9 shrink-0 ${addCircle}`}><Plus size={17} strokeWidth={2.8} aria-hidden="true" /></span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className={`px-4 pb-6 pt-4 text-center text-base leading-[22px] ${soft}`}>No saved meals yet. Build an order, then tap Save meal to keep it here.</p>}
    </OrderSheet>
  );
}
