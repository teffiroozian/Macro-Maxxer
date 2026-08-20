"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import VariantSelector from "@/components/VariantSelector";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { QuickAddEligibility } from "@/lib/search/quickAddEligibility";
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

  const [isAddFeedbackVisible, setIsAddFeedbackVisible] = useState(false);
  const { requestAddItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
  const { close: closeSearch } = useGlobalSearch();

  useEffect(() => {
    if (!isAddFeedbackVisible) return;

    const timeout = window.setTimeout(() => setIsAddFeedbackVisible(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [isAddFeedbackVisible]);

  const macroSegments = [
    { key: "calories", text: `${nutrition.calories} cal`, className: macroColorTokens.calories.valueClassName },
    { key: "protein", text: `${nutrition.protein}g P`, className: macroColorTokens.protein.valueClassName },
    { key: "carbs", text: `${nutrition.carbs}g C`, className: macroColorTokens.carbs.valueClassName },
    { key: "totalFat", text: `${nutrition.totalFat}g F`, className: macroColorTokens.totalFat.valueClassName },
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
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-neutral-700 transition hover:bg-neutral-100 ${
        isActive ? "bg-neutral-100" : ""
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(item, restaurant)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
        <Image src={selectedVariant?.image ?? item.image} alt="" width={36} height={36} className="object-contain rounded-md" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-neutral-900">
          {item.name}
          {canPickVariant && selectedVariant ? ` (${selectedVariant.label})` : ""}
        </span>
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
                  ? "border border-success/50 bg-white text-neutral-900"
                  : "bg-black/90 text-white hover:bg-black"
              }`}
            >
              {isAddFeedbackVisible ? "Added" : "Quick Add"}
            </button>
          </span>
        ) : null}
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
