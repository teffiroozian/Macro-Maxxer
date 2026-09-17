import type { LucideIcon } from "lucide-react";
import { CupSoda, Droplets, SquarePlus, ToggleLeft, Utensils, UtensilsCrossed } from "lucide-react";
import type { CartSummaryGroup, CartSummaryGroupKind } from "@/lib/cart/displayLabels";
import { CHIPOTLE_CATEGORY_ICONS } from "@/components/restaurant-view/chipotle/categoryIcons";

// Reuses the same category icons already established for these concepts
// elsewhere (RestaurantView/ChipotleRestaurantBuilderView's CATEGORY_ICONS)
// so this summary row's icons read as the same visual language as the rest
// of the app rather than a one-off set invented for this row. Single source
// of truth for both the full cart card and the cart drawer's compact card,
// plus CartItemPreviewContent's section headings.
export const summaryIconByKind: Record<CartSummaryGroupKind, LucideIcon> = {
  mainItem: UtensilsCrossed,
  side: SquarePlus,
  drink: CupSoda,
  sauce: ToggleLeft,
  dressing: Droplets,
  customization: Utensils,
};

type CartCustomizationSummarySize = "compact" | "default";

type CartCustomizationSummaryProps = {
  groups: CartSummaryGroup[];
  size?: CartCustomizationSummarySize;
  className?: string;
};

const sizeStyles: Record<CartCustomizationSummarySize, { text: string; icon: string; dot: string }> = {
  default: { text: "text-sm text-neutral-500", icon: "h-3.5 w-3.5 text-neutral-400", dot: "text-neutral-300" },
  compact: { text: "text-xs text-slate-500", icon: "h-3 w-3 text-slate-400", dot: "text-slate-300" },
};

// Single-line, icon-tagged customization summary shared by the full cart
// item card and the cart drawer's compact card. Each icon + label
// are wrapped in their own inline-flex box (items-center) rather than relying
// on `align-middle` against the text baseline directly — that's what keeps
// the icon vertically centered against the label instead of sitting a touch
// high/low depending on font metrics.
export default function CartCustomizationSummary({ groups, size = "default", className }: CartCustomizationSummaryProps) {
  if (groups.length === 0) return null;
  const styles = sizeStyles[size];

  return (
    <span className={["block min-w-0 truncate", styles.text, className].filter(Boolean).join(" ")}>
      {groups.map((group, index) => {
        const Icon = summaryIconByKind[group.kind];
        if (group.inlineItems) {
          return group.inlineItems.map((item, itemIndex) => {
            const CategoryIcon = CHIPOTLE_CATEGORY_ICONS[item.category];
            const previousCategory = group.inlineItems?.[itemIndex - 1]?.category;
            const showCategoryIcon = Boolean(CategoryIcon) && item.category !== previousCategory;
            const startsNewCategory = itemIndex > 0 && item.category !== previousCategory;

            return (
              <span key={`${item.category}-${item.label}-${itemIndex}`} className="inline-flex items-center align-middle leading-none">
                {(index > 0 && itemIndex === 0) || startsNewCategory ? (
                  <span className={`mx-1.5 ${styles.dot}`}>·</span>
                ) : itemIndex > 0 ? (
                  <span className={`mr-1 ${styles.dot}`}>,</span>
                ) : null}
                {showCategoryIcon && CategoryIcon ? <CategoryIcon className={`mr-1 shrink-0 ${styles.icon}`} strokeWidth={2.25} /> : null}
                <span>{item.label}</span>
              </span>
            );
          });
        }
        return (
          <span key={`${group.kind}-${group.label}-${index}`} className="inline-flex items-center align-middle leading-none">
            {index > 0 ? <span className={`mx-1.5 ${styles.dot}`}>·</span> : null}
            <Icon className={`mr-1 shrink-0 ${styles.icon}`} strokeWidth={2.25} />
            <span>{group.label}</span>
          </span>
        );
      })}
    </span>
  );
}
