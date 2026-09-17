import { ReactNode } from "react";
import { getCartItemCoreMacros } from "@/lib/cart/itemAccessors";
import MacroStat from "@/components/nutrition/MacroStat";
import CartCustomizationSummary from "@/components/cart/CartCustomizationSummary";
import type { CartSummaryGroup } from "@/lib/cart/displayLabels";
import type { CartItem } from "@/types/cart";
import { getRestaurantImagePresentation } from "@/lib/restaurantPresentation";
import { getCartItemImagePresentation } from "@/lib/cart/cartItemLookup";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";

type CartItemPreviewRowProps = {
  item: Pick<CartItem, "name" | "image" | "imagePresentation" | "macrosPerItem" | "nutritionPerItem" | "quantity"> &
    Partial<Pick<CartItem, "restaurantId" | "itemId">>;
  macroStyle?: "compact" | "detailed";
  // Icon-tagged groups (compact CartCustomizationSummary) take precedence
  // over plain customizationsText when both are supplied.
  customizationGroups?: CartSummaryGroup[];
  customizationsText?: string;
  customizationsLineClamp?: 1 | 2;
  imageFallback?: "initial" | "placeholder" | "none";
  imageRenderer?: "next-image" | "native-img";
  actions?: ReactNode;
  className?: string;
  // When supplied, wraps the name/macros/customization block in its own
  // keyboard-focusable role="button" — the caller's surrounding element
  // (e.g. the drawer's SurfaceCard <li>) handles the mouse-only whole-card
  // click, while this inner block is what makes that click target reachable
  // by keyboard without nesting a role="button" around the actions slot's
  // own real <button>s (invalid/confusing ARIA structure — same reasoning
  // as CartItemCard's outer card).
  onActivate?: () => void;
  activateLabel?: string;
};


export default function CartItemPreviewRow({
  item,
  macroStyle = "compact",
  customizationGroups,
  customizationsText,
  customizationsLineClamp = 1,
  imageFallback = "initial",
  imageRenderer = "next-image",
  actions,
  className,
  onActivate,
  activateLabel,
}: CartItemPreviewRowProps) {
  const itemInitial = (item.name?.trim().charAt(0) || "+").toUpperCase();
  const itemImagePresentation =
    item.restaurantId && item.itemId
      ? getCartItemImagePresentation({
          restaurantId: item.restaurantId,
          itemId: item.itemId,
          imagePresentation: item.imagePresentation,
        })
      : item.imagePresentation;
  const restaurantImagePresentation = getRestaurantImagePresentation(item.restaurantId ?? "");
  const quantityMultiplier = Math.max(item.quantity ?? 1, 1);
  const coreMacros = getCartItemCoreMacros(item);
  const displayCalories = coreMacros.calories * quantityMultiplier;
  const displayProtein = coreMacros.protein * quantityMultiplier;
  const displayCarbs = coreMacros.carbs * quantityMultiplier;
  const displayFat = coreMacros.totalFat * quantityMultiplier;
  const customizationClampClass =
    customizationsLineClamp === 2 ? "line-clamp-2" : "line-clamp-1";

  // "detailed" is the cart drawer's own style (the only caller that passes
  // it), so its mobile-specific treatment below is safe to scope without
  // touching "compact" (Just Added popover, ProductWalkthrough).
  const isDetailed = macroStyle === "detailed";

  const infoContent = (
    <>
      <p
        className={
          isDetailed
            ? "break-words text-base font-semibold leading-tight text-slate-900 sm:truncate"
            : "truncate text-base font-semibold leading-tight text-slate-900"
        }
      >
        <span>{item.name}</span>
      </p>

      {macroStyle === "compact" ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-none">
          <MacroStat macroKey="calories" labelVariant="shortLabel" value={displayCalories} size="cartCompact" />
          <MacroStat macroKey="protein" labelVariant="shortLabel" value={displayProtein} size="cartCompact" />
          <MacroStat macroKey="carbs" labelVariant="shortLabel" value={displayCarbs} size="cartCompact" />
          <MacroStat macroKey="totalFat" labelVariant="shortLabel" value={displayFat} size="cartCompact" />
        </div>
      ) : (
        // Same inline value+label row at every breakpoint — matches the
        // compact treatment used elsewhere (e.g. the "compact" branch above)
        // instead of stacking the value above the label on mobile. flex-wrap
        // keeps all four macros on one line when there's room and wraps
        // gracefully when there isn't, rather than a fixed 4-column grid.
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-none">
          <MacroStat macroKey="calories" labelVariant="shortLabel" value={displayCalories} size="cartDetailed" />
          <MacroStat macroKey="protein" labelVariant="lowercase" value={displayProtein} size="cartDetailed" />
          <MacroStat macroKey="carbs" labelVariant="lowercase" value={displayCarbs} size="cartDetailed" />
          <MacroStat macroKey="totalFat" labelVariant="lowercase" value={displayFat} size="cartDetailed" />
        </div>
      )}

      {customizationGroups && customizationGroups.length > 0 ? (
        <CartCustomizationSummary groups={customizationGroups} size="compact" className="mt-1.5" />
      ) : customizationsText ? (
        <p className={`mt-1.5 text-xs text-slate-500 ${customizationClampClass}`}>
          {customizationsText}
        </p>
      ) : null}
    </>
  );

  return (
    <div className={["flex min-w-0 w-full items-start gap-3", className].filter(Boolean).join(" ")}>
      <RestaurantItemImage
        src={item.image}
        alt={item.name}
        imagePresentation={itemImagePresentation}
        fallbackClassName={restaurantImagePresentation.itemThumbnailImageClassName ?? "object-contain p-1"}
        fallbackBackgroundColor={restaurantImagePresentation.imageBackgroundColor}
        containerClassName="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
        renderer={imageRenderer === "next-image" ? "next-image" : "img"}
        sizes="56px"
        fallback={
          imageFallback === "placeholder" ? (
            <div className="h-full w-full bg-slate-200" aria-hidden="true" />
          ) : imageFallback === "initial" ? (
            <div className="inline-flex h-full w-full items-center justify-center text-base font-semibold text-slate-600">
              {itemInitial}
            </div>
          ) : null
        }
      />

      <div className="min-w-0 flex-1">
        {onActivate ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={activateLabel}
            onClick={(event) => {
              event.stopPropagation();
              onActivate();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onActivate();
            }}
            className="cursor-pointer rounded-lg text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            {infoContent}
          </div>
        ) : (
          infoContent
        )}

        {actions ? <div className="mt-3 flex items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
