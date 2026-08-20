"use client";

import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import QuantityStepper from "@/components/QuantityStepper";
import PresetHeaderPillButton from "@/components/item-route-modal/PresetHeaderPillButton";

export type ItemModalStickyFooterState =
    | {
          mode: "preview";
          quantity: number;
          itemName: string;
          onIncrementQuantity: () => void;
          onDecrementQuantity: () => void;
          // Omitted when there's no separate customize view to jump into
          // (e.g. a brand-new standard item, which opens straight into the
          // full customize form).
          onCustomize?: () => void;
          customizeLabel?: string;
          primaryLabel: string;
          onPrimaryAction: () => void;
      }
    | {
          mode: "customize";
          onBackToOverview: () => void;
          backLabel?: string;
          onSaveChanges: () => void;
          saveLabel?: string;
      };

// Single sticky footer for the item-route modal, covering both the
// pre-built Build Your Own preset flow and the cart-item edit flow — the
// two used to hand-roll visually divergent footers; this is now the one
// shared implementation both read from, with only labels/handlers varying
// by state.
export default function ItemModalStickyFooter({
    macros,
    state,
}: {
    macros: { calories: number; protein: number; carbs: number; totalFat: number };
    state: ItemModalStickyFooterState;
}) {
    return (
        <div
            className="flex h-fit shrink-0 flex-col gap-3 border-t border-black/[0.06] bg-white px-4 pt-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8"
            style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
        >
            <MacroTotalsGrid
                macros={macros}
                size="panel"
                className="w-full justify-between gap-2 sm:gap-3 lg:!w-fit lg:justify-start"
                itemClassName="px-2 py-0.5"
                labelClassName="text-[#64748b]"
            />
            {/* Mobile: an equal-width grid, so a lone primary button never
                balloons to consume most of the footer while the stepper
                stays tiny next to it. sm+: reverts to the original natural-
                width flex row (unequal, content-sized controls), matching
                the pre-built Build Your Own footer's existing desktop look.

                Preview and Customize are given distinct `key`s (both on the
                wrapper and on each button) so switching between them is a
                full unmount/mount of a fresh subtree rather than React
                patching props onto whichever old button happens to land at
                the same child index. Without that, e.g. the old "Customize"
                button (secondary/soft) and the new "Save Changes" button
                (primary/solid) are the same component type at the same
                position, so React reuses that one DOM node and animates its
                own `transition` class across the style change instead of
                swapping to the correct look immediately. */}
            {state.mode === "customize" ? (
                <div
                    key="footer-actions-customize"
                    className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 lg:w-auto"
                >
                    <PresetHeaderPillButton
                        key="back-to-overview"
                        icon={ArrowLeft}
                        onClick={state.onBackToOverview}
                        className="w-full sm:w-auto sm:shrink-0"
                    >
                        {state.backLabel ?? "Back to Overview"}
                    </PresetHeaderPillButton>
                    <PresetHeaderPillButton
                        key="save-changes"
                        tone="solid"
                        onClick={state.onSaveChanges}
                        className="w-full sm:w-auto sm:flex-1"
                    >
                        {state.saveLabel ?? "Save Changes"}
                    </PresetHeaderPillButton>
                </div>
            ) : (
                <div
                    key="footer-actions-preview"
                    className={`grid w-full gap-1.5 sm:flex sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 lg:w-auto ${
                        state.onCustomize ? "grid-cols-3" : "grid-cols-2"
                    }`}
                >
                    <QuantityStepper
                        key="quantity"
                        variant="modalPill"
                        value={state.quantity}
                        onDecrement={state.onDecrementQuantity}
                        onIncrement={state.onIncrementQuantity}
                        decrementLabel={`Decrease quantity of ${state.itemName}`}
                        incrementLabel={`Increase quantity of ${state.itemName}`}
                        className="w-full sm:w-auto"
                    />
                    {state.onCustomize ? (
                        <PresetHeaderPillButton
                            key="customize"
                            icon={SlidersHorizontal}
                            onClick={state.onCustomize}
                            className="w-full sm:w-auto sm:shrink-0"
                        >
                            {state.customizeLabel ?? "Customize"}
                        </PresetHeaderPillButton>
                    ) : null}
                    <PresetHeaderPillButton
                        key="primary-action"
                        tone="solid"
                        onClick={state.onPrimaryAction}
                        className="w-full sm:w-auto sm:min-w-0 sm:flex-1"
                    >
                        {state.primaryLabel}
                    </PresetHeaderPillButton>
                </div>
            )}
        </div>
    );
}
