"use client";

import { useEffect, useMemo, useState } from "react";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatMacroDisplayNumber } from "@/components/nutrition/macroDisplay";
import VariantSelector from "@/components/VariantSelector";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { QuickAddEligibility } from "@/lib/search/quickAddEligibility";
import type { MenuItem } from "@/types/menu";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { getRestaurantImagePresentation } from "@/lib/restaurantPresentation";
import { getMenuItemSearchResultName } from "@/lib/search/resultLabels";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import RemoveRecentSearchButton from "@/components/global-search/RemoveRecentSearchButton";

type MenuItemResultRowProps = {
  item: MenuItem;
  restaurant: RestaurantIndexEntry;
  isActive: boolean;
  onSelect: (item: MenuItem, restaurant: RestaurantIndexEntry) => void;
  // Only passed when this row is rendered inside a "Recently Searched" list
  // (nav panel and hero) — same X control/interaction as RestaurantResultRow.
  onRemoveRecent?: () => void;
  // Undefined (e.g. builder-ingredient-only searches never reach this row,
  // but a defensive default keeps this row Quick-Add-free) is treated as
  // ineligible — never show Quick Add without a confirmed eligibility check.
  quickAdd?: QuickAddEligibility;
};

export default function MenuItemResultRow({
  item,
  restaurant,
  isActive,
  onSelect,
  onRemoveRecent,
  quickAdd,
}: MenuItemResultRowProps) {
  const variants = item.variants?.length ? item.variants : null;
  const restaurantImagePresentation = getRestaurantImagePresentation(restaurant.id);
  const canPickVariant = Boolean(quickAdd?.eligible && quickAdd.hasVariantChoice && variants);

  const defaultVariantId = useMemo(() => {
    if (!variants) return undefined;
    if (item.defaultVariantId && variants.some((variant) => variant.id === item.defaultVariantId)) {
      return item.defaultVariantId;
    }
    return variants[0]?.id;
  }, [item.defaultVariantId, variants]);

  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId);
  const selectedVariant = variants?.find((variant) => variant.id === selectedVariantId) ?? variants?.[0];

  const nutrition = resolveMenuItemVariantNutrition(item, selectedVariant);
  const resultName = getMenuItemSearchResultName({
    itemName: item.name,
    restaurantId: restaurant.id,
    variantLabel: selectedVariant?.label,
    showVariant: canPickVariant,
  });

  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const { requestAddItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
  const { close: closeSearch } = useGlobalSearch();

  useEffect(() => {
    if (!isAddFeedbackVisible) return;

    const timeout = window.setTimeout(() => setIsAddFeedbackVisible(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [isAddFeedbackVisible]);

  const macroSegments = [
    { key: "calories", text: `${formatMacroDisplayNumber(nutrition.calories)} cal`, className: macroColorTokens.calories.valueClassName },
    { key: "protein", text: `${formatMacroDisplayNumber(nutrition.protein)}g P`, className: macroColorTokens.protein.valueClassName },
    { key: "carbs", text: `${formatMacroDisplayNumber(nutrition.carbs)}g C`, className: macroColorTokens.carbs.valueClassName },
    { key: "totalFat", text: `${formatMacroDisplayNumber(nutrition.totalFat)}g F`, className: macroColorTokens.totalFat.valueClassName },
  ];

  const handleQuickAdd = () => {
    if (isAddFeedbackVisible) return;

    const itemKey = item.id ?? item.name;
    const matchingCartItem = getMatchingItem({
      restaurantId: restaurant.id,
      itemId: itemKey,
      variantId: selectedVariant?.id,
    });

    if (matchingCartItem) {
      updateQuantity(matchingCartItem.id, matchingCartItem.quantity + 1, { markAsJustAdded: true });
      // Same "merges into an existing identical line" case as MenuItemCard's
      // Quick Add — still a genuine add, tracked with quantity 1 (this
      // click's delta), not the line's resulting total.
      trackAddToCart(getCartItemAddToCartAnalytics(matchingCartItem, 1));
      setIsAddFeedbackVisible(true);
      closeSearch();
      return;
    }

    const payload = buildStandardCartItemPayload({
      item,
      selectedVariant,
      quantity: 1,
      nutritionPerItem: nutrition,
    });

    // requestAddItem only invokes this callback once the item is actually in
    // the cart — a cross-restaurant conflict holds it in a confirmation
    // dialog instead (see CartAddConfirmationContext), so the search stays
    // open/unchanged until the add truly succeeds.
    requestAddItem(
      {
        id: crypto.randomUUID(),
        restaurantId: restaurant.id,
        itemId: itemKey,
        ...payload,
      },
      () => {
        setIsAddFeedbackVisible(true);
        closeSearch();
      }
    );
  };

  return (
    <li
      role="option"
      aria-selected={isActive}
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-surface-hover ${
        isActive ? "bg-slate-100" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item, restaurant)}
    >
      <RestaurantItemImage
        src={selectedVariant?.image ?? item.image}
        alt=""
        imagePresentation={item.imagePresentation}
        fallbackClassName={restaurantImagePresentation.itemThumbnailImageClassName ?? "object-contain rounded-md"}
        fallbackBackgroundColor={restaurantImagePresentation.imageBackgroundColor}
        containerClassName="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50"
        renderer="next-image"
        width={36}
        height={36}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">
          {resultName}
        </span>
        {/* Below `lg`, restaurant name and macros stack; at `lg`+ they share
            one row (name left, macros right) since there's more width. */}
        <span className="mt-0.5 flex flex-col lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
          <span className="min-w-0 truncate text-xs text-slate-500">{restaurant.name}</span>
          <span className="mt-0.5 whitespace-nowrap text-xs font-semibold lg:mt-0 lg:shrink-0">
            {macroSegments.map((segment, index) => (
              <span key={segment.key}>
                {index > 0 ? <span className="font-normal text-slate-300"> · </span> : null}
                <span className={segment.className}>{segment.text}</span>
              </span>
            ))}
          </span>
        </span>
        {quickAdd?.eligible ? (
          <span
            className="mt-2 flex flex-wrap items-center gap-2"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {canPickVariant && variants ? (
              <VariantSelector
                variants={variants}
                selectedId={selectedVariantId ?? variants[0].id}
                onChange={setSelectedVariantId}
                ariaLabel={`${item.name} portion size`}
                compact
                dense
              />
            ) : null}
            <button
              type="button"
              disabled={isAddFeedbackVisible}
              onClick={handleQuickAdd}
              className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition ${
                isAddFeedbackVisible
                  ? "bg-slate-800 text-white opacity-70"
                  : "bg-black/90 text-white hover:bg-black"
              }`}
            >
              {isAddFeedbackVisible ? "Added" : "Quick Add"}
            </button>
          </span>
        ) : null}
      </span>
      {onRemoveRecent ? (
        <RemoveRecentSearchButton
          label={`Remove ${item.name} from recent searches`}
          onRemove={onRemoveRecent}
          className="ml-auto"
        />
      ) : null}
    </li>
  );
}
