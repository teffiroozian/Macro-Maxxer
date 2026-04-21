"use client";

import type { CartMacros } from "@/stores/cartStore";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import type { LucideIcon } from "lucide-react";
import { Bookmark, Camera } from "lucide-react";
import type { ReactNode } from "react";

type StickyMacroTotalsBarProps = {
  totals: CartMacros;
  visible?: boolean;
  inline?: boolean;
  layoutPreset?: "build" | "cart";
  contextLine?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  secondaryActionExpandedLabel?: string;
  PrimaryActionIcon?: LucideIcon;
  SecondaryActionIcon?: LucideIcon;
  SecondaryActionExpandedIcon?: LucideIcon;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  detailsOpen?: boolean;
  detailsContent?: ReactNode;
};

export default function StickyMacroTotalsBar({
  totals,
  visible = true,
  inline = false,
  layoutPreset = "build",
  contextLine,
  primaryActionLabel = "Generate Snapshot",
  secondaryActionLabel = "Save Meal",
  secondaryActionExpandedLabel,
  PrimaryActionIcon = Camera,
  SecondaryActionIcon = Bookmark,
  SecondaryActionExpandedIcon,
  onPrimaryAction,
  onSecondaryAction,
  detailsOpen = false,
  detailsContent,
}: StickyMacroTotalsBarProps) {
  const isCartLayout = layoutPreset === "cart";
  const secondaryButtonText = isCartLayout
    ? detailsOpen && secondaryActionExpandedLabel
      ? secondaryActionExpandedLabel
      : secondaryActionLabel
    : "View Build";
  const primaryButtonText = isCartLayout ? primaryActionLabel : "Add to Cart";

  const wrapperClassName = inline
    ? "w-full"
    : `fixed left-0 right-0 ${
        isCartLayout
          ? "bottom-2 max-w-5xl px-2 sm:bottom-4 sm:px-6"
          : `${detailsOpen && detailsContent ? "top-1 bottom-1" : "bottom-1"} max-w-6xl px-2`
      } mx-auto z-[120] transition-all duration-300 ease-out ${
        visible
          ? "pointer-events-none translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`;

  const panelClassName = inline
    ? `w-full rounded-3xl border border-black/10 bg-white px-4 ${isCartLayout ? "py-4" : "py-3"}`
    : `mx-auto w-full ${
        isCartLayout
          ? "rounded-[1.5rem] border-black/10 px-3 py-4 sm:rounded-[2.25rem] sm:px-6 sm:py-6"
          : "rounded-2xl border-slate-200/70 px-4 py-3 sm:py-4"
      } border bg-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      } ${detailsOpen && detailsContent ? "flex h-full flex-col" : ""}`;

  const contentContainerClassName = `mx-auto w-full max-w-5xl ${
    detailsContent ? "flex min-h-0 flex-1 flex-col" : ""
  }`;

  return (
    <div className={wrapperClassName}>
      <div className={panelClassName}>
        <div className={contentContainerClassName}>
          {detailsContent ? (
            <div
              className={`min-h-0 overflow-hidden transition-[max-height,transform,margin] duration-300 ease-out ${
                detailsOpen ? "mb-4 max-h-full translate-y-0 flex-1" : "mb-0 max-h-0 translate-y-3"
              }`}
            >
              <div className="h-full overflow-y-auto overscroll-contain pr-1">
                {detailsContent}
              </div>
            </div>
          ) : null}
          <div
            className={`shrink-0 flex ${
              isCartLayout
                ? "flex-col gap-5 lg:flex-row lg:items-center lg:gap-8"
                : "flex-col gap-3 md:flex-row md:items-center md:justify-between"
            }`}
          >
            <section className={`${isCartLayout ? "flex-1" : "w-full md:w-auto md:shrink-0"}`}>
              {contextLine ? (
                <p className="text-sm font-medium tracking-tight text-neutral-500">
                  {contextLine}
                </p>
              ) : null}
              {isCartLayout ? (
                <p className={`text-left text-sm font-semibold tracking-tight text-neutral-500 sm:text-center ${contextLine ? "mt-1" : ""}`}>
                  TOTAL MACROS
                </p>
              ) : null}
              <MacroTotalsGrid
                macros={totals}
                variant="bar"
                size={isCartLayout ? "panel" : "compact"}
                className={`${
                  isCartLayout
                    ? "mt-4 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6"
                    : `mt-1 w-full grid-cols-4 gap-x-3 ${contextLine ? "sm:mt-2" : ""} md:w-fit`
                }`}
                labelClassName={`${isCartLayout ? "text-[#1A1A1A]" : "text-[#1A1A1A] !text-[9px] sm:!text-[10px]"}`}
                valueClassName={isCartLayout ? "" : "!text-xl sm:!text-2xl lg:!text-xl"}
              />
            </section>

            <div
              className={`flex gap-2 sm:gap-2.5 ${
                isCartLayout ? "w-full flex-col sm:w-auto" : "w-full shrink-0 flex-row md:w-auto"
              }`}
            >
              <button
                type="button"
                onClick={onSecondaryAction}
                className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border-2 border-black/80 bg-transparent font-semibold text-[#1A1A1A] transition hover:bg-black/5 ${
                  isCartLayout ? "h-[48px] px-6 text-base" : "h-11 px-6 text-base"
                } ${
                  isCartLayout ? "" : "flex-1 md:flex-none"
                }`}
              >
                {detailsOpen && SecondaryActionExpandedIcon ? (
                  <SecondaryActionExpandedIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <SecondaryActionIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                )}
                <span>{secondaryButtonText}</span>
              </button>
              <button
                type="button"
                onClick={onPrimaryAction}
                className={`cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-black bg-black font-semibold text-white transition hover:bg-neutral-900 ${
                  isCartLayout ? "h-[48px] px-6 text-base" : "h-11 px-6 text-base"
                } ${
                  isCartLayout ? "" : "flex-1 md:flex-none"
                }`}
              >
                <PrimaryActionIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                <span>{primaryButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
