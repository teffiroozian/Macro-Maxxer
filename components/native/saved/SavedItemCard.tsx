import { Plus } from "lucide-react";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import type { SavedItem } from "@/lib/native/homeCollections";
import { customizationLine } from "@/lib/native/savedLibrary";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import SavedMacros from "./SavedMacros";
import SavedPhoto from "./SavedPhoto";
import SavedPlace from "./SavedPlace";
import { addCircle, card, muted, pressable, soft } from "./savedStyles";

export default function SavedItemCard({ entry, restaurants, onOpen, onAdd }: {
  entry: SavedItem;
  restaurants: RestaurantIndexEntry[];
  onOpen: () => void;
  onAdd: () => void;
}) {
  const name = formatCartItemName(entry.item);
  return (
    <article className="relative">
      <button type="button" aria-label={`View ${name}, ${customizationLine(entry.item)}`} onClick={onOpen} className={`flex w-full cursor-pointer items-center gap-3.5 rounded-3xl p-3 text-left focus-ring ${card} ${pressable}`}>
        <SavedPhoto item={entry.item} className="h-28 w-[92px] shrink-0 rounded-[18px]" />
        <span className="block min-w-0 flex-1">
          <SavedPlace items={[entry.item]} restaurants={restaurants} className={`pr-10 text-[13px] font-semibold ${soft}`} />
          <span className="mt-[5px] block truncate pr-9 text-base font-bold leading-5">{name}</span>
          <span className={`mt-0.5 block truncate text-sm leading-[18px] ${muted}`}>{customizationLine(entry.item)}</span>
          <SavedMacros items={[entry.item]} size="sm" className="mt-2.5" />
        </span>
      </button>
      <button type="button" aria-label={`Add ${name} to order`} onClick={onAdd} className="absolute right-1.5 top-1.5 flex size-11 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring">
        <span className={`size-9 ${addCircle}`}><Plus size={17} strokeWidth={2.8} aria-hidden="true" /></span>
      </button>
    </article>
  );
}
