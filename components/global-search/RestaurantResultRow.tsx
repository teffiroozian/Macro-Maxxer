import Image from "next/image";
import type { RestaurantIndexEntry } from "@/types/restaurant";

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
          ? `cursor-pointer text-neutral-700 hover:bg-neutral-100 ${isActive ? "bg-neutral-100" : ""}`
          : "cursor-default text-neutral-400"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (!restaurant.isComingSoon) {
          onSelect(restaurant);
        }
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
        <Image
          src={restaurant.logo}
          alt=""
          width={24}
          height={24}
          className={imageClassName}
        />
      </span>
      <span className="font-semibold text-neutral-900">
        {restaurant.name}
      </span>
      {restaurant.isComingSoon ? (
        <span className="ml-auto rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Coming Soon
        </span>
      ) : null}
      {onRemoveRecent ? (
        <button
          type="button"
          className="ml-auto rounded-md p-1 text-neutral-400 cursor-pointer transition hover:bg-neutral-200 hover:text-neutral-700"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveRecent(restaurant.id);
          }}
          aria-label={`Remove ${restaurant.name} from recent searches`}
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
