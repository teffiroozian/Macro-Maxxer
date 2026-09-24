import Image from "@/components/ui/AppImage";
import type { BuilderEntreeOption } from "@/types/builder";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import BuilderResultRow from "@/components/global-search/BuilderResultRow";

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
    <BuilderResultRow
      title={entreeOption.label}
      subtitle={`${restaurant.name} · Customize your own`}
      badgeLabel="Build Your Own"
      image={<Image src={entreeOption.image} alt="" width={36} height={36} className="object-contain rounded-md" />}
      isActive={isActive}
      onSelect={() => onSelect(entreeId, entreeOption, restaurant)}
      onRemoveRecent={onRemoveRecent}
      removeRecentLabel={`Remove ${entreeOption.label} from recent searches`}
    />
  );
}
