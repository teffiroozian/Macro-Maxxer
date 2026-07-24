import Image from "next/image";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type RestaurantScopeControlProps = {
  restaurant: RestaurantIndexEntry;
  isScoped: boolean;
  onToggle: () => void;
};

// Secondary row beneath the Restaurants / Menu Items tabs (ScopeSwitcher) —
// deliberately quieter than that primary control (plain text + a text
// action, no pill background) so the hierarchy stays: tabs pick the search
// mode, this row narrows Menu Items to one restaurant or all of them.
export default function RestaurantScopeControl({ restaurant, isScoped, onToggle }: RestaurantScopeControlProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-neutral-100 px-5 py-2.5 text-xs text-neutral-500">
      <span className="flex min-w-0 items-center gap-2">
        {isScoped ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-50">
            <Image src={restaurant.logo} alt="" width={14} height={14} className="object-contain" />
          </span>
        ) : null}
        <span className="truncate">
          {isScoped ? (
            <>Searching {restaurant.name}&rsquo;s menu</>
          ) : (
            "Searching all restaurants"
          )}
        </span>
      </span>

      <button
        type="button"
        // Keeps focus on the search input when switching scope — see
        // ScopeSwitcher for why this needs to run on mousedown.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className="shrink-0 cursor-pointer border-l border-neutral-200 pl-2 font-semibold text-neutral-600 transition hover:text-neutral-900 hover:underline"
      >
        {isScoped ? "Switch to all restaurants" : `Back to ${restaurant.name}`}
      </button>
    </div>
  );
}
