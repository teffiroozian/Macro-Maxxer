import type { ReactNode } from "react";
import type { ItemVariant, MenuItem } from "@/types/menu";
import { formatCalories, formatDelta } from "@/lib/menuItemCalculations";
import MenuItemVariantControls from "./MenuItemVariantControls";

export default function MenuItemCardHeader({
  item,
  selectedItemImage,
  isCartMode,
  rankText,
  displayCalories,
  hasActiveCustomization,
  customizationCaloriesDelta,
  quantityMultiplier,
  variants,
  hasVariantDropdown,
  variantSelectorDisabled,
  selectedVariantId,
  selectedVariantLabel,
  onVariantChange,
  cartSummaryLine,
  highProteinIngredientSummaryLine,
  children,
}: {
  item: MenuItem;
  selectedItemImage?: string;
  isCartMode: boolean;
  rankText: string | null;
  displayCalories: number;
  hasActiveCustomization: boolean;
  customizationCaloriesDelta: number;
  quantityMultiplier: number;
  variants: ItemVariant[] | null;
  hasVariantDropdown: boolean;
  variantSelectorDisabled: boolean;
  selectedVariantId: string;
  selectedVariantLabel?: string;
  onVariantChange: (nextVariantId: string) => void;
  cartSummaryLine?: string;
  highProteinIngredientSummaryLine?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="w-full shrink-0 lg:mx-0 lg:w-auto">
        {selectedItemImage ? (
          <img
            className={`block h-[200px] w-full rounded-[14px] bg-[#efefef] object-contain p-2 shadow-[0_0_5px_rgba(0,0,0,0.25)] lg:h-[210px] lg:w-[210px] ${
              isCartMode ? "lg:object-contain lg:p-2" : "lg:object-cover lg:p-0"
            }`}
            src={selectedItemImage}
            alt={item.name}
          />
        ) : (
          <div className="h-[200px] w-full rounded-[14px] bg-[#efefef] lg:h-[210px] lg:w-[210px]" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col self-stretch py-1">
        <div className="flex flex-col gap-2">
        {rankText && (
          <div>
            <div className="inline-block border-b-[5px] border-b-yellow-500 px-1.5 text-xl font-bold">{rankText}</div>
          </div>
        )}
        <div className="text-[26px] leading-[1.05] font-bold sm:text-[30px]">{item.name}</div>
        <div className="flex items-center">
          <div className="inline-flex items-baseline gap-2">
            <div className="text-lg font-bold text-black/50">{formatCalories(displayCalories)} calories</div>
            {hasActiveCustomization ? (
              <span className="text-sm font-bold text-green-600">{formatDelta(customizationCaloriesDelta * quantityMultiplier)}</span>
            ) : null}
          </div>
          {variants && !item.hideVariantSelector ? (
            <MenuItemVariantControls
              itemName={item.name}
              variants={variants}
              selectedVariantId={selectedVariantId}
              selectedVariantLabel={selectedVariantLabel}
              hasVariantDropdown={hasVariantDropdown}
              disabled={variantSelectorDisabled}
              onChange={onVariantChange}
            />
          ) : null}
        </div>
        {isCartMode && cartSummaryLine ? (
          <p className="mt-0.5 truncate text-xs text-black/55">{cartSummaryLine}</p>
        ) : null}
        {!isCartMode && highProteinIngredientSummaryLine ? (
          <p className="mt-0.5 truncate text-[13px] text-black/55">{highProteinIngredientSummaryLine}</p>
        ) : null}
        </div>

        {children}
      </div>
    </>
  );
}
