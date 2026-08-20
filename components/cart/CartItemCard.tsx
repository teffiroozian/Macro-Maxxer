"use client";

import { useMemo } from "react";
import type { MouseEventHandler } from "react";
import { Pencil, Trash2 } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import MacroStat from "@/components/nutrition/MacroStat";
import MenuItemTitle from "@/components/menu-item-card/MenuItemTitle";
import QuantityStepper from "@/components/QuantityStepper";
import CartControlButton from "@/components/cart/CartControlButton";
import CartCustomizationSummary from "@/components/cart/CartCustomizationSummary";
import { buildCartItemSummaryGroups } from "@/lib/cart/displayLabels";
import { getCartItemCoreMacros } from "@/lib/cart/itemAccessors";
import type { CartItem } from "@/types/cart";

// Re-exported for CartItemPreviewContent's section headings, which import it
// from here — CartCustomizationSummary is the single source of truth.
export { summaryIconByKind } from "@/components/cart/CartCustomizationSummary";

type CartItemCardProps = {
  cartItem: CartItem;
  displayName: string;
  isEditLoading: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

export default function CartItemCard({
  cartItem,
  displayName,
  isEditLoading,
  onPreview,
  onEdit,
  onIncrement,
  onDecrement,
}: CartItemCardProps) {
  const quantityMultiplier = Math.max(cartItem.quantity, 1);
  const coreMacros = getCartItemCoreMacros(cartItem);
  const displayCalories = coreMacros.calories * quantityMultiplier;
  const displayProtein = coreMacros.protein * quantityMultiplier;
  const displayCarbs = coreMacros.carbs * quantityMultiplier;
  const displayFat = coreMacros.totalFat * quantityMultiplier;
  const summaryGroups = useMemo(() => buildCartItemSummaryGroups(cartItem), [cartItem]);
  // Quantity 1 is one decrement away from removal, so that step swaps the
  // stepper's own minus button for a trash icon rather than adding a second
  // control next to it — colored the same neutral tone as the plus button
  // (via currentColor) rather than a destructive red, per feedback that the
  // red read as overpowering for a routine, one-tap-reversible action.
  const isRemoveStep = cartItem.quantity <= 1;

  // The card itself is a plain clickable region (mouse-only convenience) so
  // the whole non-interactive area — image, padding, whitespace — opens
  // Preview, not just the name/macro block below. Keyboard access still
  // comes from that block's own role="button" (kept as-is), so the outer
  // element intentionally has no role/tabIndex of its own — nesting real
  // <button>s (edit, quantity) inside an outer role="button" would be an
  // invalid/confusing ARIA structure. `focus-within` picks up the hover-ish
  // affordance whenever any of those inner controls has keyboard focus.
  const handleCardClick = () => onPreview();
  const handleEditClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onEdit();
  };
  const handleIncrement: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onIncrement();
  };
  const handleDecrement: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    onDecrement();
  };

  return (
    <SurfaceCard
      as="li"
      padding="none"
      radius="large"
      shadow="none"
      onClick={handleCardClick}
      className="cursor-pointer overflow-hidden border-black/10 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition hover:border-black/20 hover:shadow-[0_4px_16px_rgba(15,23,42,0.1)] focus-within:border-black/20 focus-within:shadow-[0_4px_16px_rgba(15,23,42,0.1)]"
    >
      <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-5 lg:flex-row">
        <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-image-placeholder lg:w-[184px]">
          {cartItem.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cartItem.image}
              alt={displayName}
              className="block h-[190px] w-full object-contain p-3 lg:h-[184px] lg:w-[184px]"
            />
          ) : (
            <div className="h-[190px] w-full lg:h-[184px] lg:w-[184px]" />
          )}
        </div>

        {/* Content order (name, macros, divider, summary, controls) is
            deliberately identical at every breakpoint — unlike the standard
            menu item card, cart controls never share a row with the name. */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            aria-label={`View details for ${displayName}`}
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onPreview();
            }}
            className="flex cursor-pointer flex-col gap-3 rounded-lg text-left outline-none transition-opacity duration-100 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <MenuItemTitle
              name={displayName}
              className="font-heading text-[22px] leading-[1.15] font-bold tracking-tight text-neutral-900 sm:text-[26px]"
            />

            <div className="flex flex-wrap items-end gap-x-6 gap-y-3 lg:gap-x-8">
              <MacroStat macroKey="calories" value={displayCalories} labelVariant="uppercase" size="card" />
              <MacroStat macroKey="protein" value={displayProtein} labelVariant="uppercase" size="card" />
              <MacroStat macroKey="carbs" value={displayCarbs} labelVariant="uppercase" size="card" />
              <MacroStat macroKey="totalFat" value={displayFat} labelVariant="uppercase" size="card" />
            </div>

            <div className="border-t border-black/[0.06]" aria-hidden="true" />

            <CartCustomizationSummary groups={summaryGroups} />
          </div>

          {/* mt-auto only when there's no summary line to anchor against —
              on lg: the content column stretches to match the image's fixed
              height (flex row default align-items:stretch), so with no
              summary, the actions would otherwise float right under the
              divider instead of at the bottom. With a summary line present,
              the column's natural content already reaches close to the
              bottom, so actions stay directly beneath it as before. */}
          <div
            className={`flex items-center justify-end gap-2 ${summaryGroups.length === 0 ? "mt-auto" : ""}`}
          >
            <CartControlButton
              aria-label={`Customize ${displayName}`}
              title="Customize"
              onClick={handleEditClick}
              disabled={isEditLoading}
              className="disabled:cursor-wait"
            >
              {isEditLoading ? <span className="text-[10px] font-semibold">...</span> : <Pencil className="h-4 w-4" strokeWidth={2.5} />}
            </CartControlButton>

            <QuantityStepper
              variant="cartLine"
              value={cartItem.quantity}
              onDecrement={handleDecrement}
              onIncrement={handleIncrement}
              decrementLabel={isRemoveStep ? `Remove ${displayName} from cart` : `Decrease quantity of ${displayName}`}
              incrementLabel={`Increase quantity of ${displayName}`}
              decrementContent={isRemoveStep ? <Trash2 className="h-4 w-4" strokeWidth={2.5} /> : "−"}
            />
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
