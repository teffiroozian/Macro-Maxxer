"use client";

import type { CartMacros } from "@/stores/cartStore";
import type { LucideIcon } from "lucide-react";
import { Bookmark, Camera } from "lucide-react";
import type { ReactNode } from "react";

type StickyMacroTotalsBarProps = {
  totals: CartMacros;
  visible?: boolean;
  inline?: boolean;
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

const macroRows: Array<{
  key: keyof CartMacros;
  label: string;
  unit?: string;
  valueClassName: string;
}> = [
  { key: "calories", label: "Calories", valueClassName: "text-[#111318]" },
  { key: "protein", label: "Protein", unit: "g", valueClassName: "text-[#C75A1B]" },
  { key: "carbs", label: "Carbs", unit: "g", valueClassName: "text-[#D0A700]" },
  { key: "fat", label: "Fat", unit: "g", valueClassName: "text-[#3B8EDB]" },
];

export default function StickyMacroTotalsBar({
  totals,
  visible = true,
  inline = false,
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
  const wrapperClassName = inline
    ? "w-full"
    : `fixed left-0 right-0 bottom-1 mx-auto z-[120] max-w-6xl px-2 transition-all duration-300 ease-out ${
        visible
          ? "pointer-events-none translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`;

  const panelClassName = inline
    ? "w-full rounded-3xl border border-black/10 bg-white px-4 py-3"
    : `mx-auto w-full rounded-2xl border border-slate-200/70 bg-white px-4 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      } ${detailsOpen && detailsContent ? "flex max-h-[90vh] flex-col" : ""}`;

  const contentContainerClassName = `mx-auto w-full max-w-5xl ${
    detailsOpen && detailsContent ? "flex min-h-0 flex-1 flex-col" : ""
  }`;

  return (
    <div className={wrapperClassName}>
      <div className={panelClassName}>
        <div className={contentContainerClassName}>
          {detailsOpen && detailsContent ? (
            <div className="mb-4 min-h-0 flex-1 overflow-hidden">
              {detailsContent}
            </div>
          ) : null}
          {detailsOpen && detailsContent ? (
            <div className="mb-4 border-t border-black/10" aria-hidden="true" />
          ) : null}
          <div className="shrink-0 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <section className="flex-1">
              {contextLine ? (
                <p className="text-sm font-medium tracking-tight text-neutral-500">
                  {contextLine}
                </p>
              ) : null}
              <div className={`grid grid-cols-2 gap-x-4 gap-y-3 text-center sm:grid-cols-4 sm:gap-x-6 ${contextLine ? "mt-2" : ""}`}>
                {macroRows.map((macro) => (
                  <div key={macro.key}>
                    <p className={`text-2xl font-bold leading-none sm:text-3xl ${macro.valueClassName}`}>
                      {totals[macro.key]}
                      {macro.unit ?? ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#1A1A1A]">
                      {macro.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex w-full flex-row gap-3 sm:w-auto">
              <button
                type="button"
                onClick={onSecondaryAction}
                className="cursor-pointer inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-black/80 bg-transparent px-6 text-base font-semibold text-[#1A1A1A] transition hover:bg-black/5 sm:flex-none"
              >
                {detailsOpen && SecondaryActionExpandedIcon ? (
                  <SecondaryActionExpandedIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <SecondaryActionIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                )}
                <span>{detailsOpen && secondaryActionExpandedLabel ? secondaryActionExpandedLabel : secondaryActionLabel}</span>
              </button>
              <button
                type="button"
                onClick={onPrimaryAction}
                className="cursor-pointer inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black bg-black px-6 text-base font-semibold text-white transition hover:bg-neutral-900 sm:flex-none"
              >
                <PrimaryActionIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                <span>{primaryActionLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
