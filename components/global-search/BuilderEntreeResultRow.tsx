import Image from "@/components/ui/AppImage";
import type { BuilderEntreeOption } from "@/types/builder";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type BuilderEntreeResultRowProps = {
  entreeId: string;
  entreeOption: BuilderEntreeOption;
  restaurant: RestaurantIndexEntry;
  isActive: boolean;
  onSelect: (entreeId: string, entreeOption: BuilderEntreeOption, restaurant: RestaurantIndexEntry) => void;
  // Only passed when this row is rendered inside a "Recently Searched" list
  // (nav panel and hero) — same X control/interaction as RestaurantResultRow.
  onRemoveRecent?: () => void;
};

// Same amber accent + badge treatment as BuilderIngredientResultRow — a BYO
// entree/build result (e.g. Chipotle's Bowl, Burrito, Quesadilla) launches a
// customization flow rather than adding a fixed product, so it never offers
// View Item or Quick Add.
export default function BuilderEntreeResultRow({
  entreeId,
  entreeOption,
  restaurant,
  isActive,
  onSelect,
  onRemoveRecent,
}: BuilderEntreeResultRowProps) {
  return (
    <li
      role="option"
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 border-l-2 border-amber-400 bg-amber-50/50 px-4 py-3 text-sm text-neutral-700 transition hover:bg-amber-50 ${
        isActive ? "bg-amber-50" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(entreeId, entreeOption, restaurant)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
        <Image src={entreeOption.image} alt="" width={36} height={36} className="object-contain rounded-md" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-neutral-900">{entreeOption.label}</span>
        <span className="block truncate text-xs text-neutral-500">{restaurant.name} · Customize your own</span>
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        Build Your Own
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
          aria-label={`Remove ${entreeOption.label} from recent searches`}
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
