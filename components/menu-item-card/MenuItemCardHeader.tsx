import type { ReactNode } from "react";
import type { ItemVariant, MenuItem } from "@/types/menu";
import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";
import MenuItemVariantControls from "./MenuItemVariantControls";
import MenuItemTitle from "./MenuItemTitle";
import RankBadge from "./RankBadge";
import ComparativeLabelBadge from "./ComparativeLabelBadge";
import StatusLabelBadge from "./StatusLabelBadge";

export default function MenuItemCardHeader({
  item,
  selectedItemImage,
  isCartMode,
  rank,
  comparativeLabel,
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
  rank: number | null;
  comparativeLabel?: ComparativeLabelKind;
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
  const status = item.status;
  const hasImageLabel = rank !== null || Boolean(comparativeLabel) || Boolean(status);

  return (
    <>
      <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-image-placeholder lg:mx-0 lg:w-auto">
        {selectedItemImage ? (
          <img
            className={`block h-[190px] w-full object-contain p-3 lg:h-[184px] lg:w-[184px] ${
              isCartMode ? "" : "lg:object-cover lg:p-0"
            }`}
            src={selectedItemImage}
            alt={item.name}
          />
        ) : (
          <div className="h-[190px] w-full lg:h-[184px] lg:w-[184px]" />
        )}
        {!isCartMode && hasImageLabel ? (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
            {rank !== null ? <RankBadge rank={rank} /> : null}
            {rank === null && comparativeLabel ? <ComparativeLabelBadge kind={comparativeLabel} /> : null}
            {status ? <StatusLabelBadge status={status} /> : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
        <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0">
          <MenuItemTitle
            name={item.name}
            className="font-heading text-[22px] leading-[1.15] font-bold tracking-tight text-neutral-900 sm:text-[26px]"
          />
          {variants && !item.hideVariantSelector ? (
            <div className="mt-1">
              <MenuItemVariantControls
                itemName={item.name}
                variants={variants}
                selectedVariantId={selectedVariantId}
                selectedVariantLabel={selectedVariantLabel}
                hasVariantDropdown={hasVariantDropdown}
                disabled={variantSelectorDisabled}
                onChange={onVariantChange}
              />
            </div>
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
