import Image from "next/image";
import type { IngredientItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type BuilderIngredientResultRowProps = {
  ingredient: IngredientItem;
  restaurant: RestaurantIndexEntry;
  categoryLabel: string;
  isActive: boolean;
  onSelect: (ingredient: IngredientItem, restaurant: RestaurantIndexEntry) => void;
  // Only passed when this row is rendered inside a "Recently Searched" list
  // (nav panel and hero) — same X control/interaction as RestaurantResultRow.
  onRemoveRecent?: () => void;
};

// Visually distinct from MenuItemResultRow (amber accent + "Build" badge) —
// builder ingredients are never standalone menu items and only ever offer
// "Start a Build," never View Item or Quick Add.
export default function BuilderIngredientResultRow({
  ingredient,
  restaurant,
  categoryLabel,
  isActive,
  onSelect,
  onRemoveRecent,
}: BuilderIngredientResultRowProps) {
  return (
    <li
      role="option"
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 border-l-2 border-amber-400 bg-amber-50/50 px-4 py-3 text-sm text-neutral-700 transition hover:bg-amber-50 ${
        isActive ? "bg-amber-50" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(ingredient, restaurant)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        {ingredient.image ? (
          <Image src={ingredient.image} alt="" width={36} height={36} className="object-contain rounded-md" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-neutral-900">{ingredient.name}</span>
        <span className="block truncate text-xs text-neutral-500">
          {restaurant.name} · {categoryLabel} · {ingredient.nutrition.calories} cal
        </span>
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        Build
      </span>
      {onRemoveRecent ? (
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-neutral-400 cursor-pointer transition hover:bg-amber-100 hover:text-neutral-700"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveRecent();
          }}
          aria-label={`Remove ${ingredient.name} from recent searches`}
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="m7 7 10 10M17 7 7 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </li>
  );
}
