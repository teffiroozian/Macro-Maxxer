import type { ReactNode } from "react";
import type { ItemVariant, MenuItem } from "@/types/menu";
import type { ComparativeLabelKind } from "@/lib/menuSections/comparativeLabels";
import MenuItemVariantControls from "./MenuItemVariantControls";
import MenuItemTitle from "./MenuItemTitle";
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
  resultLayout = "list",
  proteinScoreOverlay,
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
  resultLayout?: "list" | "grid";
  proteinScoreOverlay?: ReactNode;
}) {
  const status = item.status;
  const hasImageLabel = Boolean(comparativeLabel) || Boolean(status);
  const normalizedVariantLabel = selectedVariantLabel
    ?.trim()
    .replace(/\b(\d+)\s*(?:ct|count)\b/gi, "$1 ct");
  const itemNameIncludesVariant = Boolean(
    normalizedVariantLabel &&
    (item.name.toLocaleLowerCase().includes(normalizedVariantLabel.toLocaleLowerCase()) ||
      (selectedVariantLabel && item.name.toLocaleLowerCase().includes(selectedVariantLabel.toLocaleLowerCase()))),
  );
  const rankedListDisplayName = normalizedVariantLabel && !itemNameIncludesVariant
    ? `${item.name} (${normalizedVariantLabel})`
    : item.name;
  const gridCountLabel = normalizedVariantLabel;
  const gridCountValue = normalizedVariantLabel?.match(/^(\d+)\s+ct$/i)?.[1];
  const gridBaseName = gridCountValue
    ? item.name
        .replace(new RegExp(`\\s*\\(?${gridCountValue}\\s*(?:ct|count)\\)?`, "i"), "")
        .trim()
    : item.name;
  const rankedDisplayName = resultLayout === "grid" && gridCountLabel
    ? `${gridCountLabel} ${gridBaseName}`
    : rankedListDisplayName;

  return (
    <>
      <RestaurantItemImage
        src={selectedItemImage}
        alt={item.name}
        imagePresentation={item.imagePresentation}
        fallbackClassName={itemImageClassName ?? "object-contain p-3"}
        fallbackBackgroundColor={itemImageBackgroundColor}
        containerClassName={rank !== null
          ? resultLayout === "grid"
            ? "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/[0.06] bg-image-placeholder lg:aspect-[2/1] lg:h-auto lg:w-full lg:rounded-2xl"
            : "relative h-[175px] w-full shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-image-placeholder lg:h-[184px] lg:w-[184px]"
          : "relative h-[190px] w-full shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-image-placeholder lg:mx-0 lg:h-[184px] lg:w-[184px]"}
        overlay={
          !isCartMode && (hasImageLabel || proteinScoreOverlay) ? (
            <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
              {proteinScoreOverlay}
              {comparativeLabel ? <ComparativeLabelBadge kind={comparativeLabel} /> : null}
              {status ? <StatusLabelBadge status={status} /> : null}
            </div>
          ) : null
        }
      />

      <div className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
        <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0">
          {rank !== null ? (
            <h3
              className={`font-heading flex min-w-0 items-baseline gap-1.5 font-bold tracking-tight text-slate-900 ${resultLayout === "grid" ? "text-base leading-[1.2] lg:text-xl" : "text-xl leading-[1.15] lg:text-2xl"}`}
              title={resultLayout === "grid" ? `${rank}. ${rankedDisplayName}` : undefined}
            >
              <span className="shrink-0 text-slate-400">{rank}.</span>
              <span className="truncate">{rankedDisplayName}</span>
            </h3>
          ) : (
            <MenuItemTitle name={item.name} as={isCartMode ? "div" : "h3"} className="font-heading text-card-title text-slate-900" />
          )}
          {rank === null && variants && !item.hideVariantSelector ? (
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
