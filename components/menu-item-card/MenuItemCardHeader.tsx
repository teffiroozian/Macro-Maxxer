import type { ReactNode } from "react";
import type { ItemVariant, MenuItem } from "@/types/menu";
import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";
import MenuItemVariantControls from "./MenuItemVariantControls";
import MenuItemTitle from "./MenuItemTitle";
import RankBadge from "./RankBadge";
import ComparativeLabelBadge from "./ComparativeLabelBadge";
import StatusLabelBadge from "./StatusLabelBadge";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";

export default function MenuItemCardHeader({
  item,
  selectedItemImage,
  isCartMode,
  itemImageClassName,
  itemImageBackgroundColor,
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
  itemImageClassName?: string;
  itemImageBackgroundColor?: string;
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
      <RestaurantItemImage
        src={selectedItemImage}
        alt={item.name}
        imagePresentation={item.imagePresentation}
        fallbackClassName={itemImageClassName ?? "object-contain p-3"}
        fallbackBackgroundColor={itemImageBackgroundColor}
        containerClassName="relative h-[190px] w-full shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-image-placeholder lg:mx-0 lg:h-[184px] lg:w-[184px]"
        overlay={
          !isCartMode && hasImageLabel ? (
            <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
              {rank !== null ? <RankBadge rank={rank} /> : null}
              {rank === null && comparativeLabel ? <ComparativeLabelBadge kind={comparativeLabel} /> : null}
              {status ? <StatusLabelBadge status={status} /> : null}
            </div>
          ) : null
        }
      />

      <div className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
        <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0">
          <MenuItemTitle
            name={item.name}
            as={isCartMode ? "div" : "h3"}
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
