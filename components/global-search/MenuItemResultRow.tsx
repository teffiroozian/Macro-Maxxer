import Image from "next/image";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type MenuItemResultRowProps = {
  item: MenuItem;
  restaurant: RestaurantIndexEntry;
  isActive: boolean;
  onSelect: (item: MenuItem, restaurant: RestaurantIndexEntry) => void;
  // Only passed when this row is rendered inside a "Recently Searched" list
  // (nav panel and hero) — same X control/interaction as RestaurantResultRow.
  onRemoveRecent?: () => void;
};

export default function MenuItemResultRow({
  item,
  restaurant,
  isActive,
  onSelect,
  onRemoveRecent,
}: MenuItemResultRowProps) {
  const nutrition = getDefaultMenuItemNutrition(item);

  const macroSegments = [
    { key: "calories", text: `${nutrition.calories} cal`, className: macroColorTokens.calories.valueClassName },
    { key: "protein", text: `${nutrition.protein}g P`, className: macroColorTokens.protein.valueClassName },
    { key: "carbs", text: `${nutrition.carbs}g C`, className: macroColorTokens.carbs.valueClassName },
    { key: "totalFat", text: `${nutrition.totalFat}g F`, className: macroColorTokens.totalFat.valueClassName },
  ];

  return (
    <li
      role="option"
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-100 ${
        isActive ? "bg-neutral-100" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item, restaurant)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
        <Image src={item.image} alt="" width={36} height={36} className="object-contain rounded-md" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-neutral-900">{item.name}</span>
        {/* Below `lg`, restaurant name and macros stack; at `lg`+ they share
            one row (name left, macros right) since there's more width. */}
        <span className="mt-0.5 flex flex-col lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
          <span className="min-w-0 truncate text-xs text-neutral-500">{restaurant.name}</span>
          <span className="mt-0.5 whitespace-nowrap text-xs font-semibold lg:mt-0 lg:shrink-0">
            {macroSegments.map((segment, index) => (
              <span key={segment.key}>
                {index > 0 ? <span className="font-normal text-neutral-300"> · </span> : null}
                <span className={segment.className}>{segment.text}</span>
              </span>
            ))}
          </span>
        </span>
      </span>
      {onRemoveRecent ? (
        <button
          type="button"
          className="ml-auto shrink-0 rounded-md p-1 text-neutral-400 cursor-pointer transition hover:bg-neutral-200 hover:text-neutral-700"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveRecent();
          }}
          aria-label={`Remove ${item.name} from recent searches`}
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
