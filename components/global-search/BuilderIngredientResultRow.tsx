import Image from "@/components/ui/AppImage";
import type { IngredientItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import BuilderResultRow from "@/components/global-search/BuilderResultRow";

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
  const effectiveNutrition = resolveEffectiveIngredientNutrition(ingredient);
  return (
    <BuilderResultRow
      title={ingredient.name}
      subtitle={`${restaurant.name} · ${categoryLabel} · ${effectiveNutrition?.calories ?? 0} cal`}
      badgeLabel="Build"
      image={
        ingredient.image ? (
          <Image src={ingredient.image} alt="" width={36} height={36} className="object-contain rounded-md" />
        ) : null
      }
      isActive={isActive}
      onSelect={() => onSelect(ingredient, restaurant)}
      onRemoveRecent={onRemoveRecent}
      removeRecentLabel={`Remove ${ingredient.name} from recent searches`}
    />
  );
}
