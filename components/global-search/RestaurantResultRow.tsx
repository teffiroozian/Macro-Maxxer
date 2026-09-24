import Image from "next/image";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { getRestaurantLogoShapeClassName } from "@/lib/restaurantPresentation";
import RemoveRecentSearchButton from "@/components/global-search/RemoveRecentSearchButton";

type RestaurantResultRowProps = {
  restaurant: RestaurantIndexEntry;
  isActive: boolean;
  imageClassName?: string;
  onSelect: (restaurant: RestaurantIndexEntry) => void;
  onRemoveRecent?: (restaurantId: string) => void;
};

// Single restaurant result row, shared between the homepage hero search
// and (from Slice 2 onward) the global search overlay/panel.
export default function RestaurantResultRow({
  restaurant,
  isActive,
  imageClassName = "object-contain rounded-md",
  onSelect,
  onRemoveRecent,
}: RestaurantResultRowProps) {
  return (
    <li
      role="option"
      aria-selected={isActive}
      aria-disabled={Boolean(restaurant.isComingSoon)}
      className={`flex items-center gap-3 px-4 py-2 text-sm transition ${
        !restaurant.isComingSoon
          ? `cursor-pointer text-slate-700 hover:bg-surface-hover ${isActive ? "bg-surface-hover" : ""}`
          : "cursor-default text-slate-400"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!restaurant.isComingSoon) {
          onSelect(restaurant);
        }
      }}
    >
      <span className={`flex h-8 w-8 items-center justify-center overflow-hidden bg-slate-50 ${
        getRestaurantLogoShapeClassName()
      }`}>
        <Image
          src={restaurant.logo}
          alt=""
          width={24}
          height={24}
          className={imageClassName}
        />
      </span>
      <span className="font-semibold text-slate-900">
        {restaurant.name}
      </span>
      {restaurant.isComingSoon ? (
        <span className="ml-auto rounded-full border border-slate-300 px-2 py-0.5 text-label">
          Coming Soon
        </span>
      ) : null}
      {onRemoveRecent ? (
        <RemoveRecentSearchButton
          label={`Remove ${restaurant.name} from recent searches`}
          onRemove={() => onRemoveRecent(restaurant.id)}
          className="ml-auto"
        />
      ) : null}
    </li>
  );
}
